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
      this.createCrosshairTexture(scene);
      this.createLogoTexture(scene);
      this.createCyberHangarBgTexture(scene);
      this.createProjectilesFallbackTexture(scene);
      this.createPickupsFallbackTexture(scene);
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
    // 6 frames of 24x24 = 144x24 total width
    for (let f = 0; f < 6; f++) {
      const ox = f * 24;
      // Headband & Head
      g.fillStyle(0xcc3333, 1);
      g.fillRect(ox + 8, 2, 8, 2);
      g.fillStyle(0xffcc99, 1);
      g.fillRect(ox + 8, 4, 8, 5);

      // Uniform Body
      g.fillStyle(0x3366cc, 1);
      g.fillRect(ox + 7, 9, 10, 8);

      // Legs / Animation offset
      g.fillStyle(0x112244, 1);
      if (f === 4) {
        // Crouch
        g.fillRect(ox + 6, 16, 12, 6);
      } else if (f === 1) {
        // Walk 1
        g.fillRect(ox + 6, 17, 5, 7);
        g.fillRect(ox + 13, 17, 5, 5);
      } else if (f === 2) {
        // Walk 2
        g.fillRect(ox + 6, 17, 5, 5);
        g.fillRect(ox + 13, 17, 5, 7);
      } else if (f === 3) {
        // Jump
        g.fillRect(ox + 7, 16, 4, 5);
        g.fillRect(ox + 13, 15, 4, 5);
      } else {
        // Idle (0) / Shoot (5)
        g.fillRect(ox + 7, 17, 4, 7);
        g.fillRect(ox + 13, 17, 4, 7);
      }

      // Gun
      g.fillStyle(0xaaaaaa, 1);
      g.fillRect(ox + 14, 11, 6, 3);
      if (f === 5) {
        g.fillStyle(0xffcc00, 1);
        g.fillRect(ox + 20, 11, 3, 3);
      }
    }

    g.generateTexture('tex_player', 144, 24);
    g.destroy();

    const tex = scene.textures.get('tex_player');
    for (let i = 0; i < 6; i++) {
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

  private static createCyberHangarBgTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('cyber_hangar_bg')) return;
    const g = scene.add.graphics();
    g.fillStyle(0x0e111a, 1);
    g.fillRect(0, 0, 320, 240);
    g.generateTexture('cyber_hangar_bg', 320, 240);
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
