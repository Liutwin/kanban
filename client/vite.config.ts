import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/auth": "http://localhost:8080",
      "/api":  "http://localhost:8081",
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
      },
    },
  },
});
