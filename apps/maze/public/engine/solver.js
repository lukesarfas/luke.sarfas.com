// solver.js — product renderer for the A* maze showcase.
//
// Strategy (see docs/SPEC.md §5.2): run the search to completion up front and
// record an ordered event log, then animate pure playback of that log. This
// makes pause/step instant, keeps every frame cheap, and guarantees a result
// exists before the first frame is drawn — so the canvas can never get stuck or
// crash mid-animation.
//
// The algorithm core (maze.js / astar.js) is vendored verbatim from
// https://github.com/lukesarfas/A-Star-Maze-Algorithm-Solver and is never
// modified here; this file only drives and draws it.

import { Maze, WALL, START, END } from "./maze.js";
import { AStarSearch } from "./astar.js";

const PHASE = {
  EXPLORING: "exploring",
  REVEALING: "revealing",
  SOLVED: "solved",
  NO_PATH: "no-path",
  ERROR: "error",
};

function key(x, y) {
  return x + "," + y;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function readColours(el) {
  const cs = getComputedStyle(el);
  const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  // Colour-blind-safe palette with a luminance gap so adjacent states clear
  // WCAG 1.4.11 (≥3:1). Fallbacks match the CSS custom properties in
  // global.css / the applet's inline styles. See docs/UX.md.
  return {
    background: get("--maze-bg", "#15171d"),
    wall: get("--maze-wall", "#646b85"), // light slate
    explored: get("--maze-explored", "#356a90"), // dark blue
    frontier: get("--maze-frontier", "#f0c878"), // light amber
    path: get("--maze-path", "#f4e84a"), // bright yellow
    start: get("--maze-start", "#15c487"), // bluish-green
    goal: get("--maze-goal", "#e7672e"), // vermillion
    current: get("--maze-current", "#ffffff"),
  };
}

export function createSolver({ canvas, size = 41, speed = 6, onState }) {
  if (!canvas || typeof canvas.getContext !== "function") {
    throw new Error("createSolver: a <canvas> element is required");
  }
  const ctx = canvas.getContext("2d");
  const report = typeof onState === "function" ? onState : () => {};

  let colours = readColours(canvas);
  let cols = oddify(size);
  let speedSteps = clampSpeed(speed);

  // Precomputed run state.
  let maze = null;
  let frames = []; // one per expanded node: { current:[x,y], frontier:[[x,y]...] }
  let path = []; // final shortest path ([] if none)
  let found = false;

  // Playback state.
  let phase = PHASE.EXPLORING;
  let exploreIndex = 0; // how many frames have been played
  let revealIndex = 0; // how many path cells have been revealed
  const exploredSet = new Set(); // accumulates as exploreIndex advances
  let rafId = null;
  let running = false;
  let errored = false;

  function oddify(n) {
    const v = Math.max(5, Math.floor(n));
    return v % 2 === 0 ? v + 1 : v;
  }
  function clampSpeed(n) {
    return Math.min(60, Math.max(1, Math.floor(n)));
  }

  // ---- precompute -------------------------------------------------------
  function precompute() {
    maze = new Maze(cols, cols);
    maze.generate();
    const search = new AStarSearch(maze);
    frames = [];
    let guard = 0;
    const limit = cols * cols * 8; // generous upper bound; prevents any infinite loop
    while (!search.found && search.openList.length > 0 && guard++ < limit) {
      search.tickSearch();
      frames.push({
        current: [search.currentX, search.currentY],
        frontier: search.openList.map((n) => [n.position[0], n.position[1]]),
      });
    }
    found = search.found;
    path = found ? maze.path.slice() : [];
  }

  // ---- layout & drawing -------------------------------------------------
  let cell = 1;
  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const px = Math.max(1, Math.floor(canvas.clientWidth));
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = px / cols;
  }

  function fill(x, y, colour) {
    ctx.fillStyle = colour;
    ctx.fillRect(x * cell, y * cell, Math.ceil(cell) - 0.5, Math.ceil(cell) - 0.5);
  }

  function draw() {
    const px = canvas.clientWidth;
    ctx.fillStyle = colours.background;
    ctx.fillRect(0, 0, px, px);

    const frontier =
      phase === PHASE.EXPLORING && frames[exploreIndex - 1]
        ? new Set(frames[exploreIndex - 1].frontier.map((p) => key(p[0], p[1])))
        : new Set();
    const revealed = new Set(path.slice(0, revealIndex).map((p) => key(p[0], p[1])));

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < cols; y++) {
        const k = key(x, y);
        if (exploredSet.has(k)) fill(x, y, colours.explored);
        if (frontier.has(k)) fill(x, y, colours.frontier);
        if (maze.grid[x][y] === WALL) fill(x, y, colours.wall);
        if (revealed.has(k)) fill(x, y, colours.path);
        if (maze.grid[x][y] === START) fill(x, y, colours.start);
        if (maze.grid[x][y] === END) fill(x, y, colours.goal);
      }
    }

    // current expansion marker, only while exploring
    if (phase === PHASE.EXPLORING && frames[exploreIndex - 1]) {
      const [cx, cy] = frames[exploreIndex - 1].current;
      ctx.fillStyle = colours.current;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(cx * cell, cy * cell, Math.ceil(cell), Math.ceil(cell));
      ctx.globalAlpha = 1;
    }
  }

  function drawError(message) {
    try {
      const px = canvas.clientWidth || 320;
      ctx.fillStyle = colours.background;
      ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = "#d55e00";
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Visualiser failed to load", px / 2, px / 2 - 8);
      ctx.fillStyle = colours.current;
      ctx.fillText(message || "Try reloading the page.", px / 2, px / 2 + 14);
    } catch {
      /* last-resort: do nothing rather than throw */
    }
  }

  // ---- state reporting --------------------------------------------------
  function snapshot() {
    return {
      phase,
      running,
      found,
      explored: exploredSet.size,
      frontier:
        phase === PHASE.EXPLORING && frames[exploreIndex - 1]
          ? frames[exploreIndex - 1].frontier.length
          : 0,
      pathLength: path.length,
      total: frames.length,
      progress: frames.length ? exploreIndex / frames.length : 0,
    };
  }
  function emit() {
    report(snapshot());
  }

  // ---- playback ---------------------------------------------------------
  function advanceExplore(steps) {
    for (let i = 0; i < steps && exploreIndex < frames.length; i++) {
      exploredSet.add(key(frames[exploreIndex].current[0], frames[exploreIndex].current[1]));
      exploreIndex++;
    }
    if (exploreIndex >= frames.length) {
      phase = found ? PHASE.REVEALING : PHASE.NO_PATH;
    }
  }

  function advanceReveal(steps) {
    revealIndex = Math.min(path.length, revealIndex + steps);
    if (revealIndex >= path.length) phase = PHASE.SOLVED;
  }

  function tick() {
    if (phase === PHASE.EXPLORING) advanceExplore(speedSteps);
    else if (phase === PHASE.REVEALING) advanceReveal(Math.max(1, Math.round(speedSteps / 2)));
  }

  function loop() {
    if (!running) return;
    tick();
    safeDraw();
    emit();
    // Stop on any terminal state, including ERROR — otherwise a persistent
    // draw failure would respin the frame loop indefinitely.
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

  // ---- finishing instantly (reduced motion / "skip") --------------------
  function finishInstantly() {
    for (const f of frames) exploredSet.add(key(f.current[0], f.current[1]));
    exploreIndex = frames.length;
    revealIndex = path.length;
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
    if (phase === PHASE.EXPLORING) advanceExplore(1);
    else if (phase === PHASE.REVEALING) advanceReveal(1);
    safeDraw();
    emit();
  }

  function reset(autoplay) {
    pause();
    exploreIndex = 0;
    revealIndex = 0;
    exploredSet.clear();
    phase = PHASE.EXPLORING;
    errored = false;
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
      precompute();
    } catch (err) {
      errored = true;
      phase = PHASE.ERROR;
      layout();
      drawError(err && err.message);
      emit();
      return;
    }
    reset(autoplay);
  }

  function setSpeed(n) {
    speedSteps = clampSpeed(n);
  }
  function setSize(n) {
    cols = oddify(n);
    regenerate();
  }
  function refreshTheme() {
    colours = readColours(canvas);
    safeDraw();
  }

  const onResize = () => {
    colours = readColours(canvas); // pick up any theme change too
    layout();
    safeDraw();
  };
  window.addEventListener("resize", onResize);

  // Re-read the palette when the OS colour scheme flips (no resize needed).
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
    precompute();
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
    reset: () => reset(false),
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

export { PHASE };
