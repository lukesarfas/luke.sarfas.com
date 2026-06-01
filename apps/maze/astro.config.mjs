import { defineConfig } from "astro/config";

// Served standalone in dev/preview at "/", and synced into the hub at
// /sites/maze/ for embedding. Every asset path is relative so both work.
export default defineConfig({
  site: "https://luke.sarfas.com",
  base: "/",
  build: {
    format: "directory",
  },
});
