import React from "react";

export default function StationList({
  stations,
  fuelType,
  onSelect,
  selectedId,
}) {
  if (!stations.length)
    return (
      <div className="empty-list">
        <p>😕 Aucune station trouvée dans ce rayon.</p>
        <p className="small">Essaie d'augmenter le rayon de recherche.</p>
      </div>
    );

  return (
    <div className="station-list">
      <h3 className="list-title">
        🏆 {stations.length} station{stations.length > 1 ? "s" : ""} — triées
        par prix
      </h3>

      {stations.map((s, index) => (
        <div
          key={s.id}
          className={`station-card ${index === 0 ? "best" : ""} ${selectedId === s.id ? "selected" : ""}`}
          onClick={() => onSelect(s)}
          style={{ cursor: "pointer" }}
        >
          {index === 0 && s.fuelPrice && (
            <div className="best-badge">🏆 Moins cher</div>
          )}

          <div className="station-top">
            <div className="station-left">
              <span className="station-rank">#{index + 1}</span>
              <div>
                <div className="station-name">{s.name}</div>
                <div className="station-address">{s.address}</div>
                <div className="station-distance">
                  📏 {s.distanceKm.toFixed(2)} km
                </div>
              </div>
            </div>

            <div className="station-right">
              <div className="station-price">
                {s.fuelPrice ? `${s.fuelPrice.toFixed(3)} €/L` : "N/A"}
              </div>
              <div className="station-total">
                🛢️ {s.totalCost ? `${s.totalCost.toFixed(2)} €` : "—"}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
