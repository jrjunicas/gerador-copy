import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/gerador-copy/", // 👈 ESSENCIAL para sites em subpasta!
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".css"]
  },
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
