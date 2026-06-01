import { defineConfig } from "astro/config";

// The app is only ever served under /sites/maze/ on the hub. We set `base`
// to that path and reference the engine scripts with absolute, base-derived
// URLs (import.meta.env.BASE_URL). Absolute URLs are immune to Firebase's
// trailing-slash behaviour (it 301s /sites/maze/ -> /sites/maze, which would
// break a document-relative ./engine path), and ES module-to-module imports
// resolve relative to each module's own URL, so the whole graph loads correctly
// at the mount. CSS is inlined so there are no absolute /_astro references.
export default defineConfig({
  site: "https://luke.sarfas.com",
  base: "/sites/maze",
  build: {
    format: "directory",
    inlineStylesheets: "always",
  },
});
