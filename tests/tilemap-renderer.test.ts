import { describe, it, expect } from 'vitest';
import { getRoomBounds, CameraManager } from '../src/core/CameraManager';
import { stitchGridTilemap } from '../src/core/TilemapRenderer';
import { generateRoomGrid } from '../src/core/GridGenerator';

describe('getRoomBounds', () => {
  it('should calculate pixel bounds for room at grid (1, 2)', () => {
    // 20 tiles * 16px = 320px width; 15 tiles * 16px = 240px height
    const bounds = getRoomBounds(1, 2, 320, 240);
    expect(bounds.x).toBe(320);
    expect(bounds.y).toBe(480);
    expect(bounds.width).toBe(320);
    expect(bounds.height).toBe(240);
  });

  it('should calculate pixel bounds with default room dimensions for origin (0, 0)', () => {
    const bounds = getRoomBounds(0, 0);
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(320);
    expect(bounds.height).toBe(240);
  });

  it('should calculate pixel bounds for room at grid (3, 3)', () => {
    const bounds = getRoomBounds(3, 3, 320, 240);
    expect(bounds.x).toBe(960);
    expect(bounds.y).toBe(720);
    expect(bounds.width).toBe(320);
    expect(bounds.height).toBe(240);
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
    expect(manager.getActiveBounds()).toEqual({ x: 320, y: 480, width: 320, height: 240 });
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

    // Player moves to room (1, 0) (x = 350 >= 320)
    manager.update(350, 100);
    expect(manager.getCurrentRoom()).toEqual({ gridX: 1, gridY: 0 });
  });
});

describe('stitchGridTilemap', () => {
  it('should stitch 4x4 room grid into an 80x60 tile matrix', () => {
    const grid = generateRoomGrid(12345);
    const tileMatrix = stitchGridTilemap(grid, 20, 15);

    expect(tileMatrix.length).toBe(60); // 4 * 15
    expect(tileMatrix[0].length).toBe(80); // 4 * 20
  });

  it('should populate non-empty room tiles into the stitched matrix', () => {
    const grid = generateRoomGrid(12345);
    const tileMatrix = stitchGridTilemap(grid, 20, 15);

    // Find a non-empty cell in grid
    const nonEmpty = grid.flat().find((c) => c.type !== 'EMPTY');
    expect(nonEmpty).toBeDefined();

    if (nonEmpty) {
      const startRow = nonEmpty.y * 15;
      const startCol = nonEmpty.x * 20;
      // Bottom row of any room template should have ground tiles (value 1)
      const bottomRowTile = tileMatrix[startRow + 14][startCol];
      expect(bottomRowTile).toBe(1);
    }
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
});
