import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {      // AI endpoints → FastAPI (port 8000)
      "/api/gesture": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/api/temperature": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/api/face": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      // General backend endpoints → FastAPI (port 8000)      "/api": {
        target: "http://127.0.0.1:000",
        changeOrigin: true,
      },
    },
  },
});
