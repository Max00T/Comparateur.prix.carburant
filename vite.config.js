import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api-carburants": {
        target: "https://donnees.roulez-eco.fr",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api-carburants/, "/opendata/instantane"),
      },
    },
  },
});
