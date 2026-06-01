import { AStarSearch } from "./astar.js";

// Walks the maze, leaving the decisions to the A* search. The agent only
// tracks where it has been so the renderer can shade those cells in.
export class Agent {
  constructor(maze) {
    this.x = 1;
    this.y = 1;

    this.maze = maze;

    // Cells the search has settled on, kept for rendering. JavaScript Sets
    // compare arrays by reference, so positions are stored as "x,y" strings.
    this.seen = new Set();

    this.search = new AStarSearch(maze);
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  // Called once per frame: remember the current cell, advance the search by
  // one node, then jump to wherever it looked.
  tick() {
    this.seen.add(`${this.x},${this.y}`);
    this.search.tickSearch();
    this.x = this.search.currentX;
    this.y = this.search.currentY;
  }
}
