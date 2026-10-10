import { calculateDoorMask, DOOR_FLAGS, getMatchingRoomTemplates, RoomTemplate } from './RoomTemplate';

export { calculateDoorMask, DOOR_FLAGS };

export interface GridCell {
  x: number;
  y: number;
  type: 'EMPTY' | 'START' | 'PATH' | 'BRANCH' | 'BOSS';
  doors: { north: boolean; south: boolean; east: boolean; west: boolean };
  doorMask: number;
  templateId?: string;
}

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export function generateRoomGrid(seed: number): GridCell[][] {
  const rng = new SeededRNG(seed);

  const grid: GridCell[][] = Array.from({ length: 4 }, (_, y) =>
    Array.from({ length: 4 }, (_, x) => ({
      x,
      y,
      type: 'EMPTY' as const,
      doors: { north: false, south: false, east: false, west: false },
      doorMask: 0,
    }))
  );

  const startY = rng.range(0, 3);
  const bossY = rng.range(0, 3);

  grid[startY][0].type = 'START';
  grid[bossY][3].type = 'BOSS';

  let currentX = 0;
  let currentY = startY;
  let lastChoice: 'EAST' | 'NORTH' | 'SOUTH' | null = null;

  // Carve main path from START (0, startY) to BOSS (3, bossY)
  let steps = 0;
  while ((currentX < 3 || currentY !== bossY) && steps < 50) {
    steps++;
    const nextDirs: ('EAST' | 'NORTH' | 'SOUTH')[] = [];

    if (currentX < 3) {
      nextDirs.push('EAST');
      nextDirs.push('EAST');
    }
    if (currentY > 0 && lastChoice !== 'SOUTH') {
      nextDirs.push('NORTH');
      if (currentY > bossY) nextDirs.push('NORTH');
    }
    if (currentY < 3 && lastChoice !== 'NORTH') {
      nextDirs.push('SOUTH');
      if (currentY < bossY) nextDirs.push('SOUTH');
    }

    const choice = nextDirs.length > 0 ? rng.choice(nextDirs) : 'EAST';
    lastChoice = choice;

    if (choice === 'EAST') {
      grid[currentY][currentX].doors.east = true;
      currentX++;
      grid[currentY][currentX].doors.west = true;
    } else if (choice === 'NORTH') {
      grid[currentY][currentX].doors.north = true;
      currentY--;
      grid[currentY][currentX].doors.south = true;
    } else if (choice === 'SOUTH') {
      grid[currentY][currentX].doors.south = true;
      currentY++;
      grid[currentY][currentX].doors.north = true;
    }

    if (grid[currentY][currentX].type === 'EMPTY') {
      grid[currentY][currentX].type = 'PATH';
    }
  }

  // Branch generation: attempt side paths off main path
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cell = grid[y][x];
      if (cell.type === 'START' || cell.type === 'PATH') {
        if (rng.next() < 0.3) {
          const candidates: ('NORTH' | 'SOUTH' | 'EAST' | 'WEST')[] = [];
          if (y > 0 && grid[y - 1][x].type === 'EMPTY') candidates.push('NORTH');
          if (y < 3 && grid[y + 1][x].type === 'EMPTY') candidates.push('SOUTH');
          if (x > 0 && grid[y][x - 1].type === 'EMPTY') candidates.push('WEST');
          if (x < 3 && grid[y][x + 1].type === 'EMPTY') candidates.push('EAST');

          if (candidates.length > 0) {
            const dir = rng.choice(candidates);
            if (dir === 'NORTH') {
              cell.doors.north = true;
              grid[y - 1][x].doors.south = true;
              grid[y - 1][x].type = 'BRANCH';
            } else if (dir === 'SOUTH') {
              cell.doors.south = true;
              grid[y + 1][x].doors.north = true;
              grid[y + 1][x].type = 'BRANCH';
            } else if (dir === 'WEST') {
              cell.doors.west = true;
              grid[y][x - 1].doors.east = true;
              grid[y][x - 1].type = 'BRANCH';
            } else if (dir === 'EAST') {
              cell.doors.east = true;
              grid[y][x + 1].doors.west = true;
              grid[y][x + 1].type = 'BRANCH';
            }
          }
        }
      }
    }
  }

  // Compute doorMask and assign matching templateId
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cell = grid[y][x];
      cell.doorMask = calculateDoorMask(cell.doors);
      if (cell.type !== 'EMPTY') {
        const templates: RoomTemplate[] = getMatchingRoomTemplates(cell.doorMask, cell.type);
        const selected = rng.choice(templates);
        cell.templateId = selected.id;
      }
    }
  }

  return grid;
}

export interface RoomCoord {
  x: number;
  y: number;
}

export function selectCapsuleRoomCoords(grid: GridCell[][]): RoomCoord[] {
  const result: RoomCoord[] = [];
  const flat = grid.flat();

  // 1. Locate BOSS cell
  const bossCell = flat.find((c) => c.type === 'BOSS');

  // 2. Locate pre-boss PATH cell
  let preBossCell: GridCell | undefined;
  if (bossCell) {
    const neighbors: GridCell[] = [];
    if (bossCell.y > 0) neighbors.push(grid[bossCell.y - 1][bossCell.x]);
    if (bossCell.y < 3) neighbors.push(grid[bossCell.y + 1][bossCell.x]);
    if (bossCell.x > 0) neighbors.push(grid[bossCell.y][bossCell.x - 1]);
    if (bossCell.x < 3) neighbors.push(grid[bossCell.y][bossCell.x + 1]);

    preBossCell = neighbors.find((n) => n.type === 'PATH');
  }

  // 3. Locate all BRANCH cells
  const branchCells = flat.filter((c) => c.type === 'BRANCH');

  // Allocate branch rooms (up to 2)
  for (let i = 0; i < Math.min(2, branchCells.length); i++) {
    result.push({ x: branchCells[i].x, y: branchCells[i].y });
  }

  // Add pre-boss room if found and not already included
  if (preBossCell && !result.some((c) => c.x === preBossCell!.x && c.y === preBossCell!.y)) {
    result.push({ x: preBossCell.x, y: preBossCell.y });
  }

  // Fallback if fewer than 2 total capsules selected
  if (result.length < 2) {
    const pathCells = flat.filter(
      (c) =>
        c.type === 'PATH' &&
        !result.some((r) => r.x === c.x && r.y === c.y)
    );
    if (pathCells.length > 0) {
      const midPath = pathCells[Math.floor(pathCells.length / 2)];
      result.push({ x: midPath.x, y: midPath.y });
    }
  }

  return result.slice(0, 3);
}
