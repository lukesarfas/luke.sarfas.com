// solver.js — high-performance A* maze visualiser for the showcase.
//
// Scales to large, custom maze sizes (up to ~501x501 ≈ 250k cells) where the
// faithful linear-scan port would hang. Strategy:
//   * typed-array maze + binary-heap A* (precomputed up front), recording the
//     order cells are expanded/discovered and the final path;
//   * playback is pure animation of that log, so pause/step are instant and a
//     result is guaranteed before the first frame;
//   * rendering goes through an offscreen 1px-per-cell ImageData scaled crisply
//     onto the display canvas, so a frame costs ~O(changed cells), not O(grid).
//
// The faithful Python/JS reference port lives in the OSS repo; this is the
// optimised variant that powers the live, resizable visualiser. It produces the
// same optimal shortest path (unique in a perfect maze).

export const PHASE = {
  EXPLORING: "exploring",
  REVEALING: "revealing",
  SOLVED: "solved",
  NO_PATH: "no-path",
  ERROR: "error",
};

const MIN_SIZE = 11;
const MAX_SIZE = 501;

function oddify(n) {
  const v = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.floor(n)));
  return v % 2 === 0 ? v + 1 : v;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Parse "#rgb" / "#rrggbb" / "rgb(...)" / "rgba(...)" into [r,g,b] (0-255),
// compositing any alpha over the given background.
function parseColour(str, bg) {
  str = (str || "").trim();
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 1;
  if (str[0] === "#") {
    let h = str.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if (str.startsWith("rgb")) {
    const m = str.match(/[\d.]+/g) || [];
    r = +m[0] || 0;
    g = +m[1] || 0;
    b = +m[2] || 0;
    a = m[3] !== undefined ? +m[3] : 1;
  }
  if (a < 1 && bg) {
    r = Math.round(r * a + bg[0] * (1 - a));
    g = Math.round(g * a + bg[1] * (1 - a));
    b = Math.round(b * a + bg[2] * (1 - a));
  }
  return [r, g, b];
}

function readColours(el) {
  const cs = getComputedStyle(el);
  const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  const css = {
    background: get("--maze-bg", "#15171d"),
    wall: get("--maze-wall", "#646b85"),
    explored: get("--maze-explored", "#356a90"),
    frontier: get("--maze-frontier", "#f0c878"),
    path: get("--maze-path", "#f4e84a"),
    start: get("--maze-start", "#15c487"),
    goal: get("--maze-goal", "#e7672e"),
    current: get("--maze-current", "#ffffff"),
  };
  const bg = parseColour(css.background);
  return {
    css,
    bg,
    wall: parseColour(css.wall, bg),
    explored: parseColour(css.explored, bg),
    frontier: parseColour(css.frontier, bg),
    path: parseColour(css.path, bg),
  };
}

export function createSolver({ canvas, size = 41, speed = 6, onState }) {
  if (!canvas || typeof canvas.getContext !== "function") {
    throw new Error("createSolver: a <canvas> element is required");
  }
  const ctx = canvas.getContext("2d");
  const report = typeof onState === "function" ? onState : () => {};

  let colours = readColours(canvas);
  let N = oddify(size);
  let speedSteps = clampSpeed(speed);

  // Precomputed run (typed arrays sized N*N).
  let grid = null; // Uint8Array, 1 = wall, 0 = open
  let sx = 1;
  let sy = 1;
  let ex = 0;
  let ey = 0;
  let order = null; // Int32Array — cells in expansion (closed) order
  let openOrder = null; // Int32Array — cells in discovery order
  let openStep = null; // Int32Array — expansion index at which a cell was discovered
  let closedAt = null; // Int32Array — expansion index at which a cell was closed (-1 if never)
  let path = null; // Int32Array — shortest path, start..goal
  let found = false;

  // Offscreen 1px-per-cell buffer.
  let off = null;
  let offCtx = null;
  let img = null;
  let data = null;

  // Playback state.
  let phase = PHASE.EXPLORING;
  let closedShown = 0; // expansions revealed
  let openPtr = 0; // index into openOrder revealed
  let revealIdx = 0; // path cells revealed
  let rafId = null;
  let running = false;
  let errored = false;

  function clampSpeed(n) {
    return Math.min(30, Math.max(1, Math.floor(n)));
  }
  function heur(idx) {
    const x = idx % N;
    const y = (idx / N) | 0;
    return Math.abs(x - ex) + Math.abs(y - ey);
  }

  // ---- maze generation (recursive backtracking, typed) ------------------
  function generate() {
    grid = new Uint8Array(N * N).fill(1);
    sx = 1;
    sy = 1;
    ex = N - 2;
    ey = N - 2;
    const idx = (x, y) => y * N + x;
    grid[idx(sx, sy)] = 0;
    const stack = [sx, sy]; // flat (x,y) pairs
    const dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];
    while (stack.length) {
      const y = stack[stack.length - 1];
      const x = stack[stack.length - 2];
      const cands = [];
      for (const [dx, dy] of dirs) {
        const nx = x + dx * 2;
        const ny = y + dy * 2;
        if (nx >= 0 && nx < N && ny >= 0 && ny < N && grid[idx(nx, ny)] === 1) {
          cands.push([nx, ny, dx, dy]);
        }
      }
      if (cands.length) {
        const [nx, ny, dx, dy] = cands[(Math.random() * cands.length) | 0];
        grid[idx(x + dx, y + dy)] = 0;
        grid[idx(nx, ny)] = 0;
        stack.push(nx, ny);
      } else {
        stack.length -= 2;
      }
    }
  }

  // ---- A* (binary heap, lazy deletion) ----------------------------------
  function solve() {
    const n = N * N;
    const g = new Int32Array(n).fill(0x7fffffff);
    const state = new Uint8Array(n); // 0 unseen, 1 open, 2 closed
    const parent = new Int32Array(n).fill(-1);
    openStep = new Int32Array(n).fill(-1);
    closedAt = new Int32Array(n).fill(-1);
    const orderArr = new Int32Array(n);
    const openArr = new Int32Array(n);
    let orderLen = 0;
    let openLen = 0;

    const heap = []; // cell indices; ordered lazily by f then h
    const f = (c) => g[c] + heur(c);
    const less = (a, b) => {
      const fa = f(a);
      const fb = f(b);
      return fa !== fb ? fa < fb : heur(a) < heur(b);
    };
    const push = (c) => {
      heap.push(c);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (less(heap[i], heap[p])) {
          [heap[i], heap[p]] = [heap[p], heap[i]];
          i = p;
        } else break;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        const len = heap.length;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let m = i;
          if (l < len && less(heap[l], heap[m])) m = l;
          if (r < len && less(heap[r], heap[m])) m = r;
          if (m === i) break;
          [heap[i], heap[m]] = [heap[m], heap[i]];
          i = m;
        }
      }
      return top;
    };

    const startIdx = sy * N + sx;
    const endIdx = ey * N + ex;
    g[startIdx] = 0;
    state[startIdx] = 1;
    openStep[startIdx] = 0;
    openArr[openLen++] = startIdx;
    push(startIdx);

    while (heap.length) {
      const cur = pop();
      if (state[cur] === 2) continue; // stale heap entry
      state[cur] = 2;
      closedAt[cur] = orderLen;
      orderArr[orderLen++] = cur;
      if (cur === endIdx) {
        found = true;
        break;
      }
      const cx = cur % N;
      const cy = (cur / N) | 0;
      const step = closedAt[cur];
      // neighbours: down, up, right, left
      for (let d = 0; d < 4; d++) {
        const nx = cx + (d === 2 ? 1 : d === 3 ? -1 : 0);
        const ny = cy + (d === 0 ? 1 : d === 1 ? -1 : 0);
        if (nx < 0 || nx >= N || ny < 0 || ny >= N) continue;
        const nb = ny * N + nx;
        if (grid[nb] === 1 || state[nb] === 2) continue;
        const tentative = g[cur] + 1;
        if (tentative < g[nb]) {
          g[nb] = tentative;
          parent[nb] = cur;
          if (state[nb] === 0) {
            state[nb] = 1;
            openStep[nb] = step;
            openArr[openLen++] = nb;
          }
          push(nb);
        }
      }
    }

    order = orderArr.subarray(0, orderLen);
    openOrder = openArr.subarray(0, openLen);

    if (found) {
      const rev = [];
      let c = endIdx;
      while (c !== -1) {
        rev.push(c);
        c = parent[c];
      }
      rev.reverse();
      path = Int32Array.from(rev);
    } else {
      path = new Int32Array(0);
    }
  }

  // ---- offscreen buffer + painting --------------------------------------
  function setupOffscreen() {
    off = document.createElement("canvas");
    off.width = N;
    off.height = N;
    offCtx = off.getContext("2d");
    img = offCtx.createImageData(N, N);
    data = img.data;
    paintBase();
  }
  function paintBase() {
    const [br, bg_, bb] = colours.bg;
    const [wr, wg, wb] = colours.wall;
    for (let i = 0; i < N * N; i++) {
      const o = i * 4;
      const wall = grid[i] === 1;
      data[o] = wall ? wr : br;
      data[o + 1] = wall ? wg : bg_;
      data[o + 2] = wall ? wb : bb;
      data[o + 3] = 255;
    }
  }
  function paintCell(idx, rgb) {
    const o = idx * 4;
    data[o] = rgb[0];
    data[o + 1] = rgb[1];
    data[o + 2] = rgb[2];
    data[o + 3] = 255;
  }

  // ---- drawing ----------------------------------------------------------
  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const px = Math.max(1, Math.floor(canvas.clientWidth));
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function marker(x, y, cssColour, halo, cellPx) {
    const cx = (x + 0.5) * cellPx;
    const cy = (y + 0.5) * cellPx;
    const r = Math.max(cellPx * 0.62, 5);
    if (halo) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
      ctx.strokeStyle = cssColour;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(cellPx * 0.22, 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = cssColour;
    ctx.fill();
    ctx.lineWidth = Math.max(cellPx * 0.16, 1.5);
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.stroke();
  }
  function draw() {
    const px = canvas.clientWidth;
    offCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = colours.css.background;
    ctx.fillRect(0, 0, px, px);
    ctx.drawImage(off, 0, 0, N, N, 0, 0, px, px);

    const cellPx = px / N;
    // current expansion head, while exploring
    if (phase === PHASE.EXPLORING && closedShown > 0) {
      const c = order[closedShown - 1];
      const x = c % N;
      const y = (c / N) | 0;
      ctx.fillStyle = colours.css.current;
      ctx.globalAlpha = 0.9;
      const s = Math.max(cellPx, 3);
      ctx.fillRect(x * cellPx + (cellPx - s) / 2, y * cellPx + (cellPx - s) / 2, s, s);
      ctx.globalAlpha = 1;
    }
    marker(sx, sy, colours.css.start, false, cellPx);
    marker(ex, ey, colours.css.goal, true, cellPx);
  }
  function drawError(message) {
    try {
      const px = canvas.clientWidth || 320;
      ctx.fillStyle = colours.css.background;
      ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = colours.css.goal;
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Visualiser failed to load", px / 2, px / 2 - 8);
      ctx.fillStyle = colours.css.current;
      ctx.fillText(message || "Try reloading the page.", px / 2, px / 2 + 14);
    } catch {
      /* never throw from the error path */
    }
  }

  // ---- playback ---------------------------------------------------------
  function advanceTo(s) {
    s = Math.min(order.length, Math.max(0, s));
    while (closedShown < s) {
      paintCell(order[closedShown], colours.explored);
      closedShown++;
    }
    while (openPtr < openOrder.length && openStep[openOrder[openPtr]] < s) {
      const c = openOrder[openPtr];
      if (closedAt[c] === -1 || closedAt[c] >= s) paintCell(c, colours.frontier);
      openPtr++;
    }
    if (closedShown >= order.length) phase = found ? PHASE.REVEALING : PHASE.NO_PATH;
  }
  function advanceReveal(steps) {
    const next = Math.min(path.length, revealIdx + steps);
    for (let i = revealIdx; i < next; i++) paintCell(path[i], colours.path);
    revealIdx = next;
    if (revealIdx >= path.length) phase = PHASE.SOLVED;
  }

  function exploreStepsPerFrame() {
    return Math.max(1, Math.round((order.length / 500) * speedSteps));
  }
  function revealStepsPerFrame() {
    return Math.max(2, Math.ceil(path.length / 150));
  }

  function tick() {
    if (phase === PHASE.EXPLORING) advanceTo(closedShown + exploreStepsPerFrame());
    else if (phase === PHASE.REVEALING) advanceReveal(revealStepsPerFrame());
  }

  function snapshot() {
    return {
      phase,
      running,
      found,
      explored: closedShown,
      frontier: Math.max(0, openPtr - closedShown),
      pathLength: path ? path.length : 0,
      total: order ? order.length : 0,
      progress: order && order.length ? closedShown / order.length : 0,
    };
  }
  function emit() {
    report(snapshot());
  }

  function loop() {
    if (!running) return;
    tick();
    safeDraw();
    emit();
    if (phase === PHASE.SOLVED || phase === PHASE.NO_PATH || phase === PHASE.ERROR || errored) {
      running = false;
      rafId = null;
      emit();
      return;
    }
    rafId = requestAnimationFrame(loop);
  }
  function safeDraw() {
    try {
      draw();
    } catch (err) {
      errored = true;
      phase = PHASE.ERROR;
      drawError(err && err.message);
    }
  }

  function finishInstantly() {
    advanceTo(order.length);
    advanceReveal(path.length);
    phase = found ? PHASE.SOLVED : PHASE.NO_PATH;
    running = false;
    safeDraw();
    emit();
  }

  // ---- public controls --------------------------------------------------
  function play() {
    if (errored || running) return;
    if (phase === PHASE.SOLVED || phase === PHASE.NO_PATH) return;
    running = true;
    emit();
    rafId = requestAnimationFrame(loop);
  }
  function pause() {
    if (!running) return;
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    emit();
  }
  function toggle() {
    running ? pause() : play();
  }
  function step() {
    if (errored) return;
    pause();
    if (phase === PHASE.EXPLORING) advanceTo(closedShown + 1);
    else if (phase === PHASE.REVEALING) advanceReveal(1);
    safeDraw();
    emit();
  }
  function resetPlayback(autoplay) {
    pause();
    closedShown = 0;
    openPtr = 0;
    revealIdx = 0;
    phase = PHASE.EXPLORING;
    errored = false;
    paintBase();
    if (prefersReducedMotion()) {
      finishInstantly();
      return;
    }
    safeDraw();
    emit();
    if (autoplay) play();
  }
  function regenerate(opts) {
    const autoplay = !opts || opts.autoplay !== false;
    try {
      generate();
      solve();
      setupOffscreen();
      layout();
    } catch (err) {
      errored = true;
      phase = PHASE.ERROR;
      layout();
      drawError(err && err.message);
      emit();
      return;
    }
    resetPlayback(autoplay);
  }
  function setSpeed(n) {
    speedSteps = clampSpeed(n);
  }
  function setSize(n) {
    N = oddify(n);
    regenerate();
  }
  function refreshTheme() {
    colours = readColours(canvas);
    // repaint base + already-revealed cells with the new palette
    paintBase();
    const shown = closedShown;
    const op = openPtr;
    const rev = revealIdx;
    closedShown = 0;
    openPtr = 0;
    revealIdx = 0;
    advanceTo(shown);
    advanceReveal(rev);
    openPtr = op;
    safeDraw();
  }

  const onResize = () => {
    colours = readColours(canvas);
    layout();
    safeDraw();
  };
  window.addEventListener("resize", onResize);
  const schemeMq =
    typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const onScheme = () => refreshTheme();
  schemeMq?.addEventListener?.("change", onScheme);

  function destroy() {
    pause();
    window.removeEventListener("resize", onResize);
    schemeMq?.removeEventListener?.("change", onScheme);
  }

  // ---- bootstrap --------------------------------------------------------
  try {
    generate();
    solve();
    setupOffscreen();
    layout();
    if (prefersReducedMotion()) {
      finishInstantly();
    } else {
      safeDraw();
      emit();
    }
  } catch (err) {
    errored = true;
    phase = PHASE.ERROR;
    layout();
    drawError(err && err.message);
    emit();
  }

  return {
    play,
    pause,
    toggle,
    step,
    reset: () => resetPlayback(false),
    regenerate,
    setSpeed,
    setSize,
    refreshTheme,
    destroy,
    isRunning: () => running,
    isSolved: () => phase === PHASE.SOLVED,
    getPhase: () => phase,
  };
}
