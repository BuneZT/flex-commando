import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { AnimationFactory } from '../src/core/AnimationFactory';

describe('AnimationFactory', () => {
  let game: Phaser.Game;
  let scene: Phaser.Scene;

  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      game = new Phaser.Game({
        type: Phaser.HEADLESS,
        scene: {
          create() {
            scene = this;
            const texConfigs: Record<string, number> = {
              tex_player: 23,
              tex_enemy_trooper: 2,
              tex_enemy_drone: 2,
              tex_enemy_jumper: 2,
              tex_enemy_boss: 2,
              tex_capsule_flying: 2,
              tex_pickups: 8,
              tex_explosion: 4,
              tex_bullet_impact: 4,
              tex_laser_barrier: 4,
            };
            for (const [key, frameCount] of Object.entries(texConfigs)) {
              if (!this.textures.exists(key)) {
                const canvas = document.createElement('canvas');
                canvas.width = 16 * frameCount;
                canvas.height = 16;
                const tex = this.textures.addCanvas(key, canvas);
                if (tex) {
                  for (let f = 0; f < frameCount; f++) {
                    tex.add(f, 0, f * 16, 0, 16, 16);
                  }
                }
              }
            }
            resolve();
          },
        },
      });
    });
  });

  it('registers all 24 required animations in Phaser.Animations.AnimationManager', () => {
    AnimationFactory.registerAnimations(scene);

    const animKeys = [
      'player_idle',
      'player_run',
      'player_run_shoot',
      'player_run_up',
      'player_run_shoot_up',
      'player_run_down',
      'player_run_shoot_down',
      'player_jump',
      'player_crouch',
      'player_crouch_shoot',
      'player_aim_up',
      'player_shoot_up',
      'player_aim_up_forward',
      'player_shoot_up_forward',
      'player_aim_down_forward',
      'player_shoot_down_forward',
      'player_shoot_forward',
      'trooper_run',
      'drone_fly',
      'jumper_jump',
      'boss_drive',
      'capsule_spin',
      'enemy_explosion',
      'bullet_impact_spark',
      'laser_barrier_pulse',
    ];

    expect(animKeys).toHaveLength(25);
    animKeys.forEach((key) => {
      expect(scene.anims.exists(key), `Expected animation '${key}' to exist`).toBe(true);
    });
  });

  it('is idempotent when registerAnimations is called multiple times', () => {
    expect(() => {
      AnimationFactory.registerAnimations(scene);
      AnimationFactory.registerAnimations(scene);
    }).not.toThrow();
  });
});
