import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  base: "/aws-ip-ranges/",
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        globe: resolve(__dirname, "globe.html"),
      },
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          d3: [
            "d3-array",
            "d3-axis",
            "d3-brush",
            "d3-drag",
            "d3-geo",
            "d3-interpolate",
            "d3-scale",
            "d3-selection",
            "d3-shape",
            "d3-time",
            "d3-time-format",
            "d3-zoom",
            "topojson-client",
          ],
          recharts: ["recharts"],
          table: ["@tanstack/react-table"],
        },
      },
    },
  },
});
