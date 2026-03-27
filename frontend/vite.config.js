import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      include: /\.[jt]sx?$/
    })
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["unvail.gwon.run"]
  }
});
