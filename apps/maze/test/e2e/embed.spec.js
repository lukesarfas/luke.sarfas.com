// Regression guard: the applet must work when embedded in the hub's sandboxed
// iframe. A sandbox without `allow-same-origin` gives the frame a null origin,
// which makes its ES-module scripts a cross-origin (CORS) fetch that Firebase
// blocks — leaving a blank canvas. This reproduces the hub's embedding so that
// configuration can't regress unnoticed.
import { test, expect } from "./fixtures.js";

async function canvasIsNonBlank(frame) {
  return frame.locator("#maze").evaluate((c) => {
    if (!c.width || !c.height) return false;
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const r = d[0];
    const g = d[1];
    const b = d[2];
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] !== r || d[i + 1] !== g || d[i + 2] !== b) return true;
    }
    return false;
  });
}

test("applet runs inside the hub's sandboxed iframe", async ({ page }) => {
  // Land on the app origin first so the wrapper document is same-origin with the
  // applet, mirroring the hub embedding it from luke.sarfas.com.
  await page.goto("/sites/maze/applet/");
  await page.setContent(
    `<!doctype html><html><body style="margin:0">
       <iframe id="f" src="/sites/maze/applet/" referrerpolicy="no-referrer"
         sandbox="allow-scripts allow-same-origin"
         style="width:900px;height:560px;border:0"></iframe>
     </body></html>`,
  );

  const frame = page.frameLocator("#f");
  await frame.locator("#maze").waitFor({ timeout: 15000 });

  await expect
    .poll(() => canvasIsNonBlank(frame), {
      message: "embedded applet canvas must render (engine module must load in the sandbox)",
      timeout: 10000,
    })
    .toBe(true);

  await expect
    .poll(async () => Number((await frame.locator("#s-explored").textContent()) ?? "0"), {
      message: "the search must actually advance inside the iframe",
      timeout: 10000,
    })
    .toBeGreaterThan(0);
});
