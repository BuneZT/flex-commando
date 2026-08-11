import { describe, it, expect } from 'vitest';
import { generateRoomGrid, GridCell, calculateDoorMask, DOOR_FLAGS } from '../src/core/GridGenerator';
import { ROOM_TEMPLATES, getMatchingRoomTemplates, RoomTemplate } from '../src/core/RoomTemplate';

describe('GridGenerator', () => {
  it('should generate a 4x4 grid with a continuous path from start to boss room', () => {
    const seed = 12345;
    const grid = generateRoomGrid(seed);

    // 1. Matrix dimensions: 4 rows x 4 columns
    expect(grid.length).toBe(4);
    for (let y = 0; y < 4; y++) {
      expect(grid[y].length).toBe(4);
    }

    // 2. Start room placement in col 0 (x=0)
    const allCells = grid.flat();
    const startRooms = allCells.filter((r) => r.type === 'START');
    expect(startRooms.length).toBe(1);
    const startRoom = startRooms[0];
    expect(startRoom.x).toBe(0);
    expect(startRoom.y).toBeGreaterThanOrEqual(0);
    expect(startRoom.y).toBeLessThan(4);

    // 3. Boss room placement in col 3 (x=3)
    const bossRooms = allCells.filter((r) => r.type === 'BOSS');
    expect(bossRooms.length).toBe(1);
    const bossRoom = bossRooms[0];
    expect(bossRoom.x).toBe(3);
    expect(bossRoom.y).toBeGreaterThanOrEqual(0);
    expect(bossRoom.y).toBeLessThan(4);

    // 4. Continuous path validation from START to BOSS via doors
    const queue: GridCell[] = [startRoom];
    const visited = new Set<string>();
    visited.add(`${startRoom.x},${startRoom.y}`);
    let bossReached = false;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.x === bossRoom.x && current.y === bossRoom.y) {
        bossReached = true;
        break;
      }

      // Check North
      if (current.doors.north && current.y > 0) {
        const neighbor = grid[current.y - 1][current.x];
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
      // Check South
      if (current.doors.south && current.y < 3) {
        const neighbor = grid[current.y + 1][current.x];
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
      // Check East
      if (current.doors.east && current.x < 3) {
        const neighbor = grid[current.y][current.x + 1];
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
      // Check West
      if (current.doors.west && current.x > 0) {
        const neighbor = grid[current.y][current.x - 1];
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    expect(bossReached).toBe(true);
  });

  it('should guarantee door symmetry between all adjacent rooms', () => {
    const grid = generateRoomGrid(99999);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = grid[y][x];

        // North symmetry
        if (cell.doors.north) {
          expect(y).toBeGreaterThan(0);
          expect(grid[y - 1][x].doors.south).toBe(true);
        }
        // South symmetry
        if (cell.doors.south) {
          expect(y).toBeLessThan(3);
          expect(grid[y + 1][x].doors.north).toBe(true);
        }
        // East symmetry
        if (cell.doors.east) {
          expect(x).toBeLessThan(3);
          expect(grid[y][x + 1].doors.west).toBe(true);
        }
        // West symmetry
        if (cell.doors.west) {
          expect(x).toBeGreaterThan(0);
          expect(grid[y][x - 1].doors.east).toBe(true);
        }
      }
    }
  });

  it('should correctly compute doorMask bit flags (N=1, S=2, E=4, W=8)', () => {
    expect(calculateDoorMask({ north: true, south: false, east: false, west: false })).toBe(DOOR_FLAGS.NORTH);
    expect(calculateDoorMask({ north: false, south: true, east: false, west: false })).toBe(DOOR_FLAGS.SOUTH);
    expect(calculateDoorMask({ north: false, south: false, east: true, west: false })).toBe(DOOR_FLAGS.EAST);
    expect(calculateDoorMask({ north: false, south: false, east: false, west: true })).toBe(DOOR_FLAGS.WEST);

    const fullMask = calculateDoorMask({ north: true, south: true, east: true, west: true });
    expect(fullMask).toBe(15); // 1 + 2 + 4 + 8

    const grid = generateRoomGrid(42);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = grid[y][x];
        const expectedMask = calculateDoorMask(cell.doors);
        expect(cell.doorMask).toBe(expectedMask);
      }
    }
  });

  command: 'npx vitest run tests/grid-generator.test.ts',
  it('should assign valid room template IDs matching cell door configurations', () => {
    const grid = generateRoomGrid(777);

    const nonEmptyCells = grid.flat().filter((cell) => cell.type !== 'EMPTY');
    expect(nonEmptyCells.length).toBeGreaterThan(0);

    for (const cell of nonEmptyCells) {
      expect(cell.templateId).toBeDefined();
      const matchingTemplates = getMatchingRoomTemplates(cell.doorMask);
      expect(matchingTemplates.map((t) => t.id)).toContain(cell.templateId);
    }
  });

  it('should generate deterministic room grid given the same seed', () => {
    const seed = 54321;
    const grid1 = generateRoomGrid(seed);
    const grid2 = generateRoomGrid(seed);

    expect(grid1).toEqual(grid2);
  });
});

describe('RoomTemplate', () => {
  it('should export templates for 20x15 tile dimensions', () => {
    expect(ROOM_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of ROOM_TEMPLATES) {
      expect(template.width).toBe(20);
      expect(template.height).toBe(15);
      expect(template.tiles.length).toBe(15);
      for (const row of template.tiles) {
        expect(row.length).toBe(20);
      }
    }
  });
});
