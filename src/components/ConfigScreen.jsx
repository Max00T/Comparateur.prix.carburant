import React, { useState } from "react";

async function geocodePostalCode(postal) {
  const q = encodeURIComponent(postal);
  const url = `https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Erreur geocoding");
  const json = await r.json();
  const feat = json?.features?.[0];
  if (!feat) throw new Error("Aucun résultat pour ce code postal");
  const [lon, lat] = feat.geometry.coordinates;
  return { lat, lon };
}

const FUEL_TYPES = ["Gazole", "SP95-E10", "SP98", "E85", "GPL"];

export default function ConfigScreen({ onSubmit }) {
  const [mode, setMode] = useState("geo");
  const [postal, setPostal] = useState("");
  const [fuel, setFuel] = useState("Gazole");
  const [tank, setTank] = useState(50);
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function handleStart(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "geo") {
        if (!navigator.geolocation)
          throw new Error("Géolocalisation non disponible");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = {
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            };
            onSubmit({
              mode,
              position: coords,
              fuelType: fuel,
              tankCapacity: Number(tank),
              radiusKm: Number(radiusKm),
            });
          },
          () => {
            setLoading(false);
            setErr("Géolocalisation refusée — essaie par code postal");
          },
          { enableHighAccuracy: true },
        );
      } else {
        try {
          const coords = await geocodePostalCode(postal);
          onSubmit({
            mode,
            postalCode: postal,
            position: coords,
            fuelType: fuel,
            tankCapacity: Number(tank),
            radiusKm: Number(radiusKm),
          });
        } catch (e) {
          setErr(e.message || "Erreur geocoding");
        } finally {
          setLoading(false);
        }
      }
    } catch (e) {
      setErr(e.message || "Erreur");
      setLoading(false);
    }
  }

  return (
    <div className="config-wrapper">
      <div className="config-card">
        {/* Header */}
        <div className="config-header">
          <span className="config-icon">⛽</span>
          <h1 className="config-title">Fuel Finder</h1>
          <p className="config-subtitle">
            Trouve le carburant le moins cher près de toi
          </p>
        </div>

        <form onSubmit={handleStart}>
          {/* Mode */}
          <div className="form-group">
            <label className="form-label">📍 Localisation</label>
            <div className="radio-group">
              <label className={`radio-card ${mode === "geo" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "geo"}
                  onChange={() => setMode("geo")}
                />
                <span>📡 Géolocalisation</span>
              </label>
              <label className={`radio-card ${mode === "cp" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "cp"}
                  onChange={() => setMode("cp")}
                />
                <span>🔢 Code postal</span>
              </label>
            </div>
          </div>

          {/* Code postal */}
          {mode === "cp" && (
            <div className="form-group">
              <label className="form-label">Code postal</label>
              <input
                className="form-input"
                placeholder="Ex: 75001"
                value={postal}
                onChange={(e) => setPostal(e.target.value)}
                maxLength={5}
              />
            </div>
          )}

          {/* Carburant */}
          <div className="form-group">
            <label className="form-label">⛽ Type de carburant</label>
            <div className="fuel-grid">
              {FUEL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`fuel-btn ${fuel === t ? "active" : ""}`}
                  onClick={() => setFuel(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Réservoir */}
          <div className="form-group">
            <label className="form-label">
              🛢️ Capacité du réservoir : <strong>{tank} L</strong>
            </label>
            <input
              type="range"
              min="20"
              max="120"
              value={tank}
              onChange={(e) => setTank(e.target.value)}
              className="form-range"
            />
            <div className="range-labels">
              <span>20 L</span>
              <span>120 L</span>
            </div>
          </div>

          {/* Rayon */}
          <div className="form-group">
            <label className="form-label">📏 Rayon de recherche</label>
            <div className="radius-group">
              {[5, 10, 20, 50].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`radius-btn ${radiusKm === r ? "active" : ""}`}
                  onClick={() => setRadiusKm(r)}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Erreur */}
          {err && <div className="form-error">{err}</div>}

          {/* Submit */}
          <button className="btn-start" type="submit" disabled={loading}>
            {loading ? "⏳ Chargement..." : "🚀 Trouver les stations"}
          </button>

          <p className="form-footer">
            Données officielles mises à jour toutes les ~10 min
          </p>
        </form>
      </div>
    </div>
  );
}
