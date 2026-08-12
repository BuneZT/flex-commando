import Phaser from 'phaser';

export interface RoomBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getRoomBounds(
  gridX: number,
  gridY: number,
  roomWidthPx: number = 320,
  roomHeightPx: number = 240
): RoomBounds {
  return {
    x: gridX * roomWidthPx,
    y: gridY * roomHeightPx,
    width: roomWidthPx,
    height: roomHeightPx,
  };
}

export class CameraManager {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private currentGridX: number = 0;
  private currentGridY: number = 0;
  private roomWidthPx: number;
  private roomHeightPx: number;
  private isTransitioningState: boolean = false;

  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    startGridX: number = 0,
    startGridY: number = 0,
    roomWidthPx: number = 320,
    roomHeightPx: number = 240
  ) {
    this.camera = camera;
    this.roomWidthPx = roomWidthPx;
    this.roomHeightPx = roomHeightPx;
    this.setRoom(startGridX, startGridY, true);
  }

  public getCurrentRoom(): { gridX: number; gridY: number } {
    return { gridX: this.currentGridX, gridY: this.currentGridY };
  }

  public getActiveBounds(): RoomBounds {
    return getRoomBounds(this.currentGridX, this.currentGridY, this.roomWidthPx, this.roomHeightPx);
  }

  public isTransitioning(): boolean {
    return this.isTransitioningState;
  }

  public setRoom(gridX: number, gridY: number, immediate: boolean = true): void {
    this.currentGridX = gridX;
    this.currentGridY = gridY;
    const bounds = getRoomBounds(gridX, gridY, this.roomWidthPx, this.roomHeightPx);

    if (this.camera) {
      if (typeof this.camera.setBounds === 'function') {
        this.camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      if (immediate && typeof this.camera.centerOn === 'function') {
        this.camera.centerOn(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      }
    }
  }

  public update(targetX: number, targetY: number): void {
    const newGridX = Math.floor(targetX / this.roomWidthPx);
    const newGridY = Math.floor(targetY / this.roomHeightPx);

    if (newGridX !== this.currentGridX || newGridY !== this.currentGridY) {
      this.transitionToRoom(newGridX, newGridY);
    }
  }

  public transitionToRoom(gridX: number, gridY: number, duration: number = 400): void {
    this.currentGridX = gridX;
    this.currentGridY = gridY;
    const bounds = getRoomBounds(gridX, gridY, this.roomWidthPx, this.roomHeightPx);
    const targetCenterX = bounds.x + bounds.width / 2;
    const targetCenterY = bounds.y + bounds.height / 2;

    if (!this.camera) return;

    this.isTransitioningState = true;

    if (typeof this.camera.pan === 'function') {
      if (typeof this.camera.removeBounds === 'function') {
        this.camera.removeBounds();
      }
      this.camera.pan(targetCenterX, targetCenterY, duration, 'Power2', false, (_cam: any, progress: number) => {
        if (progress === 1) {
          this.isTransitioningState = false;
          if (typeof this.camera.setBounds === 'function') {
            this.camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
          }
        }
      });
    } else {
      this.setRoom(gridX, gridY, true);
      this.isTransitioningState = false;
    }
  }

  public cullEnemies<T extends {
    x: number;
    y: number;
    isAlive: boolean;
    setActive: (active: boolean) => any;
    setVisible: (visible: boolean) => any;
    body?: any;
  }>(enemies: T[], outArray?: T[]): T[] {
    const activeEnemies = outArray || [];
    activeEnemies.length = 0;

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;

      const enemyGridX = Math.floor(enemy.x / this.roomWidthPx);
      const enemyGridY = Math.floor(enemy.y / this.roomHeightPx);

      const isActiveRoom = enemyGridX === this.currentGridX && enemyGridY === this.currentGridY;

      enemy.setActive(isActiveRoom);
      enemy.setVisible(isActiveRoom);
      if (enemy.body) {
        enemy.body.enable = isActiveRoom;
      }
      if (isActiveRoom) {
        activeEnemies.push(enemy);
      }
    }
    return activeEnemies;
  }
}

