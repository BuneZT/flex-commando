# Graphics Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely revamp the graphics of Flex Commando: Rogue Beef with authentic 16-bit arcade pixel art (real logo, enemies, player, projectiles, parallax background, and tileset) inspired by `docs/assets/enemy_showcase_art.jpg`.

**Architecture:** PNG assets generated and served via `public/assets/`, preloaded in `BootScene`, with headless procedural fallback in `TextureFactory` for test isolation. Parallax background rendered via `TileSprite` in `GameScene`. Physics bodies resized across enemies to fit expanded visual silhouettes.

**Tech Stack:** Phaser 3.80+ (Arcade Physics, TileSprite, Tilemap), TypeScript, Vite, Vitest (`happy-dom`).

## Global Constraints
- Target view resolution is strictly 320x240 pixels (pixelArt: true).
- All 107 existing Vitest tests across 17 test suites must pass without regression.
- Decoupled pure functions and headless test safety must be maintained.
- Asset loading in `BootScene` must failover gracefully to `TextureFactory` in headless environments.

---

### Task 1: Pixel-Art PNG Asset Generation Pipeline

**Files:**
- Create: `scripts/generate-pixel-assets.mjs`
- Create: `tests/assets-integrity.test.ts`
- Outputs:
  - `public/assets/ui/logo.png`
  - `public/assets/bg/cyber_hangar_bg.png`
  - `public/assets/tiles/tileset.png`
  - `public/assets/sprites/player.png`
  - `public/assets/sprites/trooper.png`
  - `public/assets/sprites/turret.png`
  - `public/assets/sprites/drone.png`
  - `public/assets/sprites/jumper.png`
  - `public/assets/sprites/boss.png`
  - `public/assets/vfx/projectiles.png`
  - `public/assets/vfx/pickups.png`

**Interfaces:**
- Consumes: Node.js file system / PNG generation.
- Produces: Valid PNG binary image files in `public/assets/**` conforming to sprite sheet grid dimensions.

- [ ] **Step 1: Write asset integrity test**

```typescript
// tests/assets-integrity.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Asset Integrity', () => {
  const assetPaths = [
    'public/assets/ui/logo.png',
    'public/assets/bg/cyber_hangar_bg.png',
    'public/assets/tiles/tileset.png',
    'public/assets/sprites/player.png',
    'public/assets/sprites/trooper.png',
    'public/assets/sprites/turret.png',
    'public/assets/sprites/drone.png',
    'public/assets/sprites/jumper.png',
    'public/assets/sprites/boss.png',
    'public/assets/vfx/projectiles.png',
    'public/assets/vfx/pickups.png',
  ];

  it('verifies all expected pixel-art asset files exist and have non-zero size', () => {
    assetPaths.forEach((relPath) => {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath), `Missing asset: ${relPath}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(100);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/assets-integrity.test.ts`  
Expected: FAIL (files missing).

- [ ] **Step 3: Implement PNG generator script and run it**

Create `scripts/generate-pixel-assets.mjs` using pure Node.js buffer PNG encoding (deflate with zlib) or sharp/canvas to generate authentic 16-bit pixel art bitmaps matching the colors, shades, and silhouettes of `enemy_showcase_art.jpg`:
- Logo: 200x50 fiery orange/yellow metallic banner with cyan outer border.
- Cyber Hangar BG: 320x240 dark indigo hangar interior with perspective grid floor and neon conduit cables.
- Tileset: 80x16 5-tile tileset (Air, Steel Grid Floor, Cyber Catwalk Girder, Server Wall Pillar, Green Exit Portal).
- Player: 144x24 sprite sheet (6 frames: idle, run1, run2, jump, crouch, shoot).
- Trooper: 96x24 sprite sheet (4 frames: run1, run2, jump, shoot).
- Turret: 64x24 sprite sheet (2 frames: idle, muzzle flash).
- Drone: 128x20 sprite sheet (4 frames: wing flap & rotor spin).
- Jumper: 96x28 sprite sheet (4 frames: stance, leap, jet flare 1-2).
- Boss: 256x64 sprite sheet (4 frames of 64x64: tread movement, pulsing red core, cannon flash).
- Projectiles: 80x16 sheet with pea, spread, laser, flame, enemy bullets.
- Pickups: 96x16 sheet with capsule frames and S, L, F, M, B badges.

Run: `node scripts/generate-pixel-assets.mjs`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/assets-integrity.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit asset pipeline and generated assets**

```bash
git add scripts/generate-pixel-assets.mjs public/assets tests/assets-integrity.test.ts
git commit -m "feat(assets): generate authentic 16-bit pixel art PNG assets in public/assets"
```

---

### Task 2: Boot Preloading & Headless Test Fallback

**Files:**
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/core/TextureFactory.ts`
- Test: `tests/texture-factory.test.ts`
- Test: `tests/menu-scenes.test.ts`

**Interfaces:**
- Consumes: PNG files from `public/assets/`.
- Produces: Phaser Texture Manager keys (`logo`, `cyber_hangar_bg`, `tileset`, `tex_player`, `tex_enemy_trooper`, `tex_enemy_turret`, `tex_enemy_drone`, `tex_enemy_jumper`, `tex_enemy_boss`, etc.).

- [ ] **Step 1: Write test for BootScene preloading and headless safety**

```typescript
// Add to tests/menu-scenes.test.ts
it('BootScene preloads assets and ensures all required textures exist before launching MainMenu', () => {
  const boot = new BootScene();
  // Verify create ensures texture fallback when headless
});
```

- [ ] **Step 2: Update `BootScene.ts` with preloader and headless fallback**

```typescript
// src/scenes/BootScene.ts
import Phaser from 'phaser';
import { TextureFactory } from '../core/TextureFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Standard Phaser loaders for browser execution
    this.load.image('logo', 'assets/ui/logo.png');
    this.load.image('cyber_hangar_bg', 'assets/bg/cyber_hangar_bg.png');
    this.load.spritesheet('tileset', 'assets/tiles/tileset.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tex_player', 'assets/sprites/player.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('tex_enemy_trooper', 'assets/sprites/trooper.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('tex_enemy_turret', 'assets/sprites/turret.png', { frameWidth: 32, frameHeight: 24 });
    this.load.spritesheet('tex_enemy_drone', 'assets/sprites/drone.png', { frameWidth: 32, frameHeight: 20 });
    this.load.spritesheet('tex_enemy_jumper', 'assets/sprites/jumper.png', { frameWidth: 24, frameHeight: 28 });
    this.load.spritesheet('tex_enemy_boss', 'assets/sprites/boss.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('tex_crosshair', 'assets/vfx/crosshair.png');
  }

  create(): void {
    // Generate any fallback textures if running headless or missing
    TextureFactory.generateAllTextures(this);
    this.scene.start('MainMenuScene');
  }
}
```

- [ ] **Step 3: Update `TextureFactory.ts` to respect loaded textures and register animations**

Ensure `TextureFactory.generateAllTextures(scene)` only creates procedural fallback textures if `!scene.textures.exists(key)`, avoiding overwriting loaded PNG textures, and registers full animations for `player_run`, `player_jump`, `player_crouch`, `trooper_run`, `drone_fly`, `jumper_jump`, `boss_drive`.

- [ ] **Step 4: Run tests to verify compatibility**

Run: `npx vitest run tests/texture-factory.test.ts tests/menu-scenes.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit Boot preloader changes**

```bash
git add src/scenes/BootScene.ts src/core/TextureFactory.ts tests/menu-scenes.test.ts
git commit -m "feat(boot): add PNG preloading with automated headless fallback"
```

---

### Task 3: Real Logo in Main Menu & Game Over Scenes

**Files:**
- Modify: `src/scenes/MainMenuScene.ts`
- Modify: `src/scenes/GameOverScene.ts`
- Test: `tests/menu-scenes.test.ts`

**Interfaces:**
- Consumes: Texture `'logo'` in TextureManager.
- Produces: Polished title screen with floating logo sprite and retro prompt styling.

- [ ] **Step 1: Write test for logo rendering in MainMenuScene**

```typescript
// tests/menu-scenes.test.ts
it('renders the logo sprite in MainMenuScene when logo texture exists', () => {
  // test that MainMenuScene creates an image or text fallback for logo
});
```

- [ ] **Step 2: Update `MainMenuScene.ts` with real logo image and hover animation**

Replace the plain text title in `MainMenuScene.create()`:
```typescript
if (this.textures.exists('logo')) {
  const logo = this.add.image(Math.round(width / 2), Math.round(height / 2 - 40), 'logo');
  logo.setOrigin(0.5);
  this.tweens?.add({
    targets: logo,
    y: logo.y - 3,
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
} else {
  // text fallback
}
```

- [ ] **Step 3: Update `GameOverScene.ts` with logo and cyber branding**

Render the stylized logo on game over / victory screen header with origin centering.

- [ ] **Step 4: Run menu scene tests**

Run: `npx vitest run tests/menu-scenes.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit menu scenes**

```bash
git add src/scenes/MainMenuScene.ts src/scenes/GameOverScene.ts tests/menu-scenes.test.ts
git commit -m "feat(ui): add real graphic logo and floating animation to MainMenu and GameOver"
```

---

### Task 4: Enemy Hitbox & Multi-Frame Animation Overhaul

**Files:**
- Modify: `src/entities/enemies/Trooper.ts`
- Modify: `src/entities/enemies/Turret.ts`
- Modify: `src/entities/enemies/FalconDrone.ts`
- Modify: `src/entities/enemies/JumperMercenary.ts`
- Modify: `src/entities/enemies/Boss.ts`
- Test: `tests/enemy.test.ts`

**Interfaces:**
- Consumes: Sprite sheets `tex_enemy_trooper`, `tex_enemy_turret`, `tex_enemy_drone`, `tex_enemy_jumper`, `tex_enemy_boss`.
- Produces: Updated arcade physics bodies (`body.setSize`, `body.setOffset`) reflecting larger silhouettes.

- [ ] **Step 1: Write test for updated enemy physics body sizes**

```typescript
// tests/enemy.test.ts
it('configures proper expanded physics body sizes matching new silhouettes', () => {
  // Drone body size: 28x16
  // Boss body size: 64x58
  // Trooper body size: 16x22
});
```

- [ ] **Step 2: Run test to verify failure with old sizes**

Run: `npx vitest run tests/enemy.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Update Enemy classes with new body sizes and animations**

- `Trooper.ts`:
  - `this.body.setSize(16, 22); this.body.setOffset(4, 2);`
  - Play `'trooper_run'` animation during horizontal movement.
- `Turret.ts`:
  - `this.body.setSize(24, 20); this.body.setOffset(4, 2);`
  - Track player angle; trigger muzzle flash frame when firing.
- `FalconDrone.ts`:
  - `this.body.setSize(28, 16); this.body.setOffset(2, 2);`
  - Play `'drone_fly'` animation.
- `JumperMercenary.ts`:
  - `this.body.setSize(16, 24); this.body.setOffset(4, 2);`
  - Play jump and thruster flame animation when airborne.
- `Boss.ts`:
  - `this.body.setSize(64, 58); this.body.setOffset(0, 6);`
  - Play tread drive animation and pulse core glow during phase 2 enrage.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/enemy.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit enemy updates**

```bash
git add src/entities/enemies/ tests/enemy.test.ts
git commit -m "feat(enemies): upgrade enemy animations and resize physics hitboxes"
```

---

### Task 5: Player Commando & Weapon VFX Revamp

**Files:**
- Modify: `src/entities/Player.ts`
- Modify: `src/weapons/ProjectilePool.ts`
- Modify: `src/entities/PickupCapsule.ts`
- Test: `tests/player.test.ts`
- Test: `tests/weapons.test.ts`

**Interfaces:**
- Consumes: Sprite sheet `tex_player`, weapon projectiles sheet, and pickup badges.
- Produces: Accurate muzzle offset calculations for 24x24 player sprite, polished weapon bullet visuals.

- [ ] **Step 1: Update Player animation states and muzzle calculations**

Update `Player.ts`:
- Adjust origin to `(0.5, 0.5)` or `(0.5, 1)` with matching `body.setSize(16, 22)`.
- Calibrate `getMuzzleOffset(aimState)` for the cyber commando rifle barrel coordinates.
- Ensure crouching sets hitbox `(16, 14)` with appropriate offset.

- [ ] **Step 2: Update ProjectilePool and PickupCapsule textures**

Update `ProjectilePool.ts` and `PickupCapsule.ts` to utilize the new high-visibility neon projectile textures and weapon badge icons.

- [ ] **Step 3: Run player and weapon tests**

Run: `npx vitest run tests/player.test.ts tests/weapons.test.ts`  
Expected: PASS.

- [ ] **Step 4: Commit player and weapon updates**

```bash
git add src/entities/Player.ts src/weapons/ProjectilePool.ts src/entities/PickupCapsule.ts
git commit -m "feat(player): upgrade player commando animations, muzzle offsets, and weapon VFX"
```

---

### Task 6: Dual-Layer Parallax Background & Upgraded Tilemap

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `src/core/TilemapRenderer.ts`
- Test: `tests/game-loop.test.ts`
- Test: `tests/tilemap-renderer.test.ts`

**Interfaces:**
- Consumes: `cyber_hangar_bg` texture, `tileset` sprite sheet.
- Produces: Seamless scrolling parallax background at depth `-10`, high-contrast sci-fi tilemap layer.

- [ ] **Step 1: Add parallax backdrop in `GameScene.ts`**

In `GameScene.create()`:
```typescript
if (this.textures.exists('cyber_hangar_bg')) {
  this.parallaxBg = this.add.tileSprite(0, 0, 320, 240, 'cyber_hangar_bg')
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(-10);
}
```
In `GameScene.update()`:
```typescript
if (this.parallaxBg && this.cameras.main) {
  this.parallaxBg.tilePositionX = this.cameras.main.scrollX * 0.25;
  this.parallaxBg.tilePositionY = this.cameras.main.scrollY * 0.15;
}
```

- [ ] **Step 2: Connect enhanced 16x16 tileset in `TilemapRenderer.ts`**

Ensure `TilemapRenderer` uses frame indices 0..4 cleanly with proper one-way collision on Tile 2 and solid collision on Tiles 1 and 3.

- [ ] **Step 3: Run game loop and tilemap tests**

Run: `npx vitest run tests/game-loop.test.ts tests/tilemap-renderer.test.ts`  
Expected: PASS.

- [ ] **Step 4: Commit parallax background and tilemap**

```bash
git add src/scenes/GameScene.ts src/core/TilemapRenderer.ts tests/game-loop.test.ts
git commit -m "feat(environment): add parallax cyber hangar background and upgraded tileset"
```

---

### Task 7: Full System Verification & Build

**Files:**
- None (system-wide verification)

- [ ] **Step 1: Run TypeScript typecheck**

Run: `npx tsc --noEmit`  
Expected: 0 errors.

- [ ] **Step 2: Run complete unit test suite**

Run: `npm test`  
Expected: 18 passed test files, 100% green.

- [ ] **Step 3: Run production build**

Run: `npm run build`  
Expected: Build succeeds with static asset bundle in `dist/`.

- [ ] **Step 4: Final commit and summary**

```bash
git commit --allow-empty -m "chore: complete graphics revamp implementation verification"
```
