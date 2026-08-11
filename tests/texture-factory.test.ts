import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { TextureFactory } from '../src/core/TextureFactory';

describe('TextureFactory', () => {
  let game: Phaser.Game;
  let scene: Phaser.Scene;

  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      game = new Phaser.Game({
        type: Phaser.HEADLESS,
        scene: {
          create() {
            scene = this;
            resolve();
          },
        },
        callbacks: {
          postBoot: () => {},
        },
      });
    });
  });

  it('registers all required texture keys in Phaser.Textures.TextureManager', () => {
    TextureFactory.generateAllTextures(scene);

    const keys = [
      'tex_player',
      'tex_enemy_trooper',
      'tex_enemy_turret',
      'tex_enemy_drone',
      'tex_enemy_jumper',
      'tex_enemy_boss',
      'tex_bullet_pea',
      'tex_bullet_spread',
      'tex_bullet_laser',
      'tex_bullet_flame',
      'tex_bullet_enemy',
      'tex_capsule_flying',
      'tex_pickup_S',
      'tex_pickup_L',
      'tex_pickup_F',
      'tex_pickup_M',
      'tex_pickup_B',
      'tileset',
    ];

    keys.forEach((key) => {
      expect(scene.textures.exists(key)).toBe(true);
    });
  });
});
