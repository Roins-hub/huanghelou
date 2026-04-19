import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/assistant/",
  build: {
    outDir: "../assistant",
    emptyOutDir: false,
    assetsInlineLimit: 0
  }
});
