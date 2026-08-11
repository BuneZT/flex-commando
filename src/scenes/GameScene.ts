import Phaser from 'phaser';
import { generateRoomGrid, GridCell } from '../core/GridGenerator';
import { TilemapRenderer, TilemapRenderResult } from '../core/TilemapRenderer';
import { CameraManager } from '../core/CameraManager';
import { Player } from '../entities/Player';
import { Controls } from '../config/Controls';

export class GameScene extends Phaser.Scene {
  public grid?: GridCell[][];
  public tilemapResult?: TilemapRenderResult | null;
  public cameraManager?: CameraManager;
  public player?: Player;
  public controls?: Controls;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // 1. Generate room grid
    this.grid = generateRoomGrid(12345);

    // 2. Render tilemap
    this.tilemapResult = TilemapRenderer.renderLevel(this, this.grid);

    // 3. Find START room cell
    const startRoom = this.grid.flat().find((cell) => cell.type === 'START') || { x: 0, y: 0 };

    // 4. Position player in START room
    const startX = startRoom.x * 320 + 160;
    const startY = startRoom.y * 240 + 180;
    this.player = new Player(this, startX, startY);

    // 5. Setup collision with tilemap ground layer
    if (this.tilemapResult?.groundLayer) {
      this.physics.add.collider(this.player, this.tilemapResult.groundLayer);
    }

    // 6. Initialize camera manager focused on START room
    this.cameraManager = new CameraManager(this.cameras.main, startRoom.x, startRoom.y);

    // 7. Initialize user controls if input keyboard is available
    if (this.input && this.input.keyboard) {
      this.controls = new Controls(this);
    }
  }

  update(time: number, delta: number): void {
    if (this.controls && this.player) {
      const input = this.controls.getInputState();
      this.player.updatePlayer(input, delta);
    }

    if (this.player && this.cameraManager) {
      this.cameraManager.update(this.player.x, this.player.y);
    }
  }
}
