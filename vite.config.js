import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 개발 중에도 폰에서 접속 가능
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:3300",
      "/photos": "http://localhost:3300",
    },
  },
  preview: {
    port: 5180,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.jsx"],
  },
});
