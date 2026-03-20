import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: ["localhost", "info-m24-012", "liutwin-pc","23hp041"],
    proxy: {
      "/api/v1/auth": "http://localhost:8000",
      "/api/v1":      "http://localhost:8000",
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
});