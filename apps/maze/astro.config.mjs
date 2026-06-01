import { defineConfig } from "astro/config";

// Served standalone in dev/preview at "/", and synced into the hub at
// /sites/maze/ for embedding. Page assets are relative (engine scripts) or
// inlined (CSS) so there are NO absolute /_astro/ references — the page renders
// correctly whether served at the root or under /sites/maze/.
export default defineConfig({
  site: "https://luke.sarfas.com",
  base: "/",
  build: {
    format: "directory",
    inlineStylesheets: "always",
  },
});
