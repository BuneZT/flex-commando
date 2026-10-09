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
      'logo',
      'cyber_hangar_bg',
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
      'tex_crosshair',
      'tex_projectiles',
      'tex_pickups',
    ];

    keys.forEach((key) => {
      expect(scene.textures.exists(key)).toBe(true);
    });
  });

  it('registers all required animations in Phaser.Animations.AnimationManager', () => {
    TextureFactory.generateAllTextures(scene);

    const animKeys = [
      'player_idle',
      'player_run',
      'player_jump',
      'player_crouch',
      'trooper_run',
      'drone_fly',
      'jumper_jump',
      'boss_drive',
      'capsule_spin',
    ];

    animKeys.forEach((key) => {
      expect(scene.anims.exists(key)).toBe(true);
    });
  });

  it('does not overwrite existing textures if already present in TextureManager', () => {
    const customCanvas = document.createElement('canvas');
    customCanvas.width = 10;
    customCanvas.height = 10;
    const existingTexture = scene.textures.addCanvas('logo', customCanvas);

    TextureFactory.generateAllTextures(scene);

    // Reference must remain identical to pre-existing texture
    expect(scene.textures.get('logo')).toBe(existingTexture);
  });
});
