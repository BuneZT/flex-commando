import { describe, it, expect } from 'vitest';
import { generateRoomGrid, GridCell, calculateDoorMask, DOOR_FLAGS, selectCapsuleRoomCoords } from '../src/core/GridGenerator';
import { ROOM_TEMPLATES, getMatchingRoomTemplates, RoomTemplate } from '../src/core/RoomTemplate';
import { GAME_CONSTANTS } from '../src/config/GameConstants';

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
  it('should export templates for 32x18 tile dimensions', () => {
    expect(ROOM_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of ROOM_TEMPLATES) {
      expect(template.width).toBe(GAME_CONSTANTS.ROOM_WIDTH_TILES);
      expect(template.height).toBe(GAME_CONSTANTS.ROOM_HEIGHT_TILES);
      expect(template.tiles.length).toBe(18);
      for (const row of template.tiles) {
        expect(row.length).toBe(32);
      }
    }
  });

  it('should provide open floor tiles for South doors and open ceiling tiles for North doors', () => {
    const southTemplate = ROOM_TEMPLATES.find((t) => t.doors.south);
    expect(southTemplate).toBeDefined();
    if (southTemplate) {
      // Bottom row (r=17) cols 14..17 should not be solid ground (tile 1)
      expect(southTemplate.tiles[17][15]).not.toBe(1);
    }

    const northTemplate = ROOM_TEMPLATES.find((t) => t.doors.north);
    expect(northTemplate).toBeDefined();
    if (northTemplate) {
      // Top row (r=0) cols 14..17 should be open air (tile 0)
      expect(northTemplate.tiles[0][15]).toBe(0);
    }
  });
});

describe('selectCapsuleRoomCoords', () => {
  it('should select 2 to 3 rooms for weapon capsules across multiple seeds', () => {
    for (const seed of [12345, 99999, 42, 777, 2026]) {
      const grid = generateRoomGrid(seed);
      const coords = selectCapsuleRoomCoords(grid);
      expect(coords.length).toBeGreaterThanOrEqual(2);
      expect(coords.length).toBeLessThanOrEqual(3);

      // Verify no duplicates
      const keys = new Set(coords.map((c) => `${c.x},${c.y}`));
      expect(keys.size).toBe(coords.length);

      // Verify START and BOSS rooms are never selected
      for (const coord of coords) {
        const cell = grid[coord.y][coord.x];
        expect(cell.type).not.toBe('START');
        expect(cell.type).not.toBe('BOSS');
        expect(cell.type).not.toBe('EMPTY');
      }
    }
  });

  it('should prioritize BRANCH rooms and pre-boss PATH room', () => {
    const grid = generateRoomGrid(12345);
    const coords = selectCapsuleRoomCoords(grid);
    const branchCells = grid.flat().filter((c) => c.type === 'BRANCH');
    if (branchCells.length > 0) {
      const selectedBranches = coords.filter((c) => grid[c.y][c.x].type === 'BRANCH');
      expect(selectedBranches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should fallback gracefully to mid-stage PATH room when zero BRANCH rooms exist', () => {
    // Construct a synthetic grid with only START, PATH, and BOSS
    const mockGrid: GridCell[][] = Array.from({ length: 4 }, (_, y) =>
      Array.from({ length: 4 }, (_, x) => ({
        x,
        y,
        type: 'EMPTY' as const,
        doors: { north: false, south: false, east: false, west: false },
        doorMask: 0,
      }))
    );
    mockGrid[0][0].type = 'START';
    mockGrid[0][1].type = 'PATH';
    mockGrid[0][1].doors.west = true;
    mockGrid[0][1].doors.east = true;
    mockGrid[0][2].type = 'PATH';
    mockGrid[0][2].doors.west = true;
    mockGrid[0][2].doors.east = true;
    mockGrid[0][3].type = 'BOSS';
    mockGrid[0][3].doors.west = true;

    const coords = selectCapsuleRoomCoords(mockGrid);
    expect(coords.length).toBe(2);
    expect(coords).toContainEqual({ x: 2, y: 0 }); // Pre-boss
    expect(coords).toContainEqual({ x: 1, y: 0 }); // Mid-path
  });

  it('should attach decoratedTiles to all non-EMPTY cells in generateRoomGrid', () => {
    const grid = generateRoomGrid(42);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cell = grid[y][x];
        if (cell.type !== 'EMPTY') {
          expect(cell.decoratedTiles).toBeDefined();
          expect(cell.decoratedTiles!.length).toBe(18);
          expect(cell.decoratedTiles![0].length).toBe(32);
        } else {
          expect(cell.decoratedTiles).toBeUndefined();
        }
      }
    }
  });

  it('should guarantee top exit reachability for every room with north doors across multiple seeds', () => {
    const seeds = [42, 12345, 99999, 777, 2026, 31415, 8888];
    for (const seed of seeds) {
      const grid = generateRoomGrid(seed);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const cell = grid[y][x];
          if (cell.type !== 'EMPTY' && cell.doors.north) {
            const tiles = cell.decoratedTiles!;
            // 1. Portal gap at ceiling row 0 cols 14-17 must be open air (tile 0)
            for (let c = 14; c <= 17; c++) {
              expect(tiles[0][c]).toBe(0);
            }
            // 2. Jumping platform at Row 3 must be present across portal cols 14-17 (tile 2)
            for (let c = 14; c <= 17; c++) {
              expect(tiles[3][c]).toBe(2);
            }
            // 3. Airspace between jump platform and ceiling portal (rows 1-2) must be clear
            for (let r = 1; r <= 2; r++) {
              for (let c = 14; c <= 17; c++) {
                expect(tiles[r][c]).toBe(0);
              }
            }
          }
        }
      }
    }
  });
});

