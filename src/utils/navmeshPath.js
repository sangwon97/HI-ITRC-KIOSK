import * as THREE from 'three';

const CARDINAL_STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function cellKey(cell) {
  return `${cell.row}:${cell.col}`;
}

export function buildNavmeshGrid(navmeshObject, { cellSize = 0.6, raycastPadding = 3 } = {}) {
  if (!navmeshObject) {
    return null;
  }

  navmeshObject.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(navmeshObject);
  const width = bounds.max.x - bounds.min.x;
  const depth = bounds.max.z - bounds.min.z;

  if (width <= 0 || depth <= 0) {
    return null;
  }

  const cols = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(depth / cellSize) + 1;
  const walkable = Array.from({ length: rows }, () => Array(cols).fill(false));
  const heights = Array.from({ length: rows }, () => Array(cols).fill(0));

  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  const rayY = bounds.max.y + raycastPadding;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = bounds.min.x + col * cellSize;
      const z = bounds.min.z + row * cellSize;

      origin.set(x, rayY, z);
      raycaster.set(origin, down);

      const hits = raycaster.intersectObject(navmeshObject, true);
      if (hits.length === 0) {
        continue;
      }

      walkable[row][col] = true;
      heights[row][col] = hits[0].point.y;
    }
  }

  return {
    cellSize,
    cols,
    rows,
    walkable,
    heights,
    originX: bounds.min.x,
    originZ: bounds.min.z,
  };
}

export function worldToCell(x, z, grid) {
  return {
    col: clamp(Math.round((x - grid.originX) / grid.cellSize), 0, grid.cols - 1),
    row: clamp(Math.round((z - grid.originZ) / grid.cellSize), 0, grid.rows - 1),
  };
}

export function cellToWorld(cell, grid, yOffset = 0.15) {
  return [
    grid.originX + cell.col * grid.cellSize,
    (grid.heights[cell.row]?.[cell.col] ?? 0) + yOffset,
    grid.originZ + cell.row * grid.cellSize,
  ];
}

export function findNearestWalkable(startCell, grid, maxRadius = 48) {
  if (!grid) {
    return null;
  }

  const inBounds = (row, col) => row >= 0 && row < grid.rows && col >= 0 && col < grid.cols;

  if (inBounds(startCell.row, startCell.col) && grid.walkable[startCell.row][startCell.col]) {
    return startCell;
  }

  const queue = [startCell];
  const visited = new Set([cellKey(startCell)]);

  while (queue.length > 0) {
    const current = queue.shift();
    const distance = Math.abs(current.row - startCell.row) + Math.abs(current.col - startCell.col);
    if (distance > maxRadius) {
      continue;
    }

    if (inBounds(current.row, current.col) && grid.walkable[current.row][current.col]) {
      return current;
    }

    for (const [dCol, dRow] of CARDINAL_STEPS) {
      const next = { row: current.row + dRow, col: current.col + dCol };
      if (!inBounds(next.row, next.col)) {
        continue;
      }

      const key = cellKey(next);
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      queue.push(next);
    }
  }

  return null;
}

export function findPath(startCell, goalCell, grid) {
  if (!startCell || !goalCell || !grid) {
    return [];
  }

  const heuristic = (cell) => Math.abs(cell.row - goalCell.row) + Math.abs(cell.col - goalCell.col);
  const inBounds = (row, col) => row >= 0 && row < grid.rows && col >= 0 && col < grid.cols;

  const open = [startCell];
  const cameFrom = new Map();
  const gScore = new Map([[cellKey(startCell), 0]]);
  const fScore = new Map([[cellKey(startCell), heuristic(startCell)]]);

  while (open.length > 0) {
    let currentIndex = 0;
    for (let index = 1; index < open.length; index += 1) {
      if ((fScore.get(cellKey(open[index])) ?? Infinity) < (fScore.get(cellKey(open[currentIndex])) ?? Infinity)) {
        currentIndex = index;
      }
    }

    const current = open.splice(currentIndex, 1)[0];
    const currentKey = cellKey(current);

    if (current.row === goalCell.row && current.col === goalCell.col) {
      const path = [current];
      let traceKey = currentKey;

      while (cameFrom.has(traceKey)) {
        const prev = cameFrom.get(traceKey);
        path.unshift(prev);
        traceKey = cellKey(prev);
      }

      return path;
    }

    const currentCost = gScore.get(currentKey) ?? Infinity;

    for (const [dCol, dRow] of CARDINAL_STEPS) {
      const next = { row: current.row + dRow, col: current.col + dCol };
      if (!inBounds(next.row, next.col) || !grid.walkable[next.row][next.col]) {
        continue;
      }

      const nextKey = cellKey(next);
      const tentativeCost = currentCost + 1;

      if (tentativeCost >= (gScore.get(nextKey) ?? Infinity)) {
        continue;
      }

      cameFrom.set(nextKey, current);
      gScore.set(nextKey, tentativeCost);
      fScore.set(nextKey, tentativeCost + heuristic(next));

      if (!open.some((cell) => cell.row === next.row && cell.col === next.col)) {
        open.push(next);
      }
    }
  }

  return [];
}

export function compressPath(cellPath, grid) {
  if (!cellPath || cellPath.length === 0) {
    return [];
  }

  if (cellPath.length === 1) {
    return [cellToWorld(cellPath[0], grid)];
  }

  const points = [cellToWorld(cellPath[0], grid)];
  let prevDir = null;

  for (let index = 1; index < cellPath.length; index += 1) {
    const prev = cellPath[index - 1];
    const current = cellPath[index];
    const direction = [current.col - prev.col, current.row - prev.row];

    if (!prevDir || direction[0] !== prevDir[0] || direction[1] !== prevDir[1]) {
      points.push(cellToWorld(prev, grid));
    }

    prevDir = direction;
  }

  points.push(cellToWorld(cellPath[cellPath.length - 1], grid));

  return points.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const prev = points[index - 1];
    return Math.hypot(point[0] - prev[0], point[2] - prev[2]) > 0.01;
  });
}
