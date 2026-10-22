import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// ✅ Fix icônes Leaflet avec Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ✅ Icône utilisateur — point bleu + texte intégré directement dans le HTML
const userIcon = L.divIcon({
  className: "",
  html: `
   <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
     <div style="
       background: #06b6d4;
       color: white;
       font-size: 11px;
       font-weight: 700;
       padding: 4px 8px;
       border-radius: 8px;
       white-space: nowrap;
       box-shadow: 0 2px 8px rgba(0,0,0,0.4);
       margin-bottom: 4px;
       font-family: Inter, system-ui, sans-serif;
     ">📍 Vous êtes ici</div>
     <div style="
       width: 16px;
       height: 16px;
       background: #06b6d4;
       border: 3px solid white;
       border-radius: 50%;
       box-shadow: 0 0 0 3px rgba(6,182,212,0.35);
     "></div>
   </div>
 `,
  iconSize: [120, 52],
  iconAnchor: [60, 52],
  popupAnchor: [0, -55],
});

// ✅ Composant pour contrôler la carte
function MapController({ selectedStation, mapRef }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    if (selectedStation) {
      map.setView([selectedStation.lat, selectedStation.lon], 15, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedStation]);

  return null;
}

export default function MapView({
  userPos,
  stations,
  selectedStation,
  mapRef,
}) {
  const center = [userPos.lat, userPos.lon];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
      />

      <MapController selectedStation={selectedStation} mapRef={mapRef} />

      {/* ✅ Marqueur utilisateur avec texte intégré */}
      <Marker position={center} icon={userIcon} zIndexOffset={1000}>
        <Popup>
          <strong>📍 Vous êtes ici</strong>
        </Popup>
      </Marker>

      {/* Cercle de rayon */}
      <Circle
        center={center}
        radius={1000 * 10}
        pathOptions={{
          color: "#06b6d4",
          fillColor: "#06b6d4",
          fillOpacity: 0.04,
          opacity: 0.25,
          weight: 1.5,
        }}
      />

      {/* ✅ Stations */}
      {stations.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lon]} zIndexOffset={0}>
          <Popup>
            <div style={{ minWidth: 170 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>
                ⛽ {s.name}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                {s.address}
              </div>
              <div style={{ fontSize: 16, color: "#06b6d4", fontWeight: 800 }}>
                {s.fuelPrice ? `${s.fuelPrice.toFixed(3)} €/L` : "Prix N/A"}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                🛢️ Plein :{" "}
                <strong>
                  {s.totalCost ? `${s.totalCost.toFixed(2)} €` : "—"}
                </strong>
              </div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                📏 {s.distanceKm.toFixed(2)} km
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
