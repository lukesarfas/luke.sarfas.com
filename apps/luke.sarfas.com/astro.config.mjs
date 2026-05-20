import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function gitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);
  try {
    return execSync("git rev-parse --short=12 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
  } catch {
    return "dev";
  }
}

const BUILD_VERSION = gitSha();
const BUILD_TIME = new Date().toISOString();

function versionStamp() {
  return {
    name: "version-stamp",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const out = resolve(fileURLToPath(dir), "version.json");
        writeFileSync(
          out,
          JSON.stringify({ version: BUILD_VERSION, builtAt: BUILD_TIME }, null, 2),
        );
        console.log(`[version-stamp] wrote ${BUILD_VERSION} (${BUILD_TIME})`);
      },
    },
  };
}

export default defineConfig({
  site: "https://luke.sarfas.com",
  build: {
    format: "directory",
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  vite: {
    define: {
      "import.meta.env.BUILD_VERSION": JSON.stringify(BUILD_VERSION),
      "import.meta.env.BUILD_TIME": JSON.stringify(BUILD_TIME),
    },
  },
  integrations: [sitemap(), versionStamp()],
});
