import Phaser from 'phaser';

export class ImpactFXPool {
  public scene: Phaser.Scene;
  public pool: Phaser.GameObjects.Sprite[] = [];
  public maxSize: number;

  constructor(scene: Phaser.Scene, maxSize: number = 25) {
    this.scene = scene;
    this.maxSize = maxSize;
  }

  /**
   * Spawns an impact spark at (x, y) using a recyclable sprite.
   * Plays 'bullet_impact_spark' animation and returns to pool on completion.
   */
  public spawn(x: number, y: number): Phaser.GameObjects.Sprite | null {
    if (!this.scene || !this.scene.add || typeof this.scene.add.sprite !== 'function') {
      return null;
    }

    let sprite: Phaser.GameObjects.Sprite | undefined = undefined;

    // Search for an inactive sprite in the pool
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        sprite = this.pool[i];
        break;
      }
    }

    // Allocate a new sprite if under maxSize
    if (!sprite && this.pool.length < this.maxSize) {
      sprite = this.scene.add.sprite(x, y, 'tex_bullet_impact');
      if (sprite) {
        this.pool.push(sprite);
      }
    }

    if (!sprite) {
      return null;
    }

    // Position and activate
    if (typeof sprite.setPosition === 'function') {
      sprite.setPosition(x, y);
    } else {
      sprite.x = x;
      sprite.y = y;
    }

    if (typeof sprite.setDepth === 'function') {
      sprite.setDepth(50);
    }

    if (typeof sprite.setActive === 'function') {
      sprite.setActive(true);
    } else {
      sprite.active = true;
    }

    if (typeof sprite.setVisible === 'function') {
      sprite.setVisible(true);
    } else {
      sprite.visible = true;
    }

    // Play impact animation and deactivate on completion
    if (sprite.anims && typeof sprite.anims.play === 'function') {
      sprite.anims.play('bullet_impact_spark');
    }

    if (typeof sprite.once === 'function') {
      sprite.once('animationcomplete', () => {
        if (typeof sprite.setActive === 'function') {
          sprite.setActive(false);
        } else {
          sprite.active = false;
        }

        if (typeof sprite.setVisible === 'function') {
          sprite.setVisible(false);
        } else {
          sprite.visible = false;
        }
      });
    }

    return sprite;
  }

  /**
   * Deactivates and hides all sprites in the pool.
   */
  public clear(): void {
    for (let i = 0; i < this.pool.length; i++) {
      const sprite = this.pool[i];
      if (typeof sprite.setActive === 'function') {
        sprite.setActive(false);
      } else {
        sprite.active = false;
      }

      if (typeof sprite.setVisible === 'function') {
        sprite.setVisible(false);
      } else {
        sprite.visible = false;
      }
    }
  }
}
