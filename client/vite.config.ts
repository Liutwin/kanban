import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api/v1/auth": "http://localhost:8080",
      "/api/v1":      "http://localhost:8080",
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
      },
    },
  },
});
