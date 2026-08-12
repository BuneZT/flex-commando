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
  private activeBounds: RoomBounds;

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
    this.activeBounds = { x: 0, y: 0, width: roomWidthPx, height: roomHeightPx };
    this.setRoom(startGridX, startGridY, true);
  }

  private updateActiveBounds(): void {
    this.activeBounds.x = this.currentGridX * this.roomWidthPx;
    this.activeBounds.y = this.currentGridY * this.roomHeightPx;
    this.activeBounds.width = this.roomWidthPx;
    this.activeBounds.height = this.roomHeightPx;
  }

  public getCurrentRoom(): { gridX: number; gridY: number } {
    return { gridX: this.currentGridX, gridY: this.currentGridY };
  }

  public getActiveBounds(): RoomBounds {
    return this.activeBounds;
  }

  public isTransitioning(): boolean {
    return this.isTransitioningState;
  }

  public setRoom(gridX: number, gridY: number, immediate: boolean = true): void {
    this.currentGridX = gridX;
    this.currentGridY = gridY;
    this.updateActiveBounds();
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
    const threshold = 16;
    let newGridX = this.currentGridX;
    let newGridY = this.currentGridY;

    const left = this.currentGridX * this.roomWidthPx;
    const right = (this.currentGridX + 1) * this.roomWidthPx;
    const top = this.currentGridY * this.roomHeightPx;
    const bottom = (this.currentGridY + 1) * this.roomHeightPx;

    if (targetX < left - threshold) {
      newGridX = Math.floor(targetX / this.roomWidthPx);
    } else if (targetX > right + threshold) {
      newGridX = Math.floor(targetX / this.roomWidthPx);
    }

    if (targetY < top - threshold) {
      newGridY = Math.floor(targetY / this.roomHeightPx);
    } else if (targetY > bottom + threshold) {
      newGridY = Math.floor(targetY / this.roomHeightPx);
    }

    if (newGridX !== this.currentGridX || newGridY !== this.currentGridY) {
      this.transitionToRoom(newGridX, newGridY);
    }
  }

  public transitionToRoom(gridX: number, gridY: number, duration: number = 400): void {
    const fromGridX = this.currentGridX;
    const fromGridY = this.currentGridY;

    this.currentGridX = gridX;
    this.currentGridY = gridY;
    this.updateActiveBounds();
    const bounds = getRoomBounds(gridX, gridY, this.roomWidthPx, this.roomHeightPx);
    const targetCenterX = bounds.x + bounds.width / 2;
    const targetCenterY = bounds.y + bounds.height / 2;

    if (!this.camera) return;

    this.isTransitioningState = true;

    const minGridX = Math.min(fromGridX, gridX);
    const maxGridX = Math.max(fromGridX, gridX);
    const minGridY = Math.min(fromGridY, gridY);
    const maxGridY = Math.max(fromGridY, gridY);

    const unionX = minGridX * this.roomWidthPx;
    const unionY = minGridY * this.roomHeightPx;
    const unionWidth = (maxGridX - minGridX + 1) * this.roomWidthPx;
    const unionHeight = (maxGridY - minGridY + 1) * this.roomHeightPx;

    if (typeof this.camera.setBounds === 'function') {
      this.camera.setBounds(unionX, unionY, unionWidth, unionHeight);
    }

    if (typeof this.camera.pan === 'function') {
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

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
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

