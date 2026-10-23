import { describe, it, expect } from 'vitest';
import {
  getRoomDoorBarriers,
  isRoomCleared,
  getLivingEnemiesInRoom,
  clampPlayerInsideRoom,
} from '../src/core/RoomLockdown';

describe('RoomLockdown pure module', () => {
  it('returns correct barrier configs for all 4 doors', () => {
    const barriers = getRoomDoorBarriers(1, 1, { north: true, south: true, east: true, west: true });
    expect(barriers).toHaveLength(4);

    const west = barriers.find(b => b.direction === 'WEST');
    expect(west).toBeDefined();
    expect(west?.x).toBe(512 + 8);
    expect(west?.y).toBe(288 + 224);
    expect(west?.width).toBe(16);
    expect(west?.height).toBe(96);

    const east = barriers.find(b => b.direction === 'EAST');
    expect(east).toBeDefined();
    expect(east?.x).toBe(512 + 504);
    expect(east?.y).toBe(288 + 224);
    expect(east?.width).toBe(16);
    expect(east?.height).toBe(96);

    const north = barriers.find(b => b.direction === 'NORTH');
    expect(north).toBeDefined();
    expect(north?.x).toBe(512 + 256);
    expect(north?.y).toBe(288 + 8);
    expect(north?.width).toBe(64);
    expect(north?.height).toBe(16);

    const south = barriers.find(b => b.direction === 'SOUTH');
    expect(south).toBeDefined();
    expect(south?.x).toBe(512 + 256);
    expect(south?.y).toBe(288 + 280);
    expect(south?.width).toBe(64);
    expect(south?.height).toBe(16);
  });

  it('only returns barriers for open doors', () => {
    const barriers = getRoomDoorBarriers(0, 0, { north: false, south: true, east: true, west: false });
    expect(barriers).toHaveLength(2);
    expect(barriers.map(b => b.direction)).toEqual(['EAST', 'SOUTH']);
  });

  it('correctly determines if room is cleared', () => {
    const enemies = [
      { x: 100, y: 100, isAlive: true }, // Room (0, 0)
      { x: 600, y: 100, isAlive: false }, // Room (1, 0)
    ];

    expect(isRoomCleared(enemies, 0, 0)).toBe(false);
    expect(isRoomCleared(enemies, 1, 0)).toBe(true);
    expect(isRoomCleared(enemies, 2, 2)).toBe(true); // Empty room
  });

  it('filters living enemies in specific room', () => {
    const e1 = { x: 100, y: 100, isAlive: true };
    const e2 = { x: 200, y: 100, isAlive: true };
    const e3 = { x: 150, y: 100, isAlive: false };
    const e4 = { x: 600, y: 100, isAlive: true };

    const living = getLivingEnemiesInRoom([e1, e2, e3, e4], 0, 0);
    expect(living).toEqual([e1, e2]);
  });

  it('clamps player coordinates inside room bounds', () => {
    // Room (1, 1) has bounds [512..1024, 288..576]
    const clampedWest = clampPlayerInsideRoom(515, 400, 1, 1, 512, 288, 24);
    expect(clampedWest.x).toBe(512 + 24);

    const clampedEast = clampPlayerInsideRoom(1020, 400, 1, 1, 512, 288, 24);
    expect(clampedEast.x).toBe(1024 - 24);

    const clampedNorth = clampPlayerInsideRoom(700, 290, 1, 1, 512, 288, 20);
    expect(clampedNorth.y).toBe(288 + 20);

    const clampedSouth = clampPlayerInsideRoom(700, 574, 1, 1, 512, 288, 20);
    expect(clampedSouth.y).toBe(576 - 20);
  });
});
