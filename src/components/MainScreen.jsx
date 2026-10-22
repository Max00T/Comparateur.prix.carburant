import React, { useEffect, useState, useRef } from "react";
import { fetchStationsNormalized } from "../services/fuelApi";
import { haversineDistanceKm } from "../utils/distance";
import MapView from "./MapView";
import StationList from "./StationList";
import TankCalculator from "./TankCalculator";

export default function MainScreen({ config, onBack }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchStationsNormalized(
          config.position,
          config.radiusKm,
        );

        setStations(data);
      } catch (e) {
        setError(e.message || "Erreur récupération stations");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const prepared = stations
    .map((s) => {
      const dist = haversineDistanceKm(
        config.position.lat,
        config.position.lon,
        s.lat,
        s.lon,
      );
      const price = s.prices?.[config.fuelType] ?? null;
      return {
        ...s,
        distanceKm: dist,
        fuelPrice: price,
        totalCost: price ? price * config.tankCapacity : null,
      };
    })
    .filter((s) => s.distanceKm <= config.radiusKm)
    .sort((a, b) => {
      const pa = a.fuelPrice;
      const pb = b.fuelPrice;
      if (pa === null && pb === null) return a.distanceKm - b.distanceKm;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pa - pb;
    });

  function handleSelectStation(station) {
    setSelectedStation(station);
  }

  return (
    <div className="main-wrapper">
      <div className="topbar">
        <button className="btn-back" onClick={onBack}>
          ← Modifier
        </button>
        <div className="topbar-title">⛽ Fuel Finder</div>
        <div className="topbar-info">
          <span className="badge">{config.fuelType}</span>
          <span className="badge">{config.tankCapacity} L</span>
          <span className="badge">{config.radiusKm} km</span>
        </div>
      </div>

      {loading && (
        <div className="loading-screen">
          <div className="spinner" />
          <p>Chargement des stations...</p>
        </div>
      )}

      {error && (
        <div className="error-screen">
          <p>❌ {error}</p>
          <button className="btn-back" onClick={onBack}>
            ← Retour
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="main-grid">
          <div className="map-col">
            <MapView
              userPos={config.position}
              stations={prepared}
              selectedStation={selectedStation}
              mapRef={mapRef}
            />
          </div>

          <div className="list-col">
            <TankCalculator
              tankCapacity={config.tankCapacity}
              cheapestPrice={
                selectedStation?.fuelPrice ?? prepared[0]?.fuelPrice ?? null
              }
              selectedStation={selectedStation}
            />
            <StationList
              stations={prepared}
              fuelType={config.fuelType}
              onSelect={handleSelectStation}
              selectedId={selectedStation?.id}
            />
            <p className="footer-small">
              📡 Données Open Data officiel · mise à jour ~10 min
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
