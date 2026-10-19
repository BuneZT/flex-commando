# AGENTS.md — Context Guide for AI Coding Agents

This document provides context, architectural boundaries, and guidelines for AI agents working on `flex-commando`.

---

## 1. Project Overview

* **Title:** Flex Commando: Rogue Beef (`flex-commando`)
* **Tech Stack:** TypeScript (strictly typed, `noEmit: true`), Vite, Phaser 3.80+ with Arcade Physics, Vitest (`happy-dom`).
* **View Resolution:** 512x288 pixels (16:9 ratio, pixelArt: true), 32x18 tiles per room at 16x16px tile size.
* **Level Structure:** 4x4 matrix grid of rooms (128x72 total tiles per level, 2048x1152 px world space) with hybrid platforming via `RoomDecorator`.

---

## 2. Directory Structure & Key Modules

```
flex-commando/
├── src/
│   ├── config/
│   │   ├── GameConfig.ts         # Phaser game configuration (type-only Phaser import)
│   │   ├── GameConstants.ts      # Centralized dimension and viewport constants (512x288, 32x18 tiles)
│   │   └── Controls.ts           # Keyboard input handler (WASD/Arrows, Space, X/J)
│   ├── core/
│   │   ├── GridGenerator.ts      # Seeded Mulberry32 PRNG & 4x4 room grid generator
│   │   ├── RoomTemplate.ts       # Bitmask door matcher (N=1, S=2, E=4, W=8) & 15 room templates (32x18 tiles)
│   │   ├── RoomDecorator.ts      # Deterministic seed-based procedural micro-decorations and ledges
│   │   ├── TilemapRenderer.ts    # Stitches 4x4 room grid into 128x72 global tilemap
│   │   ├── TextureFactory.ts     # Procedural pixel-art sprite, tileset, and animation generator (headless/fallback)
│   │   ├── CameraManager.ts      # Active room calculation & smooth room pan transitions
│   │   └── SoundManager.ts       # Singleton audio manager (preloaded CC0 BGM & SFX audio files with zero-GC playback)
│   ├── entities/
│   │   ├── Player.ts             # Player arcade sprite, crouching hitbox, jump & muzzle offset
│   │   ├── PlayerAim.ts          # Pure 8-way directional aiming state machine & angle math
│   │   ├── PickupCapsule.ts      # Sinusoidal flying drone & dropped weapon letter items
│   │   └── enemies/
│   │       ├── EnemyBase.ts      # Abstract base enemy (HP, damage, takeDamage, die)
│   │       ├── Trooper.ts        # Ground runner/jumper AI
│   │       ├── Turret.ts         # 360-degree aiming wall turret
│   │       ├── FalconDrone.ts    # Sine wave flying drone & calculateDroneSinePosition
│   │       ├── JumperMercenary.ts# High-jumping mercenary AI
│   │       └── Boss.ts           # 2-phase level boss with spread attacks & health bar
│   ├── weapons/
│   │   ├── WeaponTypes.ts        # WeaponType enum, stats & getSpreadShotAngles([-30,-15,0,15,30])
│   │   └── ProjectilePool.ts     # Recyclable Projectile Arcade sprite pool
│   ├── scenes/
│   │   ├── BootScene.ts          # Preloads all PNG spritesheets, explosion VFX, BGM, and SFX; then launches MainMenuScene
│   │   ├── MainMenuScene.ts      # Title screen; SPACE starts game, I (dev-only) starts with infinite lives
│   │   ├── GameScene.ts          # Main game loop, colliders, HUD, camera, game state
│   │   └── GameOverScene.ts      # Victory / Permadeath screen with Space restart
│   ├── ui/
│   │   └── HUD.ts                # On-screen HUD (formatHUDLives, HP bar, weapon, 4x4 minimap)
│   └── main.ts                   # Entry point initializing Phaser.Game
├── tests/                        # Vitest unit test suites
└── docs/
    ├── assets/                   # Visual showcases and pixel art assets
    └── GAME_MANUAL.md            # Comprehensive game manual and architecture guide
```

---

## 3. Core Architectural Rules & Best Practices

1. **Decoupled Business Logic**:
   - Keep core math and state calculations (like `PlayerAim.ts`, `GridGenerator.ts`, `RoomDecorator.decorateRoomTiles`, `WeaponTypes.ts`, `CameraManager.getRoomBounds`, `formatHUDLives`) as **pure functions** or standalone classes decoupled from Phaser DOM/Canvas calls so they can be unit-tested headlessly via Vitest.

2. **Phaser Import Rules**:
   - In configuration/type files (like `GameConfig.ts`), use `import type Phaser from 'phaser'` to prevent Node/Vitest from initializing Phaser's WebGL/canvas device features during imports.
   - `vite.config.ts` includes `resolve: { alias: { phaser: 'phaser/dist/phaser.js' } }` and `test: { setupFiles: ['./vitest.setup.ts'] }` for headless Vitest compatibility.

3. **Performance & Memory Management**:
   - Projectiles must use `ProjectilePool` recycling. Acquire with `pool.spawn()` (reuses `pool.find(p => !p.active)` before allocating); release with `projectile.deactivate()`. Never instantiate new sprites mid-firefight.
   - Inactive projectiles disable their physics body (`body.enable = false`) rather than being destroyed.

4. **Static Assets Mandatory for Sprites and Sounds (Zero Runtime GC Overhead)**:
   - **Always use preloaded static files** (`.png` in `public/assets/sprites|tiles|ui|vfx/` and `.ogg`/`.mp3` in `public/assets/audio/`) for all sprites, textures, animations, BGM, and sound effects.
   - **Never dynamically generate textures or synthesize Web Audio nodes at runtime during gameplay**. Runtime procedural canvas drawing (`scene.add.graphics().generateTexture()`) and real-time Web Audio node allocation (`createOscillator()`, `createGain()`) trigger severe Garbage Collector churn and framerate stutter.
   - Procedural generators (in `TextureFactory.ts`) must only exist as offline build scripts or headless test fallbacks and MUST be guarded with `if (scene.textures.exists(key)) return;`.
   - All assets must be preloaded in `BootScene.ts` and asserted in `tests/assets-integrity.test.ts`.

5. **Testing Workflow**:
   - Run unit tests: `npm test` or `npx vitest run`
   - Run typecheck: `npx tsc --noEmit`
   - Verify build: `npm run build`

---

## 4. How to Extend the Project

* **Adding New Weapon Types**: Add entry to `WeaponType` union in `src/weapons/WeaponTypes.ts`, define stats in `WEAPON_CONFIGS`, update `Player.shoot()` or `ProjectilePool.spawn()`.
* **Adding New Enemies**: Extend `EnemyBase` in `src/entities/enemies/`, implement `updateAI(time, delta, player)`, add unit test in `tests/enemy.test.ts`.
* **Adding New Room Templates**: Add template schema (32x18 tiles) in `src/core/RoomTemplate.ts` with appropriate `doorMask` bitmask matching its openings.
* **Adding New Sprites / VFX**: Add sprite generation logic to `scripts/generate-pixel-assets.mjs` (or save PNG to `public/assets/`), preload the sheet in `BootScene.ts`, add the fallback guard to `TextureFactory.ts`, and add integrity assertion in `tests/assets-integrity.test.ts`.
* **Adding Audio / SFX**: All BGM and SFX must be preloaded audio files in `public/assets/audio/` (CC0 format). Preload them in `BootScene.ts`, trigger them via `SoundManager` (which delegates to Phaser's audio cache with zero GC allocation), and add verification to `tests/assets-integrity.test.ts`. Never synthesize sounds with Web Audio API nodes in `SoundManager.ts` at runtime.
