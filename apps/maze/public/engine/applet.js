// applet.js — wiring for the embeddable applet. External same-origin module
// (no inline script) for a clean `script-src 'self'` CSP. Keeps the embed
// lively by regenerating a short while after each solve.

import { createSolver, PHASE } from "./solver.js";

const $ = (id) => document.getElementById(id);

const canvas = $("maze");
if (canvas) {
  let loopTimer = null;
  let lastPhase = null;
  // Respect reduced-motion: don't auto-regenerate (which would swap the whole
  // canvas every few seconds — exactly the kind of motion the user opted out of).
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const solver = createSolver({
    canvas,
    size: 41,
    speed: 80,
    onState(s) {
      const showPath = s.phase === PHASE.SOLVED || s.phase === PHASE.REVEALING;
      setText("s-explored", s.explored);
      setText("s-frontier", s.frontier);
      setText("s-path", showPath && s.pathLength ? s.pathLength : "—");

      const toggle = $("toggle");
      if (toggle) {
        const done = s.phase === PHASE.SOLVED || s.phase === PHASE.NO_PATH;
        toggle.textContent = s.running ? "Pause" : done ? "Replay" : "Play";
      }

      if (s.phase !== lastPhase) {
        lastPhase = s.phase;
        announce(
          s.phase === PHASE.SOLVED
            ? `Solved, path length ${s.pathLength}.`
            : s.phase === PHASE.NO_PATH
              ? "No path exists."
              : "Searching.",
        );
      }

      // Auto-loop so the embed always shows motion — but never under
      // reduced-motion (it would keep swapping the whole canvas).
      if (!reduceMotion && (s.phase === PHASE.SOLVED || s.phase === PHASE.NO_PATH) && loopTimer === null) {
        loopTimer = setTimeout(() => {
          loopTimer = null;
          solver.regenerate();
        }, 2600);
      }
    },
  });

  const isDone = () => solver.isSolved() || solver.getPhase() === PHASE.NO_PATH;
  const replay = () => {
    solver.reset();
    solver.play();
  };

  on("toggle", "click", () => {
    clearLoop();
    isDone() ? replay() : solver.toggle();
  });
  on("new", "click", () => {
    clearLoop();
    solver.regenerate();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      e.preventDefault();
      clearLoop();
      isDone() ? replay() : solver.toggle();
    } else if (e.key === "n" || e.key === "N") {
      clearLoop();
      solver.regenerate();
    }
  });

  function clearLoop() {
    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
  }

  solver.play();
  try {
    window.parent?.postMessage({ type: "applet:ready" }, "*");
  } catch {
    /* embedded without a parent we can reach — fine */
  }
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
