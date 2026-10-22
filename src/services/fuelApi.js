const BASE_URL = "http://localhost:3000/api/stations";

export async function fetchStationsNormalized(position, radiusKm) {
  const params = new URLSearchParams({
    lat: position.lat,
    lon: position.lon,
    radius: radiusKm,
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error("Erreur réseau : " + res.status);
  return res.json();
}
