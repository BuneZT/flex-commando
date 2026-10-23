import { GAME_CONSTANTS } from '../config/GameConstants';

export type BarrierDirection = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export interface BarrierConfig {
  direction: BarrierDirection;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoomDoors {
  north?: boolean;
  south?: boolean;
  east?: boolean;
  west?: boolean;
}

export interface EntitySpatialState {
  x: number;
  y: number;
  isAlive: boolean;
}

/**
 * Calculates world coordinates and bounding boxes for barrier doors in a given room.
 */
export function getRoomDoorBarriers(
  gridX: number,
  gridY: number,
  doors: RoomDoors,
  roomWidthPx: number = GAME_CONSTANTS.VIEW_WIDTH_PX,
  roomHeightPx: number = GAME_CONSTANTS.VIEW_HEIGHT_PX
): BarrierConfig[] {
  const originX = gridX * roomWidthPx;
  const originY = gridY * roomHeightPx;
  const barriers: BarrierConfig[] = [];

  // West door: rows 11-16 (height 96), col 0 matches wall width (16px)
  if (doors.west) {
    barriers.push({
      direction: 'WEST',
      x: originX + 8,
      y: originY + 224,
      width: 16,
      height: 96,
    });
  }

  // East door: rows 11-16 (height 96), col 31 matches wall width (16px)
  if (doors.east) {
    barriers.push({
      direction: 'EAST',
      x: originX + 504,
      y: originY + 224,
      width: 16,
      height: 96,
    });
  }

  // North door: row 0 (height 16), cols 14-17 (width 64)
  if (doors.north) {
    barriers.push({
      direction: 'NORTH',
      x: originX + 256,
      y: originY + 8,
      width: 64,
      height: 16,
    });
  }

  // South door: row 17 (height 16), cols 14-17 (width 64)
  if (doors.south) {
    barriers.push({
      direction: 'SOUTH',
      x: originX + 256,
      y: originY + 280,
      width: 64,
      height: 16,
    });
  }

  return barriers;
}

/**
 * Returns all currently living enemies located inside the specified room cell.
 */
export function getLivingEnemiesInRoom<T extends EntitySpatialState>(
  enemies: T[],
  gridX: number,
  gridY: number,
  roomWidthPx: number = GAME_CONSTANTS.VIEW_WIDTH_PX,
  roomHeightPx: number = GAME_CONSTANTS.VIEW_HEIGHT_PX
): T[] {
  return enemies.filter((enemy) => {
    if (!enemy.isAlive) return false;
    const enemyGridX = Math.floor(enemy.x / roomWidthPx);
    const enemyGridY = Math.floor(enemy.y / roomHeightPx);
    return enemyGridX === gridX && enemyGridY === gridY;
  });
}

/**
 * Checks whether the specified room is cleared of hostile enemies.
 * An empty room or a room where all enemies are dead returns true.
 */
export function isRoomCleared(
  enemies: EntitySpatialState[],
  gridX: number,
  gridY: number,
  roomWidthPx: number = GAME_CONSTANTS.VIEW_WIDTH_PX,
  roomHeightPx: number = GAME_CONSTANTS.VIEW_HEIGHT_PX
): boolean {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.isAlive) {
      const enemyGridX = Math.floor(enemy.x / roomWidthPx);
      const enemyGridY = Math.floor(enemy.y / roomHeightPx);
      if (enemyGridX === gridX && enemyGridY === gridY) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Clamps player coordinates safely inside the room interior.
 */
export function clampPlayerInsideRoom(
  playerX: number,
  playerY: number,
  gridX: number,
  gridY: number,
  roomWidthPx: number = GAME_CONSTANTS.VIEW_WIDTH_PX,
  roomHeightPx: number = GAME_CONSTANTS.VIEW_HEIGHT_PX,
  margin: number = 24
): { x: number; y: number } {
  const minX = gridX * roomWidthPx + margin;
  const maxX = (gridX + 1) * roomWidthPx - margin;
  const minY = gridY * roomHeightPx + margin;
  const maxY = (gridY + 1) * roomHeightPx - margin;

  return {
    x: Math.max(minX, Math.min(maxX, playerX)),
    y: Math.max(minY, Math.min(maxY, playerY)),
  };
}
