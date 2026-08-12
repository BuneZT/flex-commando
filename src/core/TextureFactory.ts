import Phaser from 'phaser';

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
    // 5 frames of 16x24 = 80x24 total width
    for (let f = 0; f < 5; f++) {
      const ox = f * 16;
      // Headband & Head
      g.fillStyle(0xcc3333, 1);
      g.fillRect(ox + 4, 2, 8, 2);
      g.fillStyle(0xffcc99, 1);
      g.fillRect(ox + 4, 4, 8, 5);

      // Uniform Body
      g.fillStyle(0x3366cc, 1);
      g.fillRect(ox + 3, 9, 10, 8);

      // Legs / Animation offset
      g.fillStyle(0x112244, 1);
      if (f === 3) {
        // Crouch
        g.fillRect(ox + 2, 14, 12, 6);
      } else if (f === 1) {
        // Walk 1
        g.fillRect(ox + 2, 17, 5, 7);
        g.fillRect(ox + 9, 17, 5, 5);
      } else if (f === 2) {
        // Walk 2
        g.fillRect(ox + 2, 17, 5, 5);
        g.fillRect(ox + 9, 17, 5, 7);
      } else {
        // Idle / Jump
        g.fillRect(ox + 3, 17, 4, 7);
        g.fillRect(ox + 9, 17, 4, 7);
      }

      // Gun
      g.fillStyle(0xaaaaaa, 1);
      g.fillRect(ox + 10, 11, 6, 3);
    }

    g.generateTexture('tex_player', 80, 24);
    g.destroy();

    const tex = scene.textures.get('tex_player');
    for (let i = 0; i < 5; i++) {
      tex.add(i, 0, i * 16, 0, 16, 24);
    }
  }

  private static createTrooperTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_trooper')) return;
    const g = scene.add.graphics();
    // 2 frames of 16x24 = 32x24
    for (let f = 0; f < 2; f++) {
      const ox = f * 16;
      g.fillStyle(0xee2222, 1); // Red alien armor
      g.fillRect(ox + 4, 2, 8, 6); // Helmet
      g.fillStyle(0x333333, 1);
      g.fillRect(ox + 4, 5, 8, 2); // Visor
      g.fillStyle(0xcc1111, 1);
      g.fillRect(ox + 3, 8, 10, 8); // Torso

      // Legs
      g.fillStyle(0x222222, 1);
      if (f === 0) {
        g.fillRect(ox + 2, 16, 5, 8);
        g.fillRect(ox + 9, 16, 5, 6);
      } else {
        g.fillRect(ox + 2, 16, 5, 6);
        g.fillRect(ox + 9, 16, 5, 8);
      }
    }
    g.generateTexture('tex_enemy_trooper', 32, 24);
    g.destroy();

    const tex = scene.textures.get('tex_enemy_trooper');
    tex.add(0, 0, 0, 0, 16, 24);
    tex.add(1, 0, 16, 0, 16, 24);
  }

  private static createTurretTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_turret')) return;
    const g = scene.add.graphics();
    g.fillStyle(0x555555, 1);
    g.fillRect(2, 12, 20, 12); // Base
    g.fillStyle(0x777777, 1);
    g.fillRect(4, 4, 16, 10); // Barrel mount
    g.fillStyle(0xff2222, 1);
    g.fillRect(10, 6, 4, 4); // Red Lens
    g.fillStyle(0x222222, 1);
    g.fillRect(0, 7, 6, 4); // Barrel extension
    g.generateTexture('tex_enemy_turret', 24, 24);
    g.destroy();
  }

  private static createDroneTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_drone')) return;
    const g = scene.add.graphics();
    // 2 frames of 16x16 = 32x16
    for (let f = 0; f < 2; f++) {
      const ox = f * 16;
      g.fillStyle(0xeecc00, 1); // Yellow body
      g.fillRect(ox + 4, 4, 8, 8);
      g.fillStyle(0x00ffff, 1); // Cyan eye
      g.fillRect(ox + 7, 6, 3, 3);
      // Wings
      g.fillStyle(0x888888, 1);
      const wingY = f === 0 ? 2 : 4;
      g.fillRect(ox + 1, wingY, 3, 4);
      g.fillRect(ox + 12, wingY, 3, 4);
    }
    g.generateTexture('tex_enemy_drone', 32, 16);
    g.destroy();

    const tex = scene.textures.get('tex_enemy_drone');
    tex.add(0, 0, 0, 0, 16, 16);
    tex.add(1, 0, 16, 0, 16, 16);
  }

  private static createJumperTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_jumper')) return;
    const g = scene.add.graphics();
    // 2 frames of 16x24 = 32x24
    for (let f = 0; f < 2; f++) {
      const ox = f * 16;
      g.fillStyle(0x8822aa, 1); // Purple
      g.fillRect(ox + 4, 2, 8, 6);
      g.fillStyle(0x00ff66, 1); // Green visor
      g.fillRect(ox + 5, 4, 6, 2);
      g.fillStyle(0x661188, 1);
      g.fillRect(ox + 3, 8, 10, 8);
      g.fillStyle(0x330044, 1);
      g.fillRect(ox + 2, 16, 12, 8);
    }
    g.generateTexture('tex_enemy_jumper', 32, 24);
    g.destroy();

    const tex = scene.textures.get('tex_enemy_jumper');
    tex.add(0, 0, 0, 0, 16, 24);
    tex.add(1, 0, 16, 0, 16, 24);
  }

  private static createBossTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('tex_enemy_boss')) return;
    const g = scene.add.graphics();
    g.fillStyle(0x444455, 1);
    g.fillRect(0, 0, 64, 48); // Armor plate chassis
    g.fillStyle(0xff1133, 1);
    g.fillRect(24, 16, 16, 16); // Glowing red reactor core
    g.fillStyle(0x222222, 1);
    g.fillRect(4, 36, 16, 10); // Left cannon
    g.fillRect(44, 36, 16, 10); // Right cannon
    g.generateTexture('tex_enemy_boss', 64, 48);
    g.destroy();
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

    if (!scene.anims.exists('player_jump')) {
      scene.anims.create({
        key: 'player_jump',
        frames: [{ key: 'tex_player', frame: 4 }],
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

    if (!scene.anims.exists('capsule_spin')) {
      scene.anims.create({
        key: 'capsule_spin',
        frames: scene.anims.generateFrameNumbers('tex_capsule_flying', { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1,
      });
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
}

