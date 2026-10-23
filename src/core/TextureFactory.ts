import Phaser from 'phaser';
import { GAME_CONSTANTS } from '../config/GameConstants';

export class TextureFactory {
  public static generateAllTextures(scene: Phaser.Scene): void {
    if (!scene || !scene.textures) return;

    const game = scene.sys?.game;
    const createdDummyRenderer = game && !game.renderer;
    if (createdDummyRenderer) {
      (game as any).renderer = { blendModes: [] };
    }

    try {
      this.createPlayerTexture(scene);
      this.createTrooperTexture(scene);
      this.createTurretTexture(scene);
      this.createDroneTexture(scene);
      this.createJumperTexture(scene);
      this.createBossTexture(scene);

      this.createBulletTextures(scene);
      this.createCapsuleAndPickupTextures(scene);
      this.createTilesetTexture(scene);
      this.createCrosshairTexture(scene);
      this.createLogoTexture(scene);
      this.createRetroFontFallbackTexture(scene);
      this.createCyberHangarBgTexture(scene);
      this.createProjectilesFallbackTexture(scene);
      this.createPickupsFallbackTexture(scene);
      this.createExplosionTexture(scene);
      this.createBulletImpactFallbackTexture(scene);
      this.createAnimations(scene);
    } finally {
      if (createdDummyRenderer) {
        (game as any).renderer = null;
      }
    }
  }

  private static createPlayerTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_player')) return;
    const g = scene.add.graphics();
    // 23 frames of 24x24 = 552x24 total width
    for (let f = 0; f < 23; f++) {
      const ox = f * 24;

      if (f === 4 || f === 5) {
        // Prone / Crouch low crawl (Classic Contra flat ground pose)
        g.fillStyle(0xd01010, 1);
        g.fillRect(ox + 1, 12, 4, 2);
        g.fillStyle(0xff5555, 1);
        g.fillRect(ox + 4, 12, 3, 2);

        // Low head
        g.fillStyle(0x1e120a, 1);
        g.fillRect(ox + 7, 11, 6, 2);
        g.fillStyle(0xff1e1e, 1);
        g.fillRect(ox + 7, 12, 7, 2);
        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 8, 14, 6, 3);
        g.fillStyle(0x1a1a1a, 1);
        g.fillRect(ox + 11, 14, 2, 2);

        // Prone torso
        g.fillStyle(0x1e58e8, 1);
        g.fillRect(ox + 3, 16, 6, 3);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 5, 16, 2, 3);

        // Legs flat
        g.fillStyle(0xe5c28a, 1);
        g.fillRect(ox + 0, 18, 5, 3);
        g.fillStyle(0x302016, 1);
        g.fillRect(ox + 0, 20, 4, 3);

        // Grounded arm & low forward rifle
        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 9, 17, 5, 3);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 13, 17, 2, 3);
        g.fillStyle(0x707a8c, 1);
        g.fillRect(ox + 14, 17, 7, 3);
        g.fillStyle(0x00ffff, 1);
        g.fillRect(ox + 18, 16, 2, 2);

        if (f === 5) {
          // Prone flare
          g.fillStyle(0xffcc00, 1);
          g.fillRect(ox + 21, 16, 2, 5);
          g.fillStyle(0xffffff, 1);
          g.fillRect(ox + 21, 17, 3, 3);
        }
      } else if (f === 6 || f === 7) {
        // Aim Straight Up (90°)
        g.fillStyle(0xff1e1e, 1);
        g.fillRect(ox + 8, 4, 7, 2);
        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 8, 6, 7, 3);
        g.fillStyle(0x1e58e8, 1);
        g.fillRect(ox + 7, 9, 8, 7);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 8, 9, 2, 7);
        g.fillStyle(0xe5c28a, 1);
        g.fillRect(ox + 6, 16, 4, 5);
        g.fillRect(ox + 12, 16, 4, 5);
        g.fillStyle(0x302016, 1);
        g.fillRect(ox + 5, 20, 5, 4);
        g.fillRect(ox + 12, 20, 5, 4);

        // Arms & Vertical Rifle
        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 10, 8, 3, 4);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 10, 7, 3, 2);
        g.fillStyle(0x707a8c, 1);
        g.fillRect(ox + 11, 2, 3, 8);
        g.fillStyle(0x00ffff, 1);
        g.fillRect(ox + 14, 5, 2, 2);

        if (f === 7) {
          g.fillStyle(0xffcc00, 1);
          g.fillRect(ox + 10, 0, 5, 2);
          g.fillStyle(0xffffff, 1);
          g.fillRect(ox + 11, 0, 3, 3);
        }
      } else if (f === 8 || f === 9 || f === 15 || f === 16 || f === 17 || f === 18) {
        // Aim Diagonal Up (45°) Standing & Running
        g.fillStyle(0xff1e1e, 1);
        g.fillRect(ox + 8, 2, 8, 3);
        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 9, 5, 7, 4);
        g.fillStyle(0x1e58e8, 1);
        g.fillRect(ox + 8, 9, 8, 7);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 8, 9, 2, 7);

        // Legs (Standing: 8, 9; Run1: 15, 17; Run2: 16, 18)
        g.fillStyle(0xe5c28a, 1);
        if (f === 15 || f === 17) {
          g.fillRect(ox + 6, 16, 4, 5);
          g.fillRect(ox + 14, 16, 4, 4);
          g.fillStyle(0x302016, 1);
          g.fillRect(ox + 5, 20, 5, 4);
          g.fillRect(ox + 15, 19, 5, 4);
        } else if (f === 16 || f === 18) {
          g.fillRect(ox + 6, 16, 4, 4);
          g.fillRect(ox + 14, 16, 4, 5);
          g.fillStyle(0x302016, 1);
          g.fillRect(ox + 5, 19, 5, 4);
          g.fillRect(ox + 15, 20, 5, 4);
        } else {
          g.fillRect(ox + 7, 16, 4, 5);
          g.fillRect(ox + 13, 16, 4, 5);
          g.fillStyle(0x302016, 1);
          g.fillRect(ox + 6, 20, 5, 4);
          g.fillRect(ox + 13, 20, 5, 4);
        }

        // Diagonal Up Rifle
        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 11, 10, 4, 3);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 13, 9, 3, 3);
        g.fillStyle(0x707a8c, 1);
        g.fillRect(ox + 14, 8, 3, 3);
        g.fillRect(ox + 16, 6, 3, 3);
        g.fillRect(ox + 18, 4, 3, 3);
        g.fillStyle(0x00ffff, 1);
        g.fillRect(ox + 16, 4, 2, 2);

        if (f === 9 || f === 17 || f === 18) {
          g.fillStyle(0xffcc00, 1);
          g.fillRect(ox + 20, 2, 3, 3);
          g.fillStyle(0xffffff, 1);
          g.fillRect(ox + 21, 3, 2, 2);
        }
      } else if (f === 10 || f === 11 || f === 19 || f === 20 || f === 21 || f === 22) {
        // Aim Diagonal Down (45°) Standing & Running
        g.fillStyle(0xff1e1e, 1);
        g.fillRect(ox + 8, 2, 8, 3);
        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 9, 5, 7, 4);
        g.fillStyle(0x1e58e8, 1);
        g.fillRect(ox + 8, 9, 8, 7);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 8, 9, 2, 7);

        // Legs (Standing/Air: 10, 11; Run1: 19, 21; Run2: 20, 22)
        g.fillStyle(0xe5c28a, 1);
        if (f === 19 || f === 21) {
          g.fillRect(ox + 6, 16, 4, 5);
          g.fillRect(ox + 14, 16, 4, 4);
          g.fillStyle(0x302016, 1);
          g.fillRect(ox + 5, 20, 5, 4);
          g.fillRect(ox + 15, 19, 5, 4);
        } else if (f === 20 || f === 22) {
          g.fillRect(ox + 6, 16, 4, 4);
          g.fillRect(ox + 14, 16, 4, 5);
          g.fillStyle(0x302016, 1);
          g.fillRect(ox + 5, 19, 5, 4);
          g.fillRect(ox + 15, 20, 5, 4);
        } else {
          g.fillRect(ox + 7, 16, 4, 5);
          g.fillRect(ox + 13, 16, 4, 5);
          g.fillStyle(0x302016, 1);
          g.fillRect(ox + 6, 20, 5, 4);
          g.fillRect(ox + 13, 20, 5, 4);
        }

        // Diagonal Down Rifle
        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 11, 11, 4, 3);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 13, 12, 3, 3);
        g.fillStyle(0x707a8c, 1);
        g.fillRect(ox + 14, 13, 3, 3);
        g.fillRect(ox + 16, 15, 3, 3);
        g.fillRect(ox + 18, 17, 3, 3);
        g.fillStyle(0x00ffff, 1);
        g.fillRect(ox + 15, 12, 2, 2);

        if (f === 11 || f === 21 || f === 22) {
          g.fillStyle(0xffcc00, 1);
          g.fillRect(ox + 20, 18, 3, 3);
          g.fillStyle(0xffffff, 1);
          g.fillRect(ox + 21, 18, 2, 2);
        }
      } else if (f === 3) {
        // Jump
        g.fillStyle(0xff1e1e, 1);
        g.fillRect(ox + 8, 2, 8, 3);
        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 9, 5, 7, 4);
        g.fillStyle(0x1e58e8, 1);
        g.fillRect(ox + 8, 9, 8, 7);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 8, 9, 2, 7);
        g.fillStyle(0xe5c28a, 1);
        g.fillRect(ox + 7, 16, 5, 5);
        g.fillRect(ox + 13, 15, 5, 5);
        g.fillStyle(0x302016, 1);
        g.fillRect(ox + 6, 18, 5, 4);
        g.fillRect(ox + 13, 18, 5, 4);

        g.fillStyle(0xffcca0, 1);
        g.fillRect(ox + 11, 10, 4, 3);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 13, 10, 2, 3);
        g.fillStyle(0x707a8c, 1);
        g.fillRect(ox + 14, 10, 8, 3);
        g.fillStyle(0x00ffff, 1);
        g.fillRect(ox + 19, 9, 2, 2);
      } else {
        // Forward Frames: 0, 1, 2, 12, 13, 14
        g.fillStyle(0xff2222, 1);
        g.fillRect(ox + 8, 2, 8, 2);
        g.fillStyle(0xffcc99, 1);
        g.fillRect(ox + 8, 4, 8, 5);

        g.fillStyle(0x1e58e8, 1);
        g.fillRect(ox + 7, 9, 10, 7);
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 8, 9, 2, 7);

        g.fillStyle(0x2a2016, 1);
        g.fillRect(ox + 8, 15, 8, 2);

        g.fillStyle(0xe5c28a, 1);
        if (f === 1 || f === 13) {
          // Walk 1
          g.fillRect(ox + 6, 17, 5, 4);
          g.fillRect(ox + 13, 17, 5, 3);
          g.fillStyle(0x302016, 1);
          g.fillRect(ox + 5, 21, 5, 3);
          g.fillRect(ox + 14, 20, 5, 3);
        } else if (f === 2 || f === 14) {
          // Walk 2
          g.fillRect(ox + 6, 17, 5, 3);
          g.fillRect(ox + 13, 17, 5, 4);
          g.fillStyle(0x302016, 1);
          g.fillRect(ox + 5, 20, 5, 3);
          g.fillRect(ox + 14, 21, 5, 3);
        } else {
          // Idle (0) / Shoot (12)
          g.fillRect(ox + 7, 17, 4, 4);
          g.fillRect(ox + 13, 17, 4, 4);
          g.fillStyle(0x302016, 1);
          g.fillRect(ox + 6, 21, 5, 3);
          g.fillRect(ox + 13, 21, 5, 3);
        }

        // Gun & white wrist wrap
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 12, 11, 2, 3);
        g.fillStyle(0x707a8c, 1);
        g.fillRect(ox + 14, 11, 6, 3);
        if (f === 12 || f === 13 || f === 14) {
          g.fillStyle(0xffcc00, 1);
          g.fillRect(ox + 20, 11, 3, 3);
        }
      }
    }

    g.generateTexture('tex_player', 552, 24);
    g.destroy();

    const tex = scene.textures.get('tex_player');
    for (let i = 0; i < 23; i++) {
      tex.add(i, 0, i * 24, 0, 24, 24);
    }
  }

  private static createTrooperTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_trooper')) return;
    const g = scene.add.graphics();
    // 4 frames of 24x24 = 96x24
    for (let f = 0; f < 4; f++) {
      const ox = f * 24;
      g.fillStyle(0xee2222, 1); // Red alien armor
      g.fillRect(ox + 8, 2, 8, 6); // Helmet
      g.fillStyle(0x333333, 1);
      g.fillRect(ox + 8, 5, 8, 2); // Visor
      g.fillStyle(0xcc1111, 1);
      g.fillRect(ox + 7, 8, 10, 8); // Torso

      // Legs
      g.fillStyle(0x222222, 1);
      if (f === 0) {
        g.fillRect(ox + 6, 16, 5, 8);
        g.fillRect(ox + 13, 16, 5, 6);
      } else if (f === 1) {
        g.fillRect(ox + 6, 16, 5, 6);
        g.fillRect(ox + 13, 16, 5, 8);
      } else {
        g.fillRect(ox + 7, 16, 4, 7);
        g.fillRect(ox + 13, 16, 4, 7);
      }
    }
    g.generateTexture('tex_enemy_trooper', 96, 24);
    g.destroy();

    const tex = scene.textures.get('tex_enemy_trooper');
    for (let f = 0; f < 4; f++) {
      tex.add(f, 0, f * 24, 0, 24, 24);
    }
  }

  private static createTurretTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_turret')) return;
    const g = scene.add.graphics();
    // 2 frames of 32x24 = 64x24
    for (let f = 0; f < 2; f++) {
      const ox = f * 32;
      g.fillStyle(0x555555, 1);
      g.fillRect(ox + 2, 12, 20, 12); // Base
      g.fillStyle(0x777777, 1);
      g.fillRect(ox + 4, 4, 16, 10); // Barrel mount
      g.fillStyle(0xff2222, 1);
      g.fillRect(ox + 10, 6, 4, 4); // Red Lens
      g.fillStyle(0x222222, 1);
      g.fillRect(ox + 0, 7, 6, 4); // Barrel extension
      if (f === 1) {
        g.fillStyle(0xffcc00, 1);
        g.fillRect(ox + 24, 6, 6, 6); // Muzzle flash
      }
    }
    g.generateTexture('tex_enemy_turret', 64, 24);
    g.destroy();

    const tex = scene.textures.get('tex_enemy_turret');
    tex.add(0, 0, 0, 0, 32, 24);
    tex.add(1, 0, 32, 0, 32, 24);
  }

  private static createDroneTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_drone')) return;
    const g = scene.add.graphics();
    // 4 frames of 32x20 = 128x20
    for (let f = 0; f < 4; f++) {
      const ox = f * 32;
      g.fillStyle(0xeecc00, 1); // Yellow body
      g.fillRect(ox + 10, 4, 12, 8);
      g.fillStyle(0x00ffff, 1); // Cyan eye
      g.fillRect(ox + 14, 6, 4, 4);
      // Wings
      g.fillStyle(0x888888, 1);
      const wingY = f % 2 === 0 ? 3 : 5;
      g.fillRect(ox + 4, wingY, 6, 4);
      g.fillRect(ox + 22, wingY, 6, 4);
    }
    g.generateTexture('tex_enemy_drone', 128, 20);
    g.destroy();

    const tex = scene.textures.get('tex_enemy_drone');
    for (let f = 0; f < 4; f++) {
      tex.add(f, 0, f * 32, 0, 32, 20);
    }
  }

  private static createJumperTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_jumper')) return;
    const g = scene.add.graphics();
    // 4 frames of 24x28 = 96x28
    for (let f = 0; f < 4; f++) {
      const ox = f * 24;
      g.fillStyle(0x8822aa, 1); // Purple
      g.fillRect(ox + 8, 2, 8, 6);
      g.fillStyle(0x00ff66, 1); // Green visor
      g.fillRect(ox + 9, 4, 6, 2);
      g.fillStyle(0x661188, 1);
      g.fillRect(ox + 7, 8, 10, 8);
      g.fillStyle(0x330044, 1);
      g.fillRect(ox + 6, 16, 12, 8);
    }
    g.generateTexture('tex_enemy_jumper', 96, 28);
    g.destroy();

    const tex = scene.textures.get('tex_enemy_jumper');
    for (let f = 0; f < 4; f++) {
      tex.add(f, 0, f * 24, 0, 24, 28);
    }
  }

  private static createBossTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_boss')) return;
    const g = scene.add.graphics();
    // 4 frames of 64x64 = 256x64
    for (let f = 0; f < 4; f++) {
      const ox = f * 64;
      g.fillStyle(0x444455, 1);
      g.fillRect(ox + 0, 16, 64, 48); // Armor plate chassis
      const coreColor = f % 2 === 0 ? 0xff1133 : 0xff5577;
      g.fillStyle(coreColor, 1);
      g.fillRect(ox + 24, 24, 16, 16); // Glowing red reactor core
      g.fillStyle(0x222222, 1);
      g.fillRect(ox + 4, 44, 16, 10); // Left cannon
      g.fillRect(ox + 44, 44, 16, 10); // Right cannon
    }
    g.generateTexture('tex_enemy_boss', 256, 64);
    g.destroy();

    const tex = scene.textures.get('tex_enemy_boss');
    for (let f = 0; f < 4; f++) {
      tex.add(f, 0, f * 64, 0, 64, 64);
    }
  }

  private static createBulletTextures(scene: Phaser.Scene): void {
    if (!scene.textures.exists('tex_bullet_pea')) {
      const g = scene.add.graphics();
      g.fillStyle(0xffff00, 1);
      g.fillCircle(3, 3, 3);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(3, 3, 1);
      g.generateTexture('tex_bullet_pea', 6, 6);
      g.destroy();
    }

    if (!scene.textures.exists('tex_bullet_spread')) {
      const g = scene.add.graphics();
      g.fillStyle(0x00ffff, 1);
      g.fillRect(0, 0, 8, 8);
      g.fillStyle(0xffffff, 1);
      g.fillRect(2, 2, 4, 4);
      g.generateTexture('tex_bullet_spread', 8, 8);
      g.destroy();
    }

    if (!scene.textures.exists('tex_bullet_laser')) {
      const g = scene.add.graphics();
      g.fillStyle(0x3388ff, 1);
      g.fillRect(0, 0, 24, 6);
      g.fillStyle(0xffffff, 1);
      g.fillRect(2, 2, 20, 2);
      g.generateTexture('tex_bullet_laser', 24, 6);
      g.destroy();
    }

    if (!scene.textures.exists('tex_bullet_flame')) {
      const g = scene.add.graphics();
      g.fillStyle(0xff4400, 1);
      g.fillCircle(7, 7, 7);
      g.fillStyle(0xffbb00, 1);
      g.fillCircle(7, 7, 4);
      g.generateTexture('tex_bullet_flame', 14, 14);
      g.destroy();
    }

    if (!scene.textures.exists('tex_bullet_enemy')) {
      const g = scene.add.graphics();
      g.fillStyle(0xff0033, 1);
      g.fillCircle(4, 4, 4);
      g.fillStyle(0xffcccc, 1);
      g.fillCircle(4, 4, 2);
      g.generateTexture('tex_bullet_enemy', 8, 8);
      g.destroy();
    }
  }

  private static createCapsuleAndPickupTextures(scene: Phaser.Scene): void {
    if (!scene.textures.exists('tex_capsule_flying')) {
      const g = scene.add.graphics();
      for (let f = 0; f < 2; f++) {
        const ox = f * 16;
        g.fillStyle(0xcccccc, 1);
        g.fillRect(ox + 2, 4, 12, 8);
        g.fillStyle(0xff2222, 1);
        if (f === 0) {
          g.fillRect(ox + 4, 4, 4, 8);
        } else {
          g.fillRect(ox + 8, 4, 4, 8);
        }
      }
      g.generateTexture('tex_capsule_flying', 32, 16);
      g.destroy();

      const tex = scene.textures.get('tex_capsule_flying');
      tex.add(0, 0, 0, 0, 16, 16);
      tex.add(1, 0, 16, 0, 16, 16);
    }

    const icons: { [key: string]: { color: number; label: string } } = {
      S: { color: 0x00ffff, label: 'S' },
      L: { color: 0x3388ff, label: 'L' },
      F: { color: 0xff4400, label: 'F' },
      M: { color: 0xffff00, label: 'M' },
      B: { color: 0xff44aa, label: 'B' },
    };

    Object.entries(icons).forEach(([key, val]) => {
      const texKey = `tex_pickup_${key}`;
      if (!scene.textures.exists(texKey)) {
        const g = scene.add.graphics();
        g.fillStyle(val.color, 1);
        g.fillRect(1, 1, 14, 14);
        g.fillStyle(0x000000, 1);
        g.fillRect(5, 4, 6, 8); // Simplified letter box
        g.generateTexture(texKey, 16, 16);
        g.destroy();
      }
    });
  }

  private static createAnimations(scene: Phaser.Scene): void {
    if (!scene.anims) return;

    if (!scene.anims.exists('player_idle')) {
      scene.anims.create({
        key: 'player_idle',
        frames: [{ key: 'tex_player', frame: 0 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_run')) {
      scene.anims.create({
        key: 'player_run',
        frames: scene.anims.generateFrameNumbers('tex_player', { start: 1, end: 2 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('player_run_shoot')) {
      scene.anims.create({
        key: 'player_run_shoot',
        frames: [{ key: 'tex_player', frame: 13 }, { key: 'tex_player', frame: 14 }],
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('player_run_up')) {
      scene.anims.create({
        key: 'player_run_up',
        frames: [{ key: 'tex_player', frame: 15 }, { key: 'tex_player', frame: 16 }],
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('player_run_shoot_up')) {
      scene.anims.create({
        key: 'player_run_shoot_up',
        frames: [{ key: 'tex_player', frame: 17 }, { key: 'tex_player', frame: 18 }],
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('player_run_down')) {
      scene.anims.create({
        key: 'player_run_down',
        frames: [{ key: 'tex_player', frame: 19 }, { key: 'tex_player', frame: 20 }],
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('player_run_shoot_down')) {
      scene.anims.create({
        key: 'player_run_shoot_down',
        frames: [{ key: 'tex_player', frame: 21 }, { key: 'tex_player', frame: 22 }],
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('player_jump')) {
      scene.anims.create({
        key: 'player_jump',
        frames: [{ key: 'tex_player', frame: 3 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_crouch')) {
      scene.anims.create({
        key: 'player_crouch',
        frames: [{ key: 'tex_player', frame: 4 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_crouch_shoot')) {
      scene.anims.create({
        key: 'player_crouch_shoot',
        frames: [{ key: 'tex_player', frame: 5 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_aim_up')) {
      scene.anims.create({
        key: 'player_aim_up',
        frames: [{ key: 'tex_player', frame: 6 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_shoot_up')) {
      scene.anims.create({
        key: 'player_shoot_up',
        frames: [{ key: 'tex_player', frame: 7 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_aim_up_forward')) {
      scene.anims.create({
        key: 'player_aim_up_forward',
        frames: [{ key: 'tex_player', frame: 8 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_shoot_up_forward')) {
      scene.anims.create({
        key: 'player_shoot_up_forward',
        frames: [{ key: 'tex_player', frame: 9 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_aim_down_forward')) {
      scene.anims.create({
        key: 'player_aim_down_forward',
        frames: [{ key: 'tex_player', frame: 10 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_shoot_down_forward')) {
      scene.anims.create({
        key: 'player_shoot_down_forward',
        frames: [{ key: 'tex_player', frame: 11 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('player_shoot_forward')) {
      scene.anims.create({
        key: 'player_shoot_forward',
        frames: [{ key: 'tex_player', frame: 12 }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('trooper_run')) {
      scene.anims.create({
        key: 'trooper_run',
        frames: scene.anims.generateFrameNumbers('tex_enemy_trooper', { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('drone_fly')) {
      scene.anims.create({
        key: 'drone_fly',
        frames: scene.anims.generateFrameNumbers('tex_enemy_drone', { start: 0, end: 1 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('jumper_jump')) {
      scene.anims.create({
        key: 'jumper_jump',
        frames: scene.anims.generateFrameNumbers('tex_enemy_jumper', { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('boss_drive')) {
      scene.anims.create({
        key: 'boss_drive',
        frames: scene.anims.generateFrameNumbers('tex_enemy_boss', { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('capsule_spin')) {
      const hasPickups = scene.textures?.exists('tex_pickups');
      const capsuleKey = hasPickups ? 'tex_pickups' : 'tex_capsule_flying';
      scene.anims.create({
        key: 'capsule_spin',
        frames: scene.anims.generateFrameNumbers(capsuleKey, { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('enemy_explosion')) {
      scene.anims.create({
        key: 'enemy_explosion',
        frames: scene.anims.generateFrameNumbers('tex_explosion', { start: 0, end: 3 }),
        frameRate: 16,
        repeat: 0,
      });
    }

    if (!scene.anims.exists('bullet_impact_spark')) {
      scene.anims.create({
        key: 'bullet_impact_spark',
        frames: scene.anims.generateFrameNumbers('tex_bullet_impact', { start: 0, end: 3 }),
        frameRate: 24,
        repeat: 0,
      });
    }
  }

  private static createExplosionTexture(scene: Phaser.Scene): void {
    if (!scene.textures || scene.textures.exists('tex_explosion')) return;
    const g = scene.add.graphics();
    // 4 frames of 20x20 = 80x20
    for (let f = 0; f < 4; f++) {
      const ox = f * 20;
      if (f === 0) {
        // Frame 0: White core flash star
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 8, 8, 4, 4);
        g.fillRect(ox + 6, 9, 8, 2);
        g.fillRect(ox + 9, 6, 2, 8);
      } else if (f === 1) {
        // Frame 1: Expanding yellow & white burst
        g.fillStyle(0xffff00, 1);
        g.fillCircle(ox + 10, 10, 7);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ox + 10, 10, 4);
      } else if (f === 2) {
        // Frame 2: Orange/red fire ring & debris sparks
        g.fillStyle(0xff4400, 1);
        g.fillCircle(ox + 10, 10, 8);
        g.fillStyle(0xffbb00, 1);
        g.fillCircle(ox + 10, 10, 5);
        // Sparks
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 2, 3, 2, 2);
        g.fillRect(ox + 16, 4, 2, 2);
        g.fillRect(ox + 3, 15, 2, 2);
        g.fillRect(ox + 15, 14, 2, 2);
      } else {
        // Frame 3: Dissipating dark smoke & embers
        g.fillStyle(0x555566, 0.7);
        g.fillCircle(ox + 10, 10, 6);
        g.fillStyle(0xff6600, 0.8);
        g.fillRect(ox + 5, 6, 2, 2);
        g.fillRect(ox + 13, 7, 2, 2);
        g.fillRect(ox + 8, 13, 2, 2);
      }
    }
    g.generateTexture('tex_explosion', 80, 20);
    g.destroy();

    const tex = scene.textures.get('tex_explosion');
    if (tex && typeof tex.add === 'function') {
      for (let f = 0; f < 4; f++) {
        tex.add(f, 0, f * 20, 0, 20, 20);
      }
    }
  }

  private static createBulletImpactFallbackTexture(scene: Phaser.Scene): void {
    if (!scene.textures || scene.textures.exists('tex_bullet_impact')) return;
    const g = scene.add.graphics();
    // 4 frames of 16x16 = 64x16
    for (let f = 0; f < 4; f++) {
      const ox = f * 16;
      if (f === 0) {
        // Frame 0: White core pinpoint flash star
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 7, 7, 2, 2);
        g.fillRect(ox + 5, 8, 6, 1);
        g.fillRect(ox + 8, 5, 1, 6);
      } else if (f === 1) {
        // Frame 1: Expanding yellow & white diamond spark
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 7, 8, 3, 1);
        g.fillRect(ox + 8, 7, 1, 3);
        g.fillStyle(0xffff00, 1);
        g.fillRect(ox + 6, 8, 5, 1);
        g.fillRect(ox + 8, 6, 1, 5);
        g.fillStyle(0xffaa00, 1);
        g.fillRect(ox + 8, 3, 1, 3);
        g.fillRect(ox + 8, 11, 1, 3);
        g.fillRect(ox + 3, 8, 3, 1);
        g.fillRect(ox + 11, 8, 3, 1);
      } else if (f === 2) {
        // Frame 2: 4-corner ricochet embers
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 4, 4, 1, 1);
        g.fillRect(ox + 12, 4, 1, 1);
        g.fillStyle(0xffaa00, 1);
        g.fillRect(ox + 5, 5, 1, 1);
        g.fillRect(ox + 11, 5, 1, 1);
        g.fillRect(ox + 4, 12, 1, 1);
        g.fillRect(ox + 12, 12, 1, 1);
        g.fillStyle(0xff6600, 1);
        g.fillRect(ox + 5, 11, 1, 1);
        g.fillRect(ox + 11, 11, 1, 1);
        g.fillStyle(0xff4400, 1);
        g.fillRect(ox + 7, 8, 1, 1);
        g.fillRect(ox + 9, 8, 1, 1);
      } else {
        // Frame 3: Dissipating ember dust
        g.fillStyle(0xffaa00, 1);
        g.fillRect(ox + 3, 3, 1, 1);
        g.fillRect(ox + 13, 3, 1, 1);
        g.fillStyle(0xff6600, 1);
        g.fillRect(ox + 2, 13, 1, 1);
        g.fillRect(ox + 14, 13, 1, 1);
        g.fillStyle(0xff8800, 1);
        g.fillRect(ox + 7, 6, 1, 1);
        g.fillStyle(0xff4400, 1);
        g.fillRect(ox + 9, 10, 1, 1);
      }
    }
    g.generateTexture('tex_bullet_impact', 64, 16);
    g.destroy();

    const tex = scene.textures.get('tex_bullet_impact');
    if (tex && typeof tex.add === 'function') {
      for (let f = 0; f < 4; f++) {
        tex.add(f, 0, f * 16, 0, 16, 16);
      }
    }
  }

  private static createTilesetTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tileset')) return;
    const g = scene.add.graphics();

    // Tile 0 (0..15): Empty space (keep transparent)

    // Tile 1 (16..31): Ground / Floor block
    g.fillStyle(0x2e354f, 1); // Dark metallic blue base
    g.fillRect(16, 0, 16, 16);
    g.fillStyle(0x5b6585, 1); // Top edge highlight
    g.fillRect(16, 0, 16, 2);
    g.fillStyle(0x1a1e2d, 1); // Bottom shadow
    g.fillRect(16, 14, 16, 2);
    g.fillStyle(0x8899bb, 1); // Corner rivets
    g.fillRect(18, 3, 2, 2);
    g.fillRect(28, 3, 2, 2);
    g.fillRect(18, 10, 2, 2);
    g.fillRect(28, 10, 2, 2);

    // Tile 2 (32..47): One-way platform / bridge girder
    g.fillStyle(0x445566, 1);
    g.fillRect(32, 2, 16, 4);
    g.fillStyle(0x00ccdd, 1); // Cyan top glow edge
    g.fillRect(32, 0, 16, 2);
    g.fillStyle(0x223344, 1);
    g.fillRect(34, 6, 3, 6);
    g.fillRect(43, 6, 3, 6);

    // Tile 3 (48..63): Wall pillar / armor plate
    g.fillStyle(0x3a2e48, 1); // Dark purple steel
    g.fillRect(48, 0, 16, 16);
    g.fillStyle(0x5c4970, 1);
    g.fillRect(48, 0, 2, 16);
    g.fillRect(62, 0, 2, 16);

    // Tile 4 (64..79): Level Exit Door / Portal
    g.fillStyle(0x00ff88, 1); // Bright green frame
    g.fillRect(64, 0, 16, 16);
    g.fillStyle(0xffff44, 1); // Yellow inner door
    g.fillRect(66, 2, 12, 12);
    g.fillStyle(0x00ffff, 1); // Cyan portal core
    g.fillRect(68, 4, 8, 8);

    g.generateTexture('tileset', 80, 16);
    g.destroy();
  }

  private static createCrosshairTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_crosshair')) return;
    const g = scene.add.graphics();
    // 9x9 crosshair with dark shadow outline and bright cyan reticle
    g.fillStyle(0x000000, 0.7);
    g.fillRect(3, 0, 3, 4); // top outline
    g.fillRect(3, 5, 3, 4); // bottom outline
    g.fillRect(0, 3, 4, 3); // left outline
    g.fillRect(5, 3, 4, 3); // right outline

    g.fillStyle(0x00ffff, 1.0); // Neon cyan
    g.fillRect(4, 1, 1, 2); // top tick
    g.fillRect(4, 6, 1, 2); // bottom tick
    g.fillRect(1, 4, 2, 1); // left tick
    g.fillRect(6, 4, 2, 1); // right tick
    g.fillRect(4, 4, 1, 1); // center dot

    g.generateTexture('tex_crosshair', 9, 9);
    g.destroy();
  }

  private static createLogoTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('logo')) return;
    const g = scene.add.graphics();
    g.fillStyle(0xff8800, 1);
    g.fillRect(0, 0, 200, 50);
    g.fillStyle(0xffffff, 1);
    g.fillRect(4, 4, 192, 42);
    g.generateTexture('logo', 200, 50);
    g.destroy();
  }

  private static createRetroFontFallbackTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('retro_font')) return;
    const g = scene.add.graphics();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :!?.,-+_/[]()%\'"❤∞★█░';
    const glyphs: Record<string, string[]> = {
      A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
      B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
      C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
      D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
      E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
      F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
      G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
      H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
      I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
      J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
      K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
      L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
      M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
      N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
      O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
      P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
      Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
      R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
      S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
      T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
      U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
      V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
      W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
      X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
      Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
      Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
      '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
      '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
      '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
      '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
      '4': ['10010', '10010', '10010', '11111', '00010', '00010', '00010'],
      '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
      '6': ['01111', '10000', '10000', '11110', '10001', '10001', '01110'],
      '7': ['11111', '00001', '00010', '00100', '00100', '00100', '00100'],
      '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
      '9': ['01110', '10001', '10001', '01111', '00001', '00001', '11110'],
      ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
      ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
      '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
      '?': ['01110', '10001', '00010', '00100', '00100', '00000', '00100'],
      '.': ['00000', '00000', '00000', '00000', '00000', '00100', '00100'],
      ',': ['00000', '00000', '00000', '00000', '00100', '00100', '01000'],
      '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
      '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
      '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
      '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
      '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
      ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
      '(': ['00110', '01000', '01000', '01000', '01000', '01000', '00110'],
      ')': ['01100', '00010', '00010', '00010', '00010', '00010', '01100'],
      '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
      "'": ['00100', '00100', '00000', '00000', '00000', '00000', '00000'],
      '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
      '❤': ['01010', '11111', '11111', '11111', '01110', '00100', '00000'],
      '∞': ['00000', '01010', '10101', '10101', '01010', '00000', '00000'],
      '★': ['00100', '00100', '11111', '01110', '01010', '10001', '00000'],
      '█': ['11111', '11111', '11111', '11111', '11111', '11111', '11111'],
      '░': ['10101', '01010', '10101', '01010', '10101', '01010', '10101'],
    };

    const isSet = (glyph: string[], gx: number, gy: number) =>
      gy >= 0 && gy < 7 && gx >= 0 && gx < 5 && glyph[gy][gx] === '1';

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const glyph = glyphs[ch] || glyphs[' '];
      const cellX = i * 7;

      // Row 0 (y = 0..8): 1px black outline
      g.fillStyle(0x000000, 1);
      for (let gy = -1; gy <= 7; gy++) {
        for (let gx = -1; gx <= 5; gx++) {
          if (isSet(glyph, gx, gy)) continue;
          let hasNeighbor = false;
          for (let dy = -1; dy <= 1 && !hasNeighbor; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (isSet(glyph, gx + dx, gy + dy)) {
                hasNeighbor = true;
                break;
              }
            }
          }
          if (hasNeighbor) {
            g.fillRect(cellX + gx + 1, gy + 1, 1, 1);
          }
        }
      }

      // Row 1 (y = 9..17): White foreground glyph
      g.fillStyle(0xffffff, 1);
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (glyph[gy][gx] === '1') {
            g.fillRect(cellX + gx + 1, 9 + gy + 1, 1, 1);
          }
        }
      }
    }

    g.generateTexture('retro_font', 406, 18);
    g.destroy();
  }

  private static createCyberHangarBgTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('cyber_hangar_bg')) return;
    const g = scene.add.graphics();
    const w = GAME_CONSTANTS.VIEW_WIDTH_PX;
    const h = GAME_CONSTANTS.VIEW_HEIGHT_PX;

    // Dark cosmic base void
    g.fillStyle(0x070914, 1);
    g.fillRect(0, 0, w, h);

    // Subtle cosmic nebula clouds (deep violet and muted teal) evenly covering canvas
    g.fillStyle(0x201230, 0.28);
    g.fillCircle(120, 90, 110);
    g.fillCircle(380, 100, 120);
    g.fillCircle(200, 240, 115);
    g.fillCircle(440, 230, 110);
    g.fillStyle(0x0a1e26, 0.22);
    g.fillCircle(340, 200, 85);
    g.fillCircle(150, 180, 80);
    g.fillCircle(480, 70, 85);

    // Subtle star clusters
    g.fillStyle(0x7788aa, 0.8);
    for (let i = 0; i < 40; i++) {
      const x = (i * 73 + 17) % w;
      const y = (i * 47 + 23) % h;
      g.fillRect(x, y, 1, 1);
    }
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 15; i++) {
      const x = (i * 137 + 41) % w;
      const y = (i * 89 + 11) % h;
      g.fillRect(x, y, 1, 1);
    }

    g.generateTexture('cyber_hangar_bg', w, h);
    g.destroy();
  }

  private static createProjectilesFallbackTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_projectiles')) return;
    const g = scene.add.graphics();
    g.fillStyle(0xffff00, 1);
    g.fillRect(0, 0, 80, 16);
    g.generateTexture('tex_projectiles', 80, 16);
    g.destroy();

    const tex = scene.textures.get('tex_projectiles');
    if (tex && typeof tex.add === 'function') {
      for (let i = 0; i < 5; i++) {
        tex.add(i, 0, i * 16, 0, 16, 16);
      }
    }
  }

  private static createPickupsFallbackTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_pickups')) return;
    const g = scene.add.graphics();
    g.fillStyle(0x00ffff, 1);
    g.fillRect(0, 0, 112, 16);
    g.generateTexture('tex_pickups', 112, 16);
    g.destroy();

    const tex = scene.textures.get('tex_pickups');
    if (tex && typeof tex.add === 'function') {
      for (let i = 0; i < 7; i++) {
        tex.add(i, 0, i * 16, 0, 16, 16);
      }
    }
  }
}
