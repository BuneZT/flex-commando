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

  // Carve main path from START (0, startY) to BOSS (3, bossY)
  while (currentX < 3 || currentY !== bossY) {
    const nextDirs: ('EAST' | 'NORTH' | 'SOUTH')[] = [];

    if (currentX < 3) {
      nextDirs.push('EAST');
    }
    if (currentY > 0 && currentY > bossY) {
      nextDirs.push('NORTH');
    }
    if (currentY < 3 && currentY < bossY) {
      nextDirs.push('SOUTH');
    }

    const choice = nextDirs.length > 0 ? rng.choice(nextDirs) : 'EAST';

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
