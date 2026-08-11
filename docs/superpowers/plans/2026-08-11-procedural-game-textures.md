# Procedural Game Textures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate distinct procedural pixel-art sprite textures and animations for player, enemies, bullets, and pickups at boot time, replacing missing visual assets.

**Architecture:** A centralized `TextureFactory` utility renders pixel patterns onto Phaser Graphics textures during `BootScene` initialization and registers texture keys and animation clips into Phaser's Texture and Animation Managers.

**Tech Stack:** TypeScript, Phaser 3, Vitest.

## Global Constraints

- Must work seamlessly with Phaser 3 Headless / Arcade physics environment.
- Must generate textures cleanly without external PNG dependencies.

---

### Task 1: Create Centralized `TextureFactory` Module

**Files:**
- Create: `src/core/TextureFactory.ts`
- Test: `tests/texture-factory.test.ts`

**Interfaces:**
- Consumes: `Phaser.Scene`
- Produces: `TextureFactory.generateAllTextures(scene: Phaser.Scene): void`

- [ ] **Step 1: Write the failing unit test for `TextureFactory`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { TextureFactory } from '../src/core/TextureFactory';

describe('TextureFactory', () => {
  let game: Phaser.Game;
  let scene: Phaser.Scene;

  beforeEach((done) => {
    game = new Phaser.Game({
      type: Phaser.HEADLESS,
      scene: {
        create() {
          scene = this;
          done();
        },
      },
      callbacks: {
        postBoot: () => {},
      },
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
    ];

    keys.forEach((key) => {
      expect(scene.textures.exists(key)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/texture-factory.test.ts`
Expected: FAIL with "Cannot find module '../src/core/TextureFactory'"

- [ ] **Step 3: Implement `TextureFactory.ts`**

```typescript
import Phaser from 'phaser';

export class TextureFactory {
  public static generateAllTextures(scene: Phaser.Scene): void {
    if (!scene || !scene.textures) return;

    this.createPlayerTexture(scene);
    this.createTrooperTexture(scene);
    this.createTurretTexture(scene);
    this.createDroneTexture(scene);
    this.createJumperTexture(scene);
    this.createBossTexture(scene);

    this.createBulletTextures(scene);
    this.createCapsuleAndPickupTextures(scene);
    this.createAnimations(scene);
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

    if (!scene.anims.exists('player_crouch')) {
      scene.anims.create({
        key: 'player_crouch',
        frames: [{ key: 'tex_player', frame: 3 }],
        frameRate: 1,
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
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/texture-factory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add src/core/TextureFactory.ts tests/texture-factory.test.ts
git commit -m "feat: add TextureFactory module for procedural sprite and animation generation"
```

---

### Task 2: Integrate `TextureFactory` into `BootScene` and Update `Player` & Enemies

**Files:**
- Modify: `src/scenes/BootScene.ts:1-16`
- Modify: `src/entities/Player.ts:23-38` and `100-170`
- Modify: `src/entities/enemies/Trooper.ts`
- Modify: `src/entities/enemies/Turret.ts`
- Modify: `src/entities/enemies/FalconDrone.ts`
- Modify: `src/entities/enemies/JumperMercenary.ts`
- Modify: `src/entities/enemies/Boss.ts`
- Test: `tests/player.test.ts`, `tests/enemy.test.ts`

- [ ] **Step 1: Write failing test in `tests/player.test.ts` checking texture assignment**

```typescript
// Update tests/player.test.ts to verify player texture is set to 'tex_player'
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/player.test.ts`

- [ ] **Step 3: Update `BootScene.ts` and Entity Constructors**

In `BootScene.ts`:
Call `TextureFactory.generateAllTextures(this);` inside `create()`.

In `Player.ts`:
Set default texture parameter to `'tex_player'`. In `updatePlayer()`, play `'player_run'`, `'player_crouch'`, `'player_jump'`, or `'player_idle'` based on state, and set `this.setFlipX(this.facingLeft)`.

In enemy classes (`Trooper.ts`, `Turret.ts`, etc.):
Set their default texture to `'tex_enemy_trooper'`, `'tex_enemy_turret'`, etc., and play their respective animations.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/player.test.ts tests/enemy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add src/scenes/BootScene.ts src/entities/Player.ts src/entities/enemies/
git commit -m "feat: bind procedural textures and animations to Player and Enemy entities"
```

---

### Task 3: Update `ProjectilePool` and `PickupCapsule` Textures

**Files:**
- Modify: `src/weapons/ProjectilePool.ts:27-62`
- Modify: `src/entities/PickupCapsule.ts`
- Test: `tests/weapons.test.ts`

- [ ] **Step 1: Update `ProjectilePool.ts` to assign weapon-specific textures**

Map `weaponType` and `isPlayerBullet` in `Projectile.fire()`:
- `isPlayerBullet === false` -> `'tex_bullet_enemy'`
- `PEA_SHOOTER` -> `'tex_bullet_pea'`
- `SPREAD_SHOT` -> `'tex_bullet_spread'`
- `LASER` -> `'tex_bullet_laser'`
- `FLAME` -> `'tex_bullet_flame'`

- [ ] **Step 2: Update `PickupCapsule.ts` to assign flying capsule and pickup badge textures**

Flying capsule uses `'tex_capsule_flying'` and plays `'capsule_spin'`.
Dropped pickup item uses `tex_pickup_S`, `tex_pickup_L`, `tex_pickup_F`, etc. based on weapon type letter.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit Task 3**

```bash
git add src/weapons/ProjectilePool.ts src/entities/PickupCapsule.ts
git commit -m "feat: apply distinct procedural textures to projectiles and weapon pickup capsules"
```
