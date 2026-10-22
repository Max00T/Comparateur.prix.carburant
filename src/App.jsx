import React, { useState } from "react";
import ConfigScreen from "./components/ConfigScreen";
import MainScreen from "./components/MainScreen";

export default function App() {
  const [config, setConfig] = useState(null);

  return (
    <div className="app-root">
      {!config ? (
        <ConfigScreen onSubmit={(cfg) => setConfig(cfg)} />
      ) : (
        <MainScreen config={config} onBack={() => setConfig(null)} />
      )}
    </div>
  );
}
