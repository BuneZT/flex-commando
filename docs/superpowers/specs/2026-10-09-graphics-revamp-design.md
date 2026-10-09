# Graphics Revamp Design Specification — Flex Commando: Rogue Beef

**Date:** 2026-10-09  
**Status:** Approved  
**Aesthetic Reference:** `docs/assets/enemy_showcase_art.jpg`

---

## 1. Overview & Goals

This specification defines the complete visual revamp of **Flex Commando: Rogue Beef**, replacing basic procedural placeholders with authentic 16-bit arcade pixel-art assets inspired directly by the visual showcase art (`docs/assets/enemy_showcase_art.jpg`).

Key objectives:
1. **Title Logo:** Integrate the real fiery orange/yellow metallic "FLEX COMMANDO: ROGUE BEEF" logo into `MainMenuScene` and `GameOverScene`.
2. **Real Enemies & Animations:** Overhaul all 5 enemy types with custom pixel-art sprites and animations:
   * **Trooper:** Crimson armored commando with visor and assault rifle (run/aim/shoot).
   * **Wall Turret:** Ceiling/wall rail surveillance vulcan cannon with red sensor and muzzle flash.
   * **Falcon Drone:** Yellow aerodynamic drone with dual rotors, insectoid wings, and glowing cyan eye.
   * **Jumper Mercenary:** Purple cyber armor with neon visor and rocket boot thruster flares.
   * **Level Boss:** Slate-armored heavy mech with tank treads, pulsing red reactor chest core, shoulder cannons, and gatling arms.
3. **Hitbox Resizing:** Update physics hitboxes (`body.setSize` / `body.setOffset`) to match the larger, authentic silhouettes of the new sprites (e.g., Falcon Drone and Boss Mech).
4. **Player Commando:** Redesign the player as a matching blue cyber commando with full run, jump, crouch, and aim animations.
5. **Projectiles & Pickups:** High-visibility neon weapon VFX (pea, spread, laser, flame, enemy bullets) and pickup capsules/badges.
6. **Environment & Parallax Background:** Dual-layer visual structure:
   * Repeating parallax backdrop (`Phaser.GameObjects.TileSprite`) representing the cyber hangar/laboratory interior with computer telemetry, hanging conduits, and perspective grid.
   * High-contrast 16x16 tileset for platforms, hazard girders, pillars, and an animated exit portal.
7. **Asset Pipeline & Headless Safety:** Assets placed in `public/assets/`, loaded natively in `BootScene`, with seamless procedural fallback in `TextureFactory` to guarantee 100% Vitest headless test suite passes.

---

## 2. Directory Structure & Assets

Assets reside in Vite's static public folder:
```
public/
└── assets/
    ├── ui/
    │   └── logo.png                  # Main title logo
    ├── bg/
    │   └── cyber_hangar_bg.png       # 320x240 seamless parallax backdrop
    ├── tiles/
    │   └── tileset.png               # 16x16 modular tileset
    ├── sprites/
    │   ├── player.png                # Player commando sprite sheet
    │   ├── trooper.png               # Crimson trooper sprite sheet
    │   ├── turret.png                # Wall turret base + rotating gun
    │   ├── drone.png                 # Falcon drone flying sheet
    │   ├── jumper.png                # Jumper mercenary + jet flare sheet
    │   └── boss.png                  # Heavy mech boss sheet
    └── vfx/
        ├── projectiles.png           # Weapon bullets & energy bolts
        └── pickups.png               # Capsules and weapon badges [S, L, F, M, B]
```

---

## 3. Component Details & Behavior

### 3.1 Title Screen & Menus (`MainMenuScene`, `GameOverScene`)
* `MainMenuScene` renders `logo.png` centered above the start prompts with an optional subtle vertical hover tween.
* Replaces the plain text title header.
* `GameOverScene` displays the victory/defeat banner alongside stylized branding.

### 3.2 Enemy Sprites & Physics Adjustments
* **Trooper:** 
  * Frame size: 24x24 px (sheet with run frames and shoot frame).
  * Physics body: 16x22 px (offset centered).
* **Turret:**
  * Frame size: 32x24 px (mount base + vulcan barrel with muzzle flash frame).
  * Physics body: 24x20 px.
* **Falcon Drone:**
  * Frame size: 32x20 px (flapping wings, rotating twin propellers, cyan eye pulse).
  * Physics body: Expanded to 28x16 px to cover the full wingspan.
* **Jumper Mercenary:**
  * Frame size: 24x28 px (including boot thruster jet flame).
  * Physics body: 16x24 px (ignoring flame tail for fair platform collision).
* **Level Boss:**
  * Frame size: 64x64 px (tread animation, pulsing red core, cannon fire).
  * Physics body: Expanded from 64x48 to 64x58 px to encapsulate the entire tank-tread chassis and shoulder cannons.

### 3.3 Player Commando
* Frame size: 24x24 px.
* Animations: `player_idle`, `player_run` (4 frames), `player_jump`, `player_crouch`.
* Weapon muzzle flash offset dynamically calibrated to match the new rifle barrel coordinate.

### 3.4 Dual-Layer Environment & Tilemap
* **Backdrop Layer:**
  * Created in `GameScene.create()` before tilemap rendering.
  * Added as a `Phaser.GameObjects.TileSprite` at depth `-10`.
  * In `GameScene.update()`, `tilePositionX` and `tilePositionY` track camera scroll with a parallax ratio of `0.25` for immersive depth.
* **Tilemap Layer:**
  * Tile 1 (Floor): Reinforced industrial steel plates with cyan neon light seams.
  * Tile 2 (Platform): High-tech one-way catwalk girder with glowing hazard edges.
  * Tile 3 (Wall): Dark purple/slate server racks and reinforced armor pillars.
  * Tile 4 (Exit): Pulsing green/cyan teleport gate portal.

### 3.5 Projectiles & Pickups
* Distinct, high-contrast neon projectiles:
  * Pea-shooter: Golden energy dart.
  * Spread shot: Cyan multi-pellet spread.
  * Laser: Sleek glowing blue bolt.
  * Flame: Swirling red/orange plasma sphere.
  * Enemy Bullet: Ominous red bio-mechanical plasma orb.
* Pickups: 
  * Sinusoidal flying capsule with flashing red/white casing.
  * Glowing neon weapon badges for S, L, F, M, B.

---

## 4. Boot Pipeline & Test Compatibility

1. **Asset Loading (`BootScene.ts`):**
   * Preloads all PNG images and sprite sheets using `this.load.image` and `this.load.spritesheet`.
   * On completion, transitions to `MainMenuScene`.
2. **Headless & Fallback Guarantee (`TextureFactory.ts`):**
   * If any texture is missing (e.g. running under headless Vitest or network error), `TextureFactory.generateAllTextures(this)` generates procedural fallback textures with matching keys.
   * All 107 existing Vitest tests remain green and functional.

---

## 5. Verification Plan

* **Automated Tests:**
  * Run `npm test` / `vitest run` to ensure all 17 test suites (107 tests) pass.
  * Run `tsc --noEmit` to verify strict TypeScript compilation.
* **Build Verification:**
  * Run `npm run build` to verify Vite bundle output including assets.
* **Gameplay Verification:**
  * Verify visual assets load cleanly in browser.
  * Check enemy animations, player animations, parallax background scroll, hitboxes, and projectile visuals.
