/**
 * make-previews.mjs
 *
 * Capture a 1600x900 PNG of each sister site's homepage, save to
 * apps/<slug>/public/preview.png. Requires the sister site to have been
 * built (npm run build:<slug>) and uses `astro preview` to serve dist/
 * on a known port while Chrome headless screenshots it.
 *
 * Usage: npm run make-previews
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const SITES = [
  { slug: "lickme", workspace: "lickme-site", port: 4322 },
  { slug: "thinkwell", workspace: "thinkwell-site", port: 4323 },
  { slug: "maze", workspace: "maze-site", port: 4324 },
];

async function waitForPort(port, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://localhost:${port}/`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for :${port}`);
}

async function screenshot(slug, port) {
  const out = join(ROOT, "apps", slug, "public", "preview.png");
  await new Promise((res, rej) => {
    const c = spawn(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-sandbox",
        `--screenshot=${out}`,
        "--window-size=1600,900",
        "--virtual-time-budget=4000",
        `http://localhost:${port}/`,
      ],
      { stdio: "inherit" },
    );
    c.on("exit", (code) => (code === 0 ? res() : rej(new Error(`chrome exit ${code}`))));
  });
  return out;
}

for (const { slug, workspace, port } of SITES) {
  const distDir = join(ROOT, "apps", slug, "dist");
  if (!existsSync(distDir)) {
    console.warn(`[preview] ${slug}: no dist/, run build:${slug} first — skipping`);
    continue;
  }
  console.log(`[preview] ${slug}: starting preview server on :${port}…`);
  const proc = spawn("npm", ["--workspace", workspace, "run", "preview"], {
    cwd: ROOT,
    stdio: ["ignore", "inherit", "inherit"],
    detached: true,
  });
  try {
    await waitForPort(port);
    await new Promise((r) => setTimeout(r, 600));
    const out = await screenshot(slug, port);
    console.log(`[preview] ${slug}: saved ${out}`);
  } finally {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {}
  }
}
console.log("[preview] done");
