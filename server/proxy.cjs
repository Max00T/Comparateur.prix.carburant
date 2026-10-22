process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require("express");
const AdmZip = require("adm-zip");
const { XMLParser } = require("fast-xml-parser");
const cors = require("cors");

const PORT = 3000;
const ZIP_URL = "https://donnees.roulez-eco.fr/opendata/instantane";

const app = express();
app.use(cors());

// ✅ Cache stations (10 min)
let cache = { stations: null, lastFetch: 0 };
const CACHE_DURATION = 10 * 60 * 1000;

function parsePrice(valeur) {
  if (valeur == null || valeur === "") return null;
  const s = String(valeur)
    .trim()
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// ✅ Distance entre 2 points GPS (km)
function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ✅ Récupère les stations OSM dans un rayon via Overpass API
async function fetchOSMStations(lat, lon, radiusM) {
  const query = `[out:json][timeout:25];(node["amenity"="fuel"](around:${radiusM},${lat},${lon});way["amenity"="fuel"](around:${radiusM},${lat},${lon}););out center tags;`;

  // Liste de serveurs Overpass en fallback
  const servers = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ];

  for (const server of servers) {
    try {
      const url = `${server}?data=${encodeURIComponent(query)}`;
      console.log("🗺️ Tentative Overpass sur :", server);
      const r = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      console.log("Overpass status :", r.status, "depuis", server);

      if (!r.ok) continue; // essaie le suivant

      const json = await r.json();
      console.log("✅ Overpass éléments reçus :", json.elements?.length ?? 0);

      return (json.elements || [])
        .map((el) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          const tags = el.tags || {};
          const name = tags.name || tags.brand || tags.operator || null;
          return { lat: elLat, lon: elLon, name };
        })
        .filter((el) => el.lat && el.lon && el.name);
    } catch (err) {
      console.warn("⚠️ Serveur Overpass KO :", server, err.message);
    }
  }

  throw new Error("Tous les serveurs Overpass sont indisponibles");
}

// ✅ Charge toutes les stations du flux XML
async function loadAllStations() {
  const now = Date.now();
  if (cache.stations && now - cache.lastFetch < CACHE_DURATION) {
    console.log("✅ Cache valide");
    return cache.stations;
  }

  console.log("🔄 Fetch ZIP...");
  const r = await fetch(ZIP_URL);
  if (!r.ok) throw new Error("Erreur upstream " + r.status);

  const buffer = await r.arrayBuffer();
  const zip = new AdmZip(Buffer.from(buffer));
  const entries = zip.getEntries();
  const xmlEntry = entries.find((e) =>
    e.entryName.toLowerCase().endsWith(".xml"),
  );
  if (!xmlEntry) throw new Error("Aucun XML dans le ZIP");

  const xmlText = xmlEntry.getData().toString("latin1");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const parsed = parser.parse(xmlText);

  const pdvs = parsed?.pdv_liste?.pdv ?? [];
  const arr = Array.isArray(pdvs) ? pdvs : [pdvs];

  const stations = arr
    .map((pdv) => {
      const lat = pdv?.latitude ? parseFloat(pdv.latitude) / 100000 : null;
      const lon = pdv?.longitude ? parseFloat(pdv.longitude) / 100000 : null;
      const id = String(pdv?.id ?? Math.random().toString(36).slice(2, 9));
      const rue = pdv?.adresse ? String(pdv.adresse).trim() : "";
      const ville = pdv?.ville ? String(pdv.ville).trim() : "";
      const cp = pdv?.cp ? String(pdv.cp).trim() : "";
      const address = [rue, ville].filter(Boolean).join(", ");
      const nameFallback = address || `${ville} (${cp})`;

      const prices = {
        Gazole: null,
        "SP95-E10": null,
        SP98: null,
        E85: null,
        GPL: null,
      };
      const prixItems = pdv?.prix
        ? Array.isArray(pdv.prix)
          ? pdv.prix
          : [pdv.prix]
        : [];
      prixItems.forEach((p) => {
        const nom = p?.nom;
        const valeur = p?.valeur;
        if (!nom || valeur == null) return;
        const map = {
          Gazole: "Gazole",
          "SP95-E10": "SP95-E10",
          E10: "SP95-E10",
          SP98: "SP98",
          E85: "E85",
          GPLc: "GPL",
          GPL: "GPL",
        };
        if (map[nom]) prices[map[nom]] = parsePrice(valeur);
      });

      return { id, name: nameFallback, address, lat, lon, cp, prices };
    })
    .filter((s) => s.lat && s.lon && !isNaN(s.lat) && !isNaN(s.lon));

  cache = { stations, lastFetch: now };
  console.log(`✅ ${stations.length} stations chargées`);
  return stations;
}

// ✅ Endpoint principal
app.get("/api/stations", async (req, res) => {
  try {
    const { lat, lon, radius } = req.query;
    let stations = await loadAllStations();

    // Filtre par rayon si lat/lon/radius fournis
    if (lat && lon && radius) {
      const toLat = parseFloat(lat);
      const toLon = parseFloat(lon);
      const toRadius = parseFloat(radius);

      stations = stations.filter(
        (s) => distanceKm(toLat, toLon, s.lat, s.lon) <= toRadius,
      );
      console.log(
        `📍 ${stations.length} stations dans le rayon de ${radius}km`,
      );

      // ✅ Enrichissement OSM — 1 seule requête pour tout le rayon
      try {
        const radiusM = toRadius * 1000;
        console.log("🗺️ Requête Overpass OSM...");
        const osmStations = await fetchOSMStations(toLat, toLon, radiusM);
        console.log(`🗺️ ${osmStations.length} stations OSM trouvées`);

        // Correspondance par proximité GPS (seuil 100m)
        stations = stations.map((s) => {
          const closest = osmStations
            .map((osm) => ({
              ...osm,
              dist: distanceKm(s.lat, s.lon, osm.lat, osm.lon),
            }))
            .sort((a, b) => a.dist - b.dist)[0];

          if (closest && closest.dist < 0.1) {
            // Station OSM trouvée à moins de 100m → utilise son nom
            return { ...s, name: closest.name };
          }
          return s;
        });
      } catch (osmErr) {
        console.warn("⚠️ Overpass API indisponible :", osmErr.message);
        // On continue sans enrichissement OSM
      }
    }

    res.json(stations);
  } catch (err) {
    console.error("Proxy error :", err.message);
    res.status(500).send({ error: "Erreur interne", details: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy running → http://localhost:${PORT}/api/stations`);
});
