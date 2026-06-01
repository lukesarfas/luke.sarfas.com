import { WALL } from "./maze.js";

// A single search node. The parent pointer lets us trace the route back from
// the goal to the start once the search finishes.
export class Node {
  constructor(parent = null, position = null) {
    this.parent = parent;
    this.position = position;

    this.g = 0; // cost of the path from the start to this node
    this.h = 0; // heuristic estimate from this node to the goal
    this.f = 0; // g + h, the value the search sorts on
  }
}

export class AStarSearch {
  constructor(maze) {
    this.maze = maze;

    this.start = new Node(null, [maze.startX, maze.startY]);

    // openList: nodes still waiting to be evaluated.
    // closedList: nodes we've already expanded.
    this.openList = [this.start];
    this.closedList = [];

    this.endX = maze.endX;
    this.endY = maze.endY;

    // The cell the search is currently looking at - the renderer draws it.
    this.currentX = this.start.position[0];
    this.currentY = this.start.position[1];

    this.found = false;
  }

  // Walk the parent pointers back from a node to recover the path it took.
  getPath(node) {
    const path = [];
    let current = node;
    while (current !== null) {
      path.push(current.position);
      current = current.parent;
    }
    return path.reverse();
  }

  // Advance the search by one node. Call it repeatedly to animate the search;
  // it does nothing once the goal has been reached or the open list is empty.
  tickSearch() {
    if (this.openList.length === 0 || this.found) return;

    // Pull the open node with the lowest f value - the one that currently
    // looks closest to the goal. Sorting descending lets pop() take it.
    this.openList.sort((a, b) => b.f - a.f);
    const currentNode = this.openList.pop();

    this.currentX = currentNode.position[0];
    this.currentY = currentNode.position[1];

    // Reached the goal: record the path and stop.
    if (currentNode.position[0] === this.endX && currentNode.position[1] === this.endY) {
      this.found = true;
      this.maze.path = this.getPath(currentNode);
      return;
    }

    // Generate the children: the four orthogonal neighbours.
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const nodePosition = [currentNode.position[0] + dx, currentNode.position[1] + dy];

      // Skip anything outside the grid.
      if (
        nodePosition[0] > this.maze.grid.length - 1 ||
        nodePosition[0] < 0 ||
        nodePosition[1] > this.maze.grid[0].length - 1 ||
        nodePosition[1] < 0
      ) {
        continue;
      }

      // Skip walls.
      if (this.maze.grid[nodePosition[0]][nodePosition[1]] === WALL) continue;

      const newNode = new Node(currentNode, nodePosition);

      // g is the cost to reach this child; h is the Manhattan distance to the
      // goal; f drives which node we expand next.
      newNode.g = currentNode.g + 1;
      newNode.h = Math.abs(newNode.position[0] - this.endX) + Math.abs(newNode.position[1] - this.endY);
      newNode.f = newNode.g + newNode.h;

      let addToList = true;

      // Already queued? Keep whichever route reaches it with the lower f.
      for (const node of this.openList) {
        if (node.position[0] === newNode.position[0] && node.position[1] === newNode.position[1]) {
          if (node.f > newNode.f) {
            node.f = newNode.f;
            node.parent = newNode.parent;
          } else {
            addToList = false;
          }
        }
      }

      // Already expanded? Only reconsider it if the new route is better.
      for (const node of this.closedList) {
        if (
          node.position[0] === newNode.position[0] &&
          node.position[1] === newNode.position[1] &&
          node.f < newNode.f
        ) {
          addToList = false;
          break;
        }
      }

      if (addToList) {
        this.openList.push(newNode);
      }
    }

    // The current node is fully evaluated now.
    this.closedList.push(currentNode);
  }
}
