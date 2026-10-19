# Bullet Impact Visual Indicator Design Spec

**Date:** 2026-10-19  
**Status:** Approved  
**Topic:** Visual indicators for bullet collisions with solid tiles (walls, ceilings, platforms) and barrier shields.

---

## 1. Overview & Objective

When bullets hit impenetrable obstacles—including solid ground/ceilings (tiles 1 and 3), one-way platforms (tile 2), or the player's active energy barrier—they currently deactivate abruptly with no visual feedback. This feature introduces a zero-GC, retro arcade pixel spark indicator (`tex_bullet_impact`) triggered on all impenetrable collisions.

---

## 2. Architecture & Components

### 2.1 Static Pixel Art Spritesheet & Fallback
* **Asset Path:** `public/assets/vfx/bullet_impact.png` (64x16 px, four 16x16 frames).
  * **Frame 0:** Pinpoint high-contrast white core flash star.
  * **Frame 1:** Expanding yellow-white diamond spark.
  * **Frame 2:** 4-point ricochet ember sparks.
  * **Frame 3:** Dissipating ember dust.
* **Offline Asset Generator:** Added to `scripts/generate-pixel-assets.mjs` via `generateBulletImpact()`.
* **Asset Loading & Headless Fallback:**
  * Preloaded in `src/scenes/BootScene.ts` as `tex_bullet_impact`.
  * Fallback canvas generator in `src/core/TextureFactory.ts` guarded by `if (scene.textures.exists('tex_bullet_impact')) return;`.
  * Registers global animation `'bullet_impact_spark'` (24 fps, complete).
* **Integrity Assertions:** Added to `tests/assets-integrity.test.ts`.

---

### 2.2 Recycled Impact FX Pool (`ImpactFXPool`)
* **Module:** `src/core/ImpactFXPool.ts`
* **Pool Pattern:**
  * Pre-allocates up to `maxSize = 25` `Phaser.GameObjects.Sprite` instances.
  * `spawn(x: number, y: number): Phaser.GameObjects.Sprite | null`:
    1. Reuses the first inactive sprite (`!sprite.active`) or allocates up to `maxSize`.
    2. Positions sprite at `(x, y)`, sets depth to 50, and activates/shows it.
    3. Plays `'bullet_impact_spark'` animation.
    4. On `animationcomplete`, sets `active = false`, `visible = false`.
  * `clear(): void`: Deactivates all pooled sprites (e.g., room change or scene shutdown).
  * Completely headless-compatible and resilient to mocked scenes in Vitest.

---

### 2.3 Collision & Trigger Integration

#### A. Tilemap Obstacle Collision (Walls, Ceilings, Platforms)
* In `src/weapons/ProjectilePool.ts`:
  * Pass `ImpactFXPool` reference to `ProjectilePool` (or assign `projectilePool.impactFXPool = this.impactFXPool`).
  * In `Projectile.updateProjectile()`:
    When a solid tile collision occurs:
    ```typescript
    if (tile && (tile.index === 1 || tile.index === 3 || tile.collides)) {
      this.impactPool?.spawn(this.x, this.y);
      this.deactivate();
      return;
    }
    ```

#### B. Barrier Shield Absorption
* In `src/scenes/GameScene.ts`:
  * When an enemy bullet overlaps the player while `player.isBarrierActive` is true:
    ```typescript
    const absorbed = this.player.hitBarrier();
    if (absorbed) {
      this.impactFXPool.spawn(proj.x, proj.y);
      this.invulnerableTimer = 500;
      return;
    }
    ```

---

## 3. Performance & Memory Mandates
* **Zero Runtime Allocation:** Reuses existing sprite instances from `ImpactFXPool`.
* **Zero Audio Overhead:** Visual spark only; avoids extra audio channels during heavy firefights.
* **Deterministic Behavior:** Fully conforms to Vitest unit test suites.

---

## 4. Verification Plan
1. `npm test` runs all Vitest suites, including new unit tests for `ImpactFXPool` and collision triggers.
2. `tests/assets-integrity.test.ts` validates `bullet_impact.png` file existence and texture/animation registration.
3. `npx tsc --noEmit` verifies strict TypeScript typing.
4. `npm run build` verifies clean Vite bundle production.
