// Themed canvas renderer for luke.sarfas.com.
//
// Reuses the algorithm core vendored from the repo (maze.js / astar.js /
// agent.js) and draws a richer view of the search than the standalone demo:
// the explored set, the live frontier, and the final path. Colours are read
// from CSS custom properties so each page can theme it.
//
// Source of truth for the algorithm:
// https://github.com/lukesarfas/A-Star-Maze-Algorithm-Solver

import { Maze, WALL, START, END } from "./maze.js";
import { Agent } from "./agent.js";

function readColours(el) {
  const cs = getComputedStyle(el);
  const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  return {
    background: get("--maze-bg", "#0e0f13"),
    wall: get("--maze-wall", "#23262f"),
    explored: get("--maze-explored", "rgba(120,134,170,0.20)"),
    frontier: get("--maze-frontier", "rgba(240,180,41,0.28)"),
    path: get("--maze-path", "#f0b429"),
    start: get("--maze-start", "#34d399"),
    goal: get("--maze-goal", "#f87171"),
    agent: get("--maze-agent", "#60a5fa"),
  };
}

export function createSolver({ canvas, size = 41, speed = 6, onStats }) {
  const ctx = canvas.getContext("2d");
  let colours = readColours(canvas);

  let cols = oddify(size);
  let maze;
  let agent;
  let cell;
  let animationId = null;
  let running = false;

  function oddify(n) {
    return n % 2 === 0 ? n + 1 : n;
  }

  function build() {
    maze = new Maze(cols, cols);
    maze.generate();
    agent = new Agent(maze);
  }

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const px = canvas.clientWidth;
    canvas.width = px * dpr;
    canvas.height = px * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = px / cols;
  }

  function rect(x, y, colour) {
    ctx.fillStyle = colour;
    // Half-pixel inset reads as a grid without drawing separate lines.
    ctx.fillRect(x * cell, y * cell, Math.ceil(cell) - 0.5, Math.ceil(cell) - 0.5);
  }

  function draw() {
    const px = canvas.clientWidth;
    ctx.fillStyle = colours.background;
    ctx.fillRect(0, 0, px, px);

    const explored = new Set(agent.search.closedList.map((n) => n.position[0] + "," + n.position[1]));
    const frontier = new Set(agent.search.openList.map((n) => n.position[0] + "," + n.position[1]));
    const path = new Set(maze.path.map((p) => p[0] + "," + p[1]));

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < cols; y++) {
        const key = x + "," + y;
        if (explored.has(key)) rect(x, y, colours.explored);
        if (frontier.has(key)) rect(x, y, colours.frontier);
        if (maze.grid[x][y] === WALL) rect(x, y, colours.wall);
        if (path.has(key)) rect(x, y, colours.path);
        if (maze.grid[x][y] === START) rect(x, y, colours.start);
        if (maze.grid[x][y] === END) rect(x, y, colours.goal);
      }
    }

    if (!agent.search.found) {
      ctx.fillStyle = colours.agent;
      ctx.fillRect(agent.x * cell, agent.y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }

  function stats() {
    if (!onStats) return;
    onStats({
      explored: agent.search.closedList.length,
      frontier: agent.search.openList.length,
      pathLength: maze.path.length,
      found: agent.search.found,
      running,
    });
  }

  function frame() {
    for (let i = 0; i < speed && !agent.search.found; i++) agent.tick();
    draw();
    stats();
    if (agent.search.found || agent.search.openList.length === 0) {
      running = false;
      animationId = null;
      stats();
      return;
    }
    animationId = requestAnimationFrame(frame);
  }

  function play() {
    if (running || agent.search.found || agent.search.openList.length === 0) return;
    running = true;
    stats();
    animationId = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
    stats();
  }

  function toggle() {
    running ? pause() : play();
  }

  function step() {
    if (agent.search.found || agent.search.openList.length === 0) return;
    pause();
    agent.tick();
    draw();
    stats();
  }

  function regenerate({ autoplay = true } = {}) {
    pause();
    build();
    layout();
    draw();
    stats();
    if (autoplay) play();
  }

  function setSpeed(n) {
    speed = Math.max(1, Math.floor(n));
  }

  function setSize(n) {
    cols = oddify(n);
    regenerate();
  }

  window.addEventListener("resize", () => {
    layout();
    draw();
  });

  build();
  layout();
  draw();
  stats();

  return {
    play,
    pause,
    toggle,
    step,
    regenerate,
    setSpeed,
    setSize,
    isRunning: () => running,
    isFound: () => agent.search.found,
    refreshTheme: () => {
      colours = readColours(canvas);
      draw();
    },
  };
}
