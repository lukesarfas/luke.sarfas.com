import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://thinkwelljournal.com",
  base: "/",
  integrations: [mdx()],
  build: {
    format: "directory",
  },
});
