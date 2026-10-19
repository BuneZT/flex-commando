import { describe, it, expect } from 'vitest';
import { getRoomBounds, CameraManager } from '../src/core/CameraManager';
import { stitchGridTilemap, TilemapRenderer } from '../src/core/TilemapRenderer';
import { generateRoomGrid } from '../src/core/GridGenerator';

describe('getRoomBounds', () => {
  it('should calculate pixel bounds for room at grid (1, 2)', () => {
    // 32 tiles * 16px = 512px width; 18 tiles * 16px = 288px height
    const bounds = getRoomBounds(1, 2, 512, 288);
    expect(bounds.x).toBe(512);
    expect(bounds.y).toBe(576);
    expect(bounds.width).toBe(512);
    expect(bounds.height).toBe(288);
  });

  it('should calculate pixel bounds with default room dimensions for origin (0, 0)', () => {
    const bounds = getRoomBounds(0, 0);
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(512);
    expect(bounds.height).toBe(288);
  });

  it('should calculate pixel bounds for room at grid (3, 3)', () => {
    const bounds = getRoomBounds(3, 3, 512, 288);
    expect(bounds.x).toBe(1536);
    expect(bounds.y).toBe(864);
    expect(bounds.width).toBe(512);
    expect(bounds.height).toBe(288);
  });
});

describe('CameraManager', () => {
  it('should initialize active room and bounds correctly', () => {
    const mockCamera = {
      setBounds: () => {},
      centerOn: () => {},
      pan: () => {},
      removeBounds: () => {},
    } as any;

    const manager = new CameraManager(mockCamera, 1, 2);
    expect(manager.getCurrentRoom()).toEqual({ gridX: 1, gridY: 2 });
    expect(manager.getActiveBounds()).toEqual({ x: 512, y: 576, width: 512, height: 288 });
  });

  it('should trigger room transition when player crosses room boundary', () => {
    const mockCamera = {
      setBounds: () => {},
      centerOn: () => {},
      pan: () => {},
      removeBounds: () => {},
    } as any;

    const manager = new CameraManager(mockCamera, 0, 0);
    // Player is still in room (0, 0)
    manager.update(100, 100);
    expect(manager.getCurrentRoom()).toEqual({ gridX: 0, gridY: 0 });

    // Player moves to room (1, 0) (x = 550 >= 528)
    manager.update(550, 100);
    expect(manager.getCurrentRoom()).toEqual({ gridX: 1, gridY: 0 });
  });
});

describe('stitchGridTilemap', () => {
  it('should stitch 4x4 room grid into an 128x72 tile matrix', () => {
    const grid = generateRoomGrid(12345);
    const tileMatrix = stitchGridTilemap(grid, 32, 18);

    expect(tileMatrix.length).toBe(72); // 4 * 18
    expect(tileMatrix[0].length).toBe(128); // 4 * 32
  });

  it('should use default dimensions of 32x18 when unspecified', () => {
    const grid = generateRoomGrid(12345);
    const tileMatrix = stitchGridTilemap(grid);

    expect(tileMatrix.length).toBe(72);
    expect(tileMatrix[0].length).toBe(128);
  });

  it('should prefer decoratedTiles if present on cell', () => {
    const grid = generateRoomGrid(12345);
    const tileMatrix = stitchGridTilemap(grid, 32, 18);
    const nonEmpty = grid.flat().find((c) => c.type !== 'EMPTY');
    expect(nonEmpty).toBeDefined();
    if (nonEmpty) {
      const startRow = nonEmpty.y * 18;
      const startCol = nonEmpty.x * 32;
      expect(tileMatrix[startRow + 17][startCol]).toBe(1);
    }
  });

  it('should use decoratedTiles instead of template.tiles when present', () => {
    const mockCell = {
      x: 0,
      y: 0,
      type: 'START' as const,
      doors: { north: false, south: false, east: false, west: false },
      doorMask: 0,
      templateId: 'room_0',
      decoratedTiles: Array.from({ length: 18 }, () => new Array(32).fill(99)),
    };
    const singleCellGrid = [[mockCell]];
    const tileMatrix = stitchGridTilemap(singleCellGrid, 32, 18);
    expect(tileMatrix[0][0]).toBe(99);
    expect(tileMatrix[17][31]).toBe(99);
  });

  it('should configure Tile 2 as a one-way platform allowing upward passage', () => {
    const mockTile = {
      index: 2,
      collideLeft: true,
      collideRight: true,
      collideUp: true,
      collideDown: true,
      setCollision: function (left: boolean, right: boolean, up: boolean, down: boolean) {
        this.collideLeft = left;
        this.collideRight = right;
        this.collideUp = up;
        this.collideDown = down;
      },
    };

    // Configure Tile 2 one-way collision: collideUp = true (land on top), collideDown = false (jump up through)
    mockTile.setCollision(false, false, true, false);
    expect(mockTile.collideDown).toBe(false);
    expect(mockTile.collideUp).toBe(true);
  });

  it('should call bulk map.setCollision for tiles 1, 3 and tile 2 on renderLevel', () => {
    const setCollisionCalls: Array<{ indexes: any; collides: boolean; recalculateFaces: boolean }> = [];
    const mockGroundLayer = {
      forEachTile: (cb: (tile: any) => void) => {
        cb({ index: 2, setCollision: () => {} });
      },
    };
    const mockMap = {
      addTilesetImage: () => ({}),
      createLayer: () => mockGroundLayer,
      setCollision: (indexes: any, collides: boolean, recalculateFaces: boolean) => {
        setCollisionCalls.push({ indexes, collides, recalculateFaces });
      },
    };
    const mockScene = {
      make: {
        tilemap: () => mockMap,
      },
    } as any;

    const grid = generateRoomGrid(12345);
    const result = TilemapRenderer.renderLevel(mockScene, grid);

    expect(result).not.toBeNull();
    expect(setCollisionCalls.length).toBe(2);
    expect(setCollisionCalls[0]).toEqual({ indexes: [1, 3], collides: true, recalculateFaces: true });
    expect(setCollisionCalls[1]).toEqual({ indexes: 2, collides: true, recalculateFaces: false });
  });

  it('should configure one-way collision specifically on tile 2 during forEachTile', () => {
    const tile2Collision: { left?: boolean; right?: boolean; up?: boolean; down?: boolean } = {};
    const tile1Collision: { left?: boolean; right?: boolean; up?: boolean; down?: boolean } = {};

    const mockGroundLayer = {
      forEachTile: (cb: (tile: any) => void) => {
        cb({
          index: 2,
          setCollision: (l: boolean, r: boolean, u: boolean, d: boolean) => {
            tile2Collision.left = l;
            tile2Collision.right = r;
            tile2Collision.up = u;
            tile2Collision.down = d;
          },
        });
        cb({
          index: 1,
          setCollision: (l: boolean, r: boolean, u: boolean, d: boolean) => {
            tile1Collision.left = l;
            tile1Collision.right = r;
            tile1Collision.up = u;
            tile1Collision.down = d;
          },
        });
      },
    };
    const mockMap = {
      addTilesetImage: () => ({}),
      createLayer: () => mockGroundLayer,
      setCollision: () => {},
    };
    const mockScene = {
      make: {
        tilemap: () => mockMap,
      },
    } as any;

    const grid = generateRoomGrid(42);
    TilemapRenderer.renderLevel(mockScene, grid);

    expect(tile2Collision).toEqual({ left: false, right: false, up: true, down: false });
    expect(tile1Collision).toEqual({}); // tile 1 should not have individual setCollision called
  });

  it('should exclude air (0) and exit portal (4) when using fallback setCollisionByExclusion', () => {
    let excludedIndexes: number[] = [];
    const mockGroundLayer = {
      setCollisionByExclusion: (indexes: number[]) => {
        excludedIndexes = indexes;
      },
    };
    const mockMap = {
      addTilesetImage: () => ({}),
      createLayer: () => mockGroundLayer,
      // Note: no map.setCollision, forcing the setCollisionByExclusion branch
    };
    const mockScene = {
      make: {
        tilemap: () => mockMap,
      },
    } as any;

    const grid = generateRoomGrid(42);
    const result = TilemapRenderer.renderLevel(mockScene, grid);

    expect(result).not.toBeNull();
    expect(excludedIndexes).toEqual([0, 4]);
  });
});

