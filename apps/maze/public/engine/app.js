// app.js — wiring for the showcase page. Loaded as an external same-origin
// module (no inline script) so the page satisfies a strict `script-src 'self'`
// CSP. Owns the controls, keyboard shortcuts, and the accessible status text.

import { createSolver, PHASE } from "./solver.js";

const $ = (id) => document.getElementById(id);

// Highlight the group of code lines currently executing (kept in sync with the
// solver). A group such as "expand" spans several lines, so every line that
// runs at that phase lights up together.
const lineEls = Array.from(document.querySelectorAll("#code .cl"));
let shownGroup = null;
function highlightGroup(group) {
  if (group === shownGroup) return;
  for (const el of lineEls) {
    el.classList.toggle("active", group != null && el.dataset.group === group);
  }
  shownGroup = group;
}

const canvas = $("maze");
if (canvas) {
  const statusText = {
    [PHASE.EXPLORING]: "Searching…",
    [PHASE.REVEALING]: "Tracing path…",
    [PHASE.SOLVED]: "Solved",
    [PHASE.NO_PATH]: "No path exists",
    [PHASE.ERROR]: "Failed to load",
  };

  let lastPhase = null;

  const solver = createSolver({
    canvas,
    size: 41,
    speed: 75,
    onState(s) {
      // Don't reveal the path length until the search actually traces it.
      const showPath = s.phase === PHASE.SOLVED || s.phase === PHASE.REVEALING;
      setText("stat-explored", s.explored);
      setText("stat-frontier", s.frontier);
      setText("stat-path", showPath && s.pathLength ? s.pathLength : "—");
      // A paused/not-yet-started maze reads "Ready"/"Paused" rather than the
      // phase label, so it's clear a New maze is waiting for the user.
      const status =
        s.phase === PHASE.SOLVED || s.phase === PHASE.NO_PATH || s.phase === PHASE.ERROR
          ? statusText[s.phase]
          : s.running
            ? statusText[s.phase]
            : s.explored > 0
              ? "Paused"
              : "Ready";
      setText("stat-status", status || "");
      setText("speed-rate", `${s.stepsPerSecond.toLocaleString()} steps/s`);
      highlightGroup(s.codeGroup);

      const toggle = $("toggle");
      if (toggle) {
        const done = s.phase === PHASE.SOLVED || s.phase === PHASE.NO_PATH;
        toggle.textContent = s.running ? "Pause" : done ? "Replay" : "Play";
        toggle.setAttribute("aria-pressed", String(s.running));
      }

      // Announce meaningful transitions to assistive tech (not every frame).
      if (s.phase !== lastPhase) {
        lastPhase = s.phase;
        announce(
          s.phase === PHASE.SOLVED
            ? `Solved. Shortest path is ${s.pathLength} cells; explored ${s.explored} cells.`
            : s.phase === PHASE.NO_PATH
              ? "No path exists in this maze."
              : s.phase === PHASE.ERROR
                ? "The visualiser failed to load."
                : s.running
                  ? "Searching for the shortest path."
                  : "Ready.",
        );
      }
    },
  });

  // Replay the SAME maze from the start (vs. "New maze" which generates one).
  const replay = () => {
    solver.reset();
    solver.play();
  };
  // When the run is finished, the toggle button acts as Replay; otherwise it
  // pauses/resumes. (Without this the "Replay" label was a no-op.)
  const isDone = () => solver.isSolved() || solver.getPhase() === PHASE.NO_PATH;

  // New maze generates a fresh maze but waits for the user to press Play;
  // Replay re-runs the current maze and starts immediately.
  const newMaze = () => solver.regenerate({ autoplay: false });

  on("toggle", "click", () => (isDone() ? replay() : solver.toggle()));
  on("step", "click", () => solver.step());
  on("new", "click", newMaze);
  on("speed", "input", (e) => solver.setSpeed(Number(e.target.value)));
  on("size", "change", (e) => solver.setSize(Number(e.target.value)));

  // Keyboard shortcuts (ignored while typing in a form field).
  document.addEventListener("keydown", (e) => {
    if (isTypingTarget(e.target)) return;
    switch (e.key) {
      case " ":
      case "Spacebar":
        e.preventDefault();
        isDone() ? replay() : solver.toggle();
        break;
      case "ArrowRight":
        e.preventDefault();
        solver.step();
        break;
      case "n":
      case "N":
        newMaze();
        break;
      case "r":
      case "R":
        replay();
        break;
      default:
        break;
    }
  });

  solver.play();
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value);
}

function announce(message) {
  const live = $("a11y-status");
  if (live) live.textContent = message;
}

function on(id, event, handler) {
  const el = $(id);
  if (el) el.addEventListener(event, handler);
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || el.isContentEditable;
}
