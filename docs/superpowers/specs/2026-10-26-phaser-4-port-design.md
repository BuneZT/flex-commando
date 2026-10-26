# Flex Commando: Phaser 4.2.1 Migration & Rendering Design Spec

**Date:** 2026-10-26  
**Target Branch:** `phaser-4`  
**Target Engine Version:** `phaser@^4.2.1`

---

## 1. Goal & Non-Regression Mandate

Port **Flex Commando: Rogue Beef** (`flex-commando`) from Phaser `^3.90.0` to Phaser `^4.2.1` on an isolated `phaser-4` branch (never pushing to `master`), while:
1. Preserving 100% gameplay, physics, tilemap collision, audio, and 512x288 pixel-art fidelity with zero runtime Garbage Collector (GC) allocations during gameplay.
2. Migrating all breaking Phaser 4 APIs (`TintModes.FILL` replacing removed `setTintFill`, `TextureSource.updateSize` + `Frame.updateUVs` for the custom bitmap font atlas renderer in `TextStyle.ts`).
3. Adopting Phaser 4's native `Filters` (`enableFilters()` + `filters.internal.addGlow(...)`) sparingly on high-value focal sprites (laser lockdown barriers, exit portal, and Boss telegraph/overheat states) with pre-allocated controllers and safe headless-test fallbacks.

---

## 2. Architecture & Component Changes

### 2.1 Dependency & Build Configuration (`package.json`, `vite.config.ts`, `vitest.setup.ts`)
- **`package.json`**: Upgrade `dependencies.phaser` from `"^3.90.0"` to `"^4.2.1"`.
- **`vite.config.ts`**: Keep `resolve.alias.phaser` pointing to `'phaser/dist/phaser.js'` (or `'phaser/dist/phaser.esm.js'`) and verify both `npm run build` (`tsc && vite build`) and `npm test` (`vitest run` under `happy-dom`) resolve Phaser 4 cleanly without WebGL initialization errors in headless tests.
- **`vitest.setup.ts`**: Ensure the 2D canvas context mock satisfies any Phaser 4 startup probes during headless test imports.

### 2.2 Native Phaser 4 Tinting (`src/core/CombatFX.ts`)
- **Problem in Phaser 4**: `Phaser.GameObjects.Components.Tint#setTintFill(color)` was deprecated and replaced by a no-op that logs `console.error('`setTintFill(color)` is removed as of Phaser 4. Use setTint(color).setTintMode(Phaser.TintModes.FILL)` instead.')`.
- **Design**:
  - Update `CombatFX.applyHitFlash(target, durationMs)` to apply:
    1. If `typeof target.setTintMode === 'function'`: call `target.setTint(0xffffff)` and `target.setTintMode(Phaser.TintModes?.FILL ?? 1)`.
    2. Fallback for legacy mocks that only implement `setTintFill`: if `typeof target.setTintMode !== 'function' && typeof target.setTintFill === 'function'`, call `target.setTintFill(0xffffff)`.
  - On expiration (`delayedCall`), call `target.clearTint()`, which in Phaser 4 resets corner tints to `0xffffff`, secondary tints to `0x000000`, and `tintMode` to `Phaser.TintModes.MULTIPLY` (`0`). Also explicitly call `target.setTintMode(Phaser.TintModes?.MULTIPLY ?? 0)` if `clearTint` is a partial mock in unit tests.

### 2.3 Custom Pixel Text Renderer (`src/ui/TextStyle.ts`)
- **Problem in Phaser 4**: In Phaser 4's `Phaser.GameObjects.Text#updateText`, resizing the internal `HTMLCanvasElement` requires updating the `TextureSource` dimensions and recalculating `Frame` UVs before uploading via `renderer.canvasToTexture`:
  ```ts
  this.frame.setSize(this.width, this.height);
  if (this.frame.source && typeof this.frame.source.updateSize === 'function') {
    this.frame.source.updateSize(this.width, this.height);
    this.frame.source.resolution = 1;
  }
  if (typeof this.frame.updateUVs === 'function') {
    this.frame.updateUVs();
  }
  ```
- **Design**:
  - Update `installPixelTextRenderer` in `src/ui/TextStyle.ts` to invoke `this.frame.source.updateSize(this.width, this.height)`, set `this.frame.source.resolution = 1`, and invoke `this.frame.updateUVs()` whenever `this.frame` is present, before calling `this.renderer.canvasToTexture(this.canvas, this.frame.source.glTexture, true)`.
  - Preserve even-integer dimension padding and integer `_displayOriginX` / `_displayOriginY` rounding so all HUD and menu strings remain razor-sharp on the 512x288 viewport.

### 2.4 Selective Phaser 4 Sprite Glow Filters (`src/core/CombatFX.ts`, `src/scenes/GameScene.ts`, `src/entities/enemies/Boss.ts`)
- **Zero-GC Design Principle**: Per `AGENTS.md`, filters must never be allocated or destroyed per-frame. A single `Phaser.Filters.Glow` controller is attached once at sprite initialization via a safe helper `CombatFX.attachGlowFilter(target, color, outerStrength, quality, distance)` and mutated in-place (`glow.color`, `glow.outerStrength`, `glow.active`) when states change.
- **Safe Helper (`CombatFX.attachGlowFilter`)**:
  - Checks `typeof target?.enableFilters === 'function'` and wraps `target.enableFilters()` + `target.filters?.internal?.addGlow(color, outerStrength, 0, 1, false, quality, distance)` in a `try/catch` block so headless unit tests or Canvas-fallback contexts never throw if WebGL framebuffer cameras are unavailable.
  - Returns the `Phaser.Filters.Glow | null` controller reference.
- **Focal Sprites**:
  1. **Room Lockdown Laser Barriers (`GameScene.ts`)**: Attach a subtle cyan/magenta sci-fi glow (`color: 0x00ffff`, `outerStrength: 2`, `quality: 6`, `distance: 4`) to each of the 4 pooled `roomBarriers` sprites when created in `GameScene.create()`. Toggle `renderFilters` / `glow.active` alongside barrier activation.
  2. **Exit Portal (`GameScene.ts`)**: Attach a glow filter to `exitDoor` (`0xff4444` when locked, transitioning to `0x00ff88` with `outerStrength: 3` in `unlockExitPortal()`).
  3. **Boss Telegraph & Overheat States (`Boss.ts`)**: Attach a pre-allocated glow filter on `Boss` construction (`active = false` during `PATROL`) that activates with matching state colors during `SWEEP_TELEGRAPH` (`0xff3333`), `LEAP_TELEGRAPH` (`0xffaa00`), `CHARGE_TELEGRAPH` (`0xff6600`), and `OVERHEAT` (`0x44ddff`).

### 2.5 Documentation Updates (`AGENTS.md`, `docs/GAME_MANUAL.md`)
- Update engine version references from `Phaser 3.80+` to `Phaser 4.2+` and document the Phaser 4 `TintModes.FILL` and `TextureSource` conventions in `AGENTS.md` and `docs/GAME_MANUAL.md`.

---

## 3. Error Handling & Headless Testing Strategy

- All Phaser 4 WebGL-specific APIs (`setTintMode`, `enableFilters`, `filters.internal.addGlow`, `frame.source.updateSize`, `frame.updateUVs`) must be feature-detected with `typeof ... === 'function'` guards so existing lightweight Vitest mocks continue to work without requiring full WebGL context instantiation.
- Existing 25 test files in `tests/` must pass without modification to their core gameplay assertions.
- New unit test assertions will be added to:
  - `tests/combat-fx.test.ts`: Verify `applyHitFlash` uses `setTint(0xffffff)` + `setTintMode(Phaser.TintModes.FILL)` without triggering Phaser 4's deprecated `setTintFill` `console.error`, and verify `attachGlowFilter` safely handles both WebGL filter-capable objects and headless mocks.
  - `tests/text-style.test.ts`: Verify `installPixelTextRenderer` calls `frame.source.updateSize` and `frame.updateUVs` alongside `frame.setSize` and `renderer.canvasToTexture`.
  - `tests/config.test.ts`: Verify Phaser 4 version (`4.x`) and `GameConfig` compatibility.
