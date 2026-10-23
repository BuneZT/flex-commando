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
      'retro_font',
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
      'tex_explosion',
      'tex_bullet_impact',
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

  it('does not call scene.add.graphics() when all 15 static textures preloaded by BootScene already exist', () => {
    const preloadedKeys = [
      'logo',
      'retro_font',
      'cyber_hangar_bg',
      'tileset',
      'tex_player',
      'tex_enemy_trooper',
      'tex_enemy_turret',
      'tex_enemy_drone',
      'tex_enemy_jumper',
      'tex_enemy_boss',
      'tex_crosshair',
      'tex_projectiles',
      'tex_pickups',
      'tex_explosion',
      'tex_bullet_impact',
    ];

    for (const key of preloadedKeys) {
      if (!scene.textures.exists(key)) {
        const canvas = document.createElement('canvas');
        canvas.width = 552;
        canvas.height = 64;
        const tex = scene.textures.addCanvas(key, canvas);
        if (tex) {
          for (let f = 0; f < 23; f++) {
            tex.add(f, 0, f * 16, 0, 16, 16);
          }
        }
      }
    }

    let graphicsCalls = 0;
    const origGraphics = scene.add.graphics.bind(scene.add);
    scene.add.graphics = ((...args: any[]) => {
      graphicsCalls++;
      return origGraphics(...args);
    }) as any;

    TextureFactory.generateAllTextures(scene);

    expect(graphicsCalls).toBe(0);
  });
});
