/**
 * sync-sites.mjs
 *
 * Run AFTER sister apps build and BEFORE the hub builds. Merges each sister
 * app's dist/ into apps/luke.sarfas.com/public/sites/<slug>/ so the hub can
 * iframe them, and copies each app's preview.png into public/previews/.
 *
 * Each sister app contributes:
 *   apps/<slug>/dist/             -> hub /sites/<slug>/    (applet target)
 *   apps/<slug>/public/preview.png -> hub /previews/<slug>.png
 *   apps/<slug>/public/manifest.json -> hub /manifests/<slug>.json (the contract)
 */
import { cp, mkdir, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const HUB_PUBLIC = join(ROOT, "apps/luke.sarfas.com/public");

const HUB_SLUG = "luke.sarfas.com";

async function listSisterSlugs() {
  const apps = await readdir(join(ROOT, "apps"));
  return apps.filter((a) => a !== HUB_SLUG);
}

async function sync() {
  const sitesOut = join(HUB_PUBLIC, "sites");
  const previewsOut = join(HUB_PUBLIC, "previews");
  const manifestsOut = join(HUB_PUBLIC, "manifests");
  await rm(sitesOut, { recursive: true, force: true });
  await rm(previewsOut, { recursive: true, force: true });
  await rm(manifestsOut, { recursive: true, force: true });
  await mkdir(sitesOut, { recursive: true });
  await mkdir(previewsOut, { recursive: true });
  await mkdir(manifestsOut, { recursive: true });

  const slugs = await listSisterSlugs();
  for (const slug of slugs) {
    const appRoot = join(ROOT, "apps", slug);
    const distDir = join(appRoot, "dist");
    const previewSrc = join(appRoot, "public", "preview.png");
    const manifestSrc = join(appRoot, "public", "manifest.json");

    if (existsSync(distDir)) {
      await cp(distDir, join(sitesOut, slug), { recursive: true });
      console.log(`[sync] ${slug}: dist -> /sites/${slug}/`);
    } else {
      console.warn(`[sync] ${slug}: no dist/, skipping site copy`);
    }
    if (existsSync(previewSrc)) {
      await cp(previewSrc, join(previewsOut, `${slug}.png`));
      console.log(`[sync] ${slug}: preview.png -> /previews/${slug}.png`);
    }
    if (existsSync(manifestSrc)) {
      await cp(manifestSrc, join(manifestsOut, `${slug}.json`));
      console.log(`[sync] ${slug}: manifest.json -> /manifests/${slug}.json`);
    }
  }
  console.log("[sync] done");
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
