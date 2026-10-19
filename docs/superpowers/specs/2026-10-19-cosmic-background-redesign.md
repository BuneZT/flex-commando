# Design Document: Cosmic Nebula Background Redesign

**Date:** 2026-10-19  
**Status:** Approved  
**Author:** AI Pair Programmer & User  

---

## 1. Problem Statement

In `Flex Commando: Rogue Beef`, players occasionally struggle to distinguish jumpable platforms from background elements. The current background (`cyber_hangar_bg.png`) causes visual confusion because:
1. It contains faux structural catwalks with hazard stripes and bright cyan rails (`#FFB800`, `#00E5FF`) at horizon level that mimic Tile 2 (One-way catwalk platforms).
2. It includes horizontal neon conduit cables and perspective floor grids with glowing lines that look like solid floor or platform surfaces.
3. It has vertical pillars with high-brightness LED indicators (`#00FF88`, `#00E5FF`) that clash with foreground sprites and bullet visibility.
4. The background was originally sized for 320x240 before the game viewport upgraded to 512x288 (16:9 ratio), causing inconsistent tiling and scale.

---

## 2. Goals & Design Decisions

* **Eliminate Visual Confusion:** Remove all faux horizontal catwalks, floor perspective grids, structural pillars, and high-contrast lines from the background.
* **Deep Space & Nebula Theme:** Transition the backdrop to a deep cosmic void with soft celestial nebula clouds and a multi-layered starfield.
* **Strict Contrast Hierarchy:** The background value/luminance will stay under 25% brightness across nebula dust, allowing foreground platforms (Tile 1: `#2E354F`, Tile 2: `#00FFFF`, Tile 3: `#3A2E48`), player, enemies, and projectiles to pop crisply.
* **Seamless Toroidal Wrap at 512x288:** Render the texture at native 512x288 px with seamless wrapping on both X and Y axes, ensuring smooth parallax scrolling across the 4x4 room grid.
* **Maintain Architectural Pipeline:**
  * Keep deterministic generation in `scripts/generate-pixel-assets.mjs` saving to `public/assets/bg/cyber_hangar_bg.png`.
  * Update procedural fallback in `src/core/TextureFactory.ts` (`createCyberHangarBgTexture`).
  * Preserve Phaser `TileSprite` integration in `src/scenes/GameScene.ts` with tuned parallax dampening (`0.15x / 0.10y`).

---

## 3. Visual & Artistic Details

### 3.1 Palette & Values
* **Void Background:** Ultra-dark indigo/black base (`#060812` to `#0a0d1c`).
* **Cosmic Nebula Formations:** Organic, soft-edge dust clusters generated with toroidal distance wrapping:
  * *Deep Cosmic Violet:* `#1e1330` and `#2b1b42` (ambient depth)
  * *Muted Indigo:* `#141832` (soft shadows)
  * *Whispering Teal/Cyan Dust:* `#0a2228` and `#10353d` (soft ethereal glow, strictly kept dark and desaturated so it never clashes with cyan platforms or projectiles)
* **Zero Horizontal Surfaces:** No horizontal bars, girders, wires, or platforms.

### 3.2 Starfield Tiers (Total ~180 stars)
* **Tier 1 (Distant Faint Stars):** ~120 1x1 px stars in dim cool blue/grey (`#445577` / `#556688`).
* **Tier 2 (Mid-field Stars):** ~50 1x1 px stars in crisp soft white/lavender (`#c0d0f0` / `#dfc8f8`).
* **Tier 3 (Sparkling Focal Stars):** ~10–12 3x3 px micro cross/diamond stars with white center (`#ffffff`) and soft 1px tips (`#88ddee` / `#f0aaff`).

---

## 4. Technical Architecture & Implementation

### 4.1 Asset Generator (`scripts/generate-pixel-assets.mjs`)
* Upgrade `generateCyberHangarBg()`:
  * Canvas size: 512 x 288 px.
  * Base void gradient: slight subtle gradient from `#060812` at top to `#0a0d1c` at bottom.
  * Deterministic nebula clusters: calculate distance to cluster centers with toroidal wrapping (`Math.min(abs(dx), 512 - abs(dx))`) to ensure seamless horizontal and vertical tiling.
  * Deterministic star distribution: use seeded pseudo-random formula (Mulberry32 or fixed seed sequence) so repeated executions produce identical PNG bytes.
* Update `assetSpecs` in `generate-pixel-assets.mjs` and `tests/assets-integrity.test.ts`:
  * Path: `public/assets/bg/cyber_hangar_bg.png`
  * Width: 512
  * Height: 288

### 4.2 Procedural Fallback (`src/core/TextureFactory.ts`)
* In `createCyberHangarBgTexture(scene: Phaser.Scene)`:
  * If `scene.textures.exists('cyber_hangar_bg')` return early.
  * Generate 512x288 Graphics texture with dark void gradient, soft nebula color blocks, and pixel stars matching the cosmic theme.
  * Texture key remains `'cyber_hangar_bg'` for 100% backwards compatibility across tests and scene loaders.

### 4.3 Scene Integration (`src/scenes/GameScene.ts`)
* `this.add.tileSprite(0, 0, GAME_CONSTANTS.VIEW_WIDTH_PX, GAME_CONSTANTS.VIEW_HEIGHT_PX, 'cyber_hangar_bg')` remains active.
* Parallax scroll speed update:
  ```typescript
  if (this.parallaxBg && this.cameras?.main) {
    this.parallaxBg.tilePositionX = (this.cameras.main.scrollX || 0) * 0.15;
    this.parallaxBg.tilePositionY = (this.cameras.main.scrollY || 0) * 0.10;
  }
  ```

---

## 5. Verification & Testing

1. **Asset Integrity Test (`tests/assets-integrity.test.ts`):**
   * Update expected width to 512 and height to 288.
   * Verify PNG magic header and dimensions pass.
2. **Texture Factory Tests (`tests/texture-factory.test.ts`):**
   * Verify texture registration and dimensions in headless Phaser environment.
3. **Gameplay Tests (`tests/game-loop.test.ts`):**
   * Verify parallax background initializes and updates `tilePositionX` / `tilePositionY`.
4. **Visual & Build Verification:**
   * Run `node scripts/generate-pixel-assets.mjs` to regenerate asset.
   * Run `npm test` and `npx tsc --noEmit`.
   * Run `npm run build` to verify Vite bundle compilation.
