# AGENTS.md — Context Guide for AI Coding Agents

This document provides context, architectural boundaries, and guidelines for AI agents working on `flex-commando`.

---

## 1. Project Overview

* **Title:** Flex Commando: Rogue Beef (`flex-commando`)
* **Tech Stack:** TypeScript (strictly typed, `noEmit: true`), Vite, Phaser 3.80+ with Arcade Physics, Vitest (`happy-dom`).
* **View Resolution:** 320x240 pixels (pixelArt: true), 20x15 tiles per room at 16x16px tile size.
* **Level Structure:** 4x4 matrix grid of rooms (80x60 total tiles per level).

---

## 2. Directory Structure & Key Modules

```
flex-commando/
├── src/
│   ├── config/
│   │   ├── GameConfig.ts         # Phaser game configuration (type-only Phaser import)
│   │   └── Controls.ts           # Keyboard input handler (WASD/Arrows, Space, X/J)
│   ├── core/
│   │   ├── GridGenerator.ts      # Seeded Mulberry32 PRNG & 4x4 room grid generator
│   │   ├── RoomTemplate.ts       # Bitmask door matcher (N=1, S=2, E=4, W=8) & 15 room templates
│   │   ├── TilemapRenderer.ts    # Stitches 4x4 room grid into 80x60 global tilemap
│   │   ├── TextureFactory.ts     # Procedural pixel-art sprite, tileset, and animation generator
│   │   ├── CameraManager.ts      # Active room calculation & smooth room pan transitions
│   │   └── SoundManager.ts       # Singleton Web Audio BGM & SFX manager (procedural, no file assets)
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
│   │   ├── BootScene.ts          # Calls TextureFactory.generateAllTextures() then launches MainMenuScene (no file assets)
│   │   ├── MainMenuScene.ts      # Title screen; SPACE starts game, I (dev-only) starts with infinite lives
│   │   ├── GameScene.ts          # Main game loop, colliders, HUD, camera, game state
│   │   └── GameOverScene.ts      # Victory / Permadeath screen with Space restart
│   ├── ui/
│   │   └── HUD.ts                # On-screen HUD (formatHUDLives, HP bar, weapon, 4x4 minimap)
│   └── main.ts                   # Entry point initializing Phaser.Game
├── tests/                        # Vitest unit test suites
└── docs/superpowers/
    ├── specs/                    # Design specification documents
    └── plans/                    # Step-by-step implementation plans
```

---

## 3. Core Architectural Rules & Best Practices

1. **Decoupled Business Logic**:
   - Keep core math and state calculations (like `PlayerAim.ts`, `GridGenerator.ts`, `WeaponTypes.ts`, `CameraManager.getRoomBounds`, `formatHUDLives`) as **pure functions** or standalone classes decoupled from Phaser DOM/Canvas calls so they can be unit-tested headlessly via Vitest.

2. **Phaser Import Rules**:
   - In configuration/type files (like `GameConfig.ts`), use `import type Phaser from 'phaser'` to prevent Node/Vitest from initializing Phaser's WebGL/canvas device features during imports.
   - `vite.config.ts` includes `resolve: { alias: { phaser: 'phaser/dist/phaser.js' } }` and `test: { setupFiles: ['./vitest.setup.ts'] }` for headless Vitest compatibility.

3. **Performance & Memory Management**:
   - Projectiles must use `ProjectilePool` recycling. Acquire with `pool.spawn()` (reuses `pool.find(p => !p.active)` before allocating); release with `projectile.deactivate()`. Never instantiate new sprites mid-firefight.
   - Inactive projectiles disable their physics body (`body.enable = false`) rather than being destroyed.

4. **Testing Workflow**:
   - Run unit tests: `npm test` or `npx vitest run`
   - Run typecheck: `npx tsc --noEmit`
   - Verify build: `npm run build`

---

## 4. How to Extend the Project

* **Adding New Weapon Types**: Add entry to `WeaponType` union in `src/weapons/WeaponTypes.ts`, define stats in `WEAPON_CONFIGS`, update `Player.shoot()` or `ProjectilePool.spawn()`.
* **Adding New Enemies**: Extend `EnemyBase` in `src/entities/enemies/`, implement `updateAI(time, delta, player)`, add unit test in `tests/enemy.test.ts`.
* **Adding New Room Templates**: Add template schema (20x15 tiles) in `src/core/RoomTemplate.ts` with appropriate `doorMask` bitmask matching its openings.
* **Adding Audio / SFX**: All audio is procedurally synthesised by `SoundManager` (singleton in `src/core/SoundManager.ts`) using the Web Audio API — no external files. Add new sound methods there and call them from `Player.ts`, `ProjectilePool.ts`, or `GameScene.ts`.
