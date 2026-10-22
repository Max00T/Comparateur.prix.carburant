import React, { useState, useEffect } from "react";

export default function TankCalculator({
  tankCapacity,
  cheapestPrice,
  selectedStation,
}) {
  const [cap, setCap] = useState(tankCapacity ?? 50);
  const [price, setPrice] = useState("");

  // Met à jour le prix quand on sélectionne une station
  useEffect(() => {
    if (cheapestPrice) setPrice(cheapestPrice.toFixed(3));
  }, [cheapestPrice]);

  const computed = (() => {
    const p = parseFloat(String(price).replace(",", "."));
    if (!Number.isFinite(p)) return null;
    return p * Number(cap || 0);
  })();

  return (
    <div className="calculator">
      <h3 className="calc-title">🧮 Calculateur de plein</h3>

      {/* Station sélectionnée */}
      {selectedStation && (
        <div
          style={{
            background: "rgba(6,182,212,0.08)",
            border: "1px solid rgba(6,182,212,0.2)",
            borderRadius: 10,
            padding: "8px 12px",
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          ⛽ <strong>{selectedStation.name}</strong> — {selectedStation.address}
        </div>
      )}

      <div className="calc-grid">
        <div className="calc-field">
          <label className="calc-label">🛢️ Réservoir (L)</label>
          <input
            className="calc-input"
            type="number"
            min="1"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
          />
        </div>

        <div className="calc-field">
          <label className="calc-label">💶 Prix (€/L)</label>
          <input
            className="calc-input"
            type="number"
            step="0.001"
            placeholder="ex: 1.759"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="calc-result">
        {computed !== null ? (
          <>
            <span className="calc-result-label">Coût du plein</span>
            <span className="calc-result-value">{computed.toFixed(2)} €</span>
          </>
        ) : (
          <span className="calc-result-label">
            Sélectionne une station ou entre un prix
          </span>
        )}
      </div>
    </div>
  );
}
