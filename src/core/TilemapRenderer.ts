import Phaser from 'phaser';
import { GridCell } from './GridGenerator';
import { getRoomTemplateById } from './RoomTemplate';

export interface TilemapRenderResult {
  tilemap: Phaser.Tilemaps.Tilemap;
  groundLayer: Phaser.Tilemaps.TilemapLayer;
}

export function stitchGridTilemap(
  grid: GridCell[][],
  roomWidthTiles: number = 20,
  roomHeightTiles: number = 15
): number[][] {
  const gridRows = grid.length;
  const gridCols = grid[0]?.length || 0;
  const totalRows = gridRows * roomHeightTiles;
  const totalCols = gridCols * roomWidthTiles;

  const fullMatrix: number[][] = Array.from({ length: totalRows }, () =>
    new Array(totalCols).fill(0)
  );

  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const cell = grid[gy][gx];
      if (cell.type === 'EMPTY' || !cell.templateId) {
        continue;
      }

      const template = getRoomTemplateById(cell.templateId);
      if (!template || !template.tiles) continue;

      const startRow = gy * roomHeightTiles;
      const startCol = gx * roomWidthTiles;

      for (let r = 0; r < roomHeightTiles; r++) {
        for (let c = 0; c < roomWidthTiles; c++) {
          if (template.tiles[r] && template.tiles[r][c] !== undefined) {
            fullMatrix[startRow + r][startCol + c] = template.tiles[r][c];
          }
        }
      }
    }
  }

  return fullMatrix;
}

export class TilemapRenderer {
  public static renderLevel(
    scene: Phaser.Scene,
    grid: GridCell[][],
    tilesetKey: string = 'tileset',
    tileWidth: number = 16,
    tileHeight: number = 16
  ): TilemapRenderResult | null {
    if (!scene || !scene.make || typeof scene.make.tilemap !== 'function') {
      return null;
    }

    const tileData = stitchGridTilemap(grid);

    const map = scene.make.tilemap({
      data: tileData,
      tileWidth,
      tileHeight,
    });

    let tileset = map.addTilesetImage(tilesetKey, tilesetKey, tileWidth, tileHeight);
    if (!tileset) {
      tileset = map.addTilesetImage('tileset') || null;
    }

    const groundLayer = map.createLayer(0, tileset || tilesetKey, 0, 0);
    if (groundLayer && typeof groundLayer.forEachTile === 'function') {
      groundLayer.forEachTile((tile) => {
        if (tile.index === 1 || tile.index === 3) {
          tile.setCollision(true, true, true, true); // Solid walls & floor
        } else if (tile.index === 2) {
          // One-way platform: collideUp = true (land on top), collideDown = false (pass up through)
          tile.setCollision(false, false, true, false);
        } else {
          tile.setCollision(false, false, false, false);
        }
      });
    } else if (groundLayer) {
      groundLayer.setCollisionByExclusion([0]);
    }

    return {
      tilemap: map,
      groundLayer: groundLayer!,
    };
  }
}
