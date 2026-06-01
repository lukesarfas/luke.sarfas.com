// Launch smoke for the embeddable applet variant (docs/SPEC.md §4 F9, §10).
import { test, expect } from "./fixtures.js";

async function canvasIsNonBlank(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById("maze");
    if (!canvas) return { ok: false, reason: "no canvas" };
    if (!canvas.width || !canvas.height) {
      return { ok: false, reason: `zero backing store ${canvas.width}x${canvas.height}` };
    }
    const ctx = canvas.getContext("2d");
    let img;
    try {
      img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      return { ok: false, reason: `getImageData failed: ${e.message}` };
    }
    const data = img.data;
    const r0 = data[0];
    const g0 = data[1];
    const b0 = data[2];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== r0 || data[i + 1] !== g0 || data[i + 2] !== b0) {
        return { ok: true };
      }
    }
    return { ok: false, reason: "all pixels match background" };
  });
}

test("applet launches clean and renders", async ({ page, pageErrors }) => {
  const response = await page.goto("/sites/maze/applet/");
  expect(response, "navigation produced a response").toBeTruthy();
  expect(response.status(), "HTTP status should be < 400").toBeLessThan(400);

  await expect(page.locator("canvas#maze")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await expect
    .poll(async () => (await canvasIsNonBlank(page)).ok, {
      message: "applet canvas should not be blank",
      timeout: 10000,
    })
    .toBe(true);

  expect(pageErrors, `unexpected console errors / exceptions: ${pageErrors.join(" | ")}`).toEqual([]);
});
