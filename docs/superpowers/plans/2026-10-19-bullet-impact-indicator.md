# Bullet Impact Visual Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide visual retro pixel spark feedback whenever a bullet hits an impenetrable barrier, wall, ceiling, or platform.

**Architecture:** A zero-GC recyclable sprite pool (`ImpactFXPool`) plays a snappy 4-frame 24fps pixel spark animation (`tex_bullet_impact`). Bullet impacts on solid tiles in `ProjectilePool` and barrier deflections in `GameScene` trigger the pool without runtime memory allocation.

**Tech Stack:** TypeScript, Phaser 3.80+ (Arcade Physics), Vitest (`happy-dom`), Node.js PNG encoder script.

## Global Constraints

- **Zero Runtime GC Overhead:** Strictly use preloaded static PNG (`public/assets/vfx/bullet_impact.png`) and object pooling (`ImpactFXPool`). Never allocate new textures or Web Audio nodes at runtime.
- **Headless Compatibility:** All new methods and classes must operate cleanly in Node/Vitest headless environment with mocked Phaser scenes.
- **Strict Typing:** `noEmit: true`, clean typecheck with no `any` leaks in core contracts.

---

### Task 1: Generate Pixel Asset, Preloader & Fallback Texture

**Files:**
- Modify: `scripts/generate-pixel-assets.mjs`
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/core/TextureFactory.ts`
- Modify: `tests/assets-integrity.test.ts`

**Interfaces:**
- Produces: `tex_bullet_impact` spritesheet texture key (64x16 px, four 16x16 frames) and `'bullet_impact_spark'` animation key.

- [ ] **Step 1: Write asset integrity test for bullet_impact**
Add assertion in `tests/assets-integrity.test.ts` checking for `public/assets/vfx/bullet_impact.png` and `'tex_bullet_impact'` registration in `TextureFactory.generateAllTextures()`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/assets-integrity.test.ts`
Expected: FAIL (file and texture do not exist).

- [ ] **Step 3: Implement asset generator in `scripts/generate-pixel-assets.mjs` and execute it**
Implement `generateBulletImpact()`, add `{ path: 'public/assets/vfx/bullet_impact.png', build: generateBulletImpact }` to `ASSET_REGISTRY`, and run `node scripts/generate-pixel-assets.mjs`.

- [ ] **Step 4: Update `BootScene.ts` and `TextureFactory.ts`**
In `BootScene.ts`: preload `'tex_bullet_impact'`.
In `TextureFactory.ts`: add `createBulletImpactTextures(scene)` fallback (guarded with `if (scene.textures.exists('tex_bullet_impact')) return;`) and register animation `'bullet_impact_spark'`.

- [ ] **Step 5: Run tests and verify they pass**
Run: `npx vitest run tests/assets-integrity.test.ts tests/texture-factory.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add scripts/generate-pixel-assets.mjs public/assets/vfx/bullet_impact.png src/scenes/BootScene.ts src/core/TextureFactory.ts tests/assets-integrity.test.ts
git commit -m "feat(assets): add bullet impact spark spritesheet and fallback generator"
```

---

### Task 2: Implement Recyclable `ImpactFXPool`

**Files:**
- Create: `src/core/ImpactFXPool.ts`
- Create: `tests/impact-fx-pool.test.ts`

**Interfaces:**
- Produces: `ImpactFXPool` class with:
  - `constructor(scene: Phaser.Scene, maxSize?: number)`
  - `spawn(x: number, y: number): Phaser.GameObjects.Sprite | null`
  - `clear(): void`
  - `pool: Phaser.GameObjects.Sprite[]`

- [ ] **Step 1: Write failing unit tests for `ImpactFXPool`**
Create `tests/impact-fx-pool.test.ts` testing:
- Pool initialization with capped size.
- Spawning sets coordinates, activates sprite, and plays `'bullet_impact_spark'`.
- Deactivates sprite on `animationcomplete`.
- Reuses inactive sprites without creating new allocations.
- Gracefully handles headless/mock scenes without throwing.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/impact-fx-pool.test.ts`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement `ImpactFXPool`**
Write `src/core/ImpactFXPool.ts` implementing the pooled sprite lifecycle.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/impact-fx-pool.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/core/ImpactFXPool.ts tests/impact-fx-pool.test.ts
git commit -m "feat(fx): implement ImpactFXPool for zero-GC bullet impact sparks"
```

---

### Task 3: Integrate Impact Indicator on Tile Collisions (Walls, Ceilings, Platforms)

**Files:**
- Modify: `src/weapons/ProjectilePool.ts`
- Modify: `tests/weapons.test.ts`

**Interfaces:**
- Consumes: `ImpactFXPool` from `src/core/ImpactFXPool.ts`
- Modifies: `ProjectilePool.impactFXPool?: ImpactFXPool` and `Projectile.updateProjectile()` to spawn spark on solid tile hit.

- [ ] **Step 1: Write unit test in `tests/weapons.test.ts` for tile collision impact spark**
Verify that when `updateProjectile()` encounters a colliding tile (`index === 1`, `index === 3`, or `collides === true`), it calls `impactFXPool.spawn(x, y)` before deactivating.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/weapons.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement impact trigger in `ProjectilePool.ts`**
Add `impactFXPool?: ImpactFXPool` to `ProjectilePool` and `Projectile`. Trigger `this.impactFXPool.spawn(this.x, this.y)` upon colliding with tile.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/weapons.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/weapons/ProjectilePool.ts tests/weapons.test.ts
git commit -m "feat(weapons): trigger impact spark when projectile hits wall or platform tile"
```

---

### Task 4: Integrate Impact Indicator on Barrier Shield Deflection & Wire in GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/game-loop.test.ts`

**Interfaces:**
- Consumes: `ImpactFXPool` in `GameScene`
- Triggers: `impactFXPool.spawn(proj.x, proj.y)` when enemy bullet hits active player barrier.

- [ ] **Step 1: Write unit test in `tests/game-loop.test.ts` for barrier deflection spark**
Verify that when an enemy bullet hits the player with `isBarrierActive = true`, the impact spark is spawned at bullet coordinates.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/game-loop.test.ts`
Expected: FAIL.

- [ ] **Step 3: Wire `ImpactFXPool` in `GameScene.ts`**
- Initialize `this.impactFXPool = new ImpactFXPool(this);` in `GameScene.create()`.
- Pass it to `this.projectilePool.impactFXPool = this.impactFXPool;`.
- In `handleCollisions()`, trigger `this.impactFXPool.spawn(proj.x, proj.y)` when barrier absorbs enemy bullet.
- In `triggerRoomTransition()` or clear methods, clear active sparks if appropriate.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/game-loop.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/scenes/GameScene.ts tests/game-loop.test.ts
git commit -m "feat(combat): wire impact pool in GameScene for barrier and obstacle impacts"
```

---

### Task 5: Full Regression Testing & Typecheck Verification

**Files:**
- All touched files

- [ ] **Step 1: Run full test suite**
Run: `npm test`
Expected: 100% tests passing.

- [ ] **Step 2: Run TypeScript typecheck**
Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Run build verification**
Run: `npm run build`
Expected: Clean Vite production build.
