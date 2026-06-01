// Maze generation with recursive backtracking.
//
// The grid is stored column-major as grid[x][y] to match the Python version:
// x is the horizontal index, y the vertical one.

export const OUTSIDE = -1;
export const EMPTY = 0;
export const WALL = 1;
export const START = 2;
export const END = 3;

export class Maze {
  constructor(rows = 21, cols = 21) {
    this.rows = rows;
    this.cols = cols;

    // Start one cell in from the top-left, finish one cell in from the
    // bottom-right, so neither ever lands on the outer wall.
    this.startX = 1;
    this.startY = 1;
    this.endX = cols - 2;
    this.endY = rows - 2;

    // Every cell begins as a wall; generate() carves the corridors out.
    this.grid = Array.from({ length: cols }, () => new Array(rows).fill(WALL));

    // Filled in by the A* search once it reaches the goal.
    this.path = [];
  }

  // Carve the maze with recursive backtracking.
  //
  // From the current cell we look two steps ahead in each direction. A cell
  // two steps away that is still a wall hasn't been visited yet, so we knock
  // down the wall between us and move into it. When a cell has no unvisited
  // neighbours we pop it off the stack and backtrack. The maze is finished
  // once the stack is empty.
  generate() {
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];

    this.grid[this.startX][this.startY] = EMPTY;
    const stack = [[this.startX, this.startY]];

    while (stack.length > 0) {
      const [x, y] = stack[stack.length - 1];

      const neighbours = [];
      for (const [dx, dy] of directions) {
        const nx = x + dx * 2;
        const ny = y + dy * 2;
        // The neighbour two steps away must be inside the maze and still solid.
        if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && this.grid[nx][ny] === WALL) {
          neighbours.push([nx, ny, dx, dy]);
        }
      }

      if (neighbours.length > 0) {
        const [nx, ny, dx, dy] = neighbours[Math.floor(Math.random() * neighbours.length)];
        this.grid[x + dx][y + dy] = EMPTY; // the wall between the two cells
        this.grid[nx][ny] = EMPTY;
        stack.push([nx, ny]);
      } else {
        stack.pop();
      }
    }

    this.grid[1][1] = START;
    this.grid[this.cols - 2][this.rows - 2] = END;
    return this.grid;
  }
}
