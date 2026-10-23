import Phaser from 'phaser';
import { SoundManager } from './SoundManager';

export class CombatFX {
  /**
   * Applies a solid white silhouette flash to a target sprite for durationMs.
   */
  public static applyHitFlash(
    target: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite | any,
    durationMs: number = 90
  ): void {
    if (!target) return;

    if (typeof target.setTintFill === 'function') {
      target.setTintFill(0xffffff);
    }

    const scene = target.scene;
    if (scene?.time && typeof scene.time.delayedCall === 'function') {
      scene.time.delayedCall(durationMs, () => {
        if (target && target.active && typeof target.clearTint === 'function') {
          target.clearTint();
        }
      });
    }
  }

  /**
   * Safely triggers a camera shake on the scene's main camera.
   */
  public static triggerScreenShake(
    scene: Phaser.Scene | any,
    durationMs: number = 150,
    intensity: number = 0.008
  ): void {
    if (scene?.cameras?.main && typeof scene.cameras.main.shake === 'function') {
      scene.cameras.main.shake(durationMs, intensity);
    }
  }

  /**
   * Spawns an animated retro explosion at (x, y) that destroys itself when finished.
   */
  public static spawnDeathExplosion(
    scene: Phaser.Scene | any,
    x: number,
    y: number,
    scale: number = 1.0
  ): Phaser.GameObjects.Sprite | null {
    if (!scene || !scene.add || typeof scene.add.sprite !== 'function') {
      return null;
    }

    SoundManager.getInstance().playSfx('explosion');

    const explosion = scene.add.sprite(x, y, 'tex_explosion');
    if (!explosion) return null;

    if (typeof explosion.setDepth === 'function') {
      explosion.setDepth(50);
    }

    if (scale !== 1.0 && typeof explosion.setScale === 'function') {
      explosion.setScale(scale);
    }

    if (explosion.anims && typeof explosion.anims.play === 'function') {
      explosion.anims.play('enemy_explosion');
      if (typeof explosion.once === 'function') {
        explosion.once('animationcomplete', () => {
          if (typeof explosion.destroy === 'function') {
            explosion.destroy();
          }
        });
      }
    } else if (typeof explosion.destroy === 'function') {
      explosion.destroy();
    }

    return explosion;
  }

  /**
   * Plays a dramatic multi-burst explosion & screen-shake sequence around the dying player.
   */
  public static spawnPlayerDeathSequence(
    scene: Phaser.Scene | any,
    player: { x: number; y: number }
  ): void {
    if (!scene || !player) return;

    this.triggerScreenShake(scene, 250, 0.012);
    this.spawnDeathExplosion(scene, player.x, player.y, 1.3);

    if (scene.time && typeof scene.time.delayedCall === 'function') {
      scene.time.delayedCall(250, () => {
        SoundManager.getInstance().resetThrottle();
        this.spawnDeathExplosion(scene, player.x - 6, player.y - 4, 1.1);
      });
      scene.time.delayedCall(500, () => {
        SoundManager.getInstance().resetThrottle();
        this.spawnDeathExplosion(scene, player.x + 6, player.y + 2, 1.4);
      });
    }
  }
}
