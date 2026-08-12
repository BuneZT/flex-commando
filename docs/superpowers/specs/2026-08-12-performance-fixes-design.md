# Design Specification: Performance Optimization, Room Culling, and Frame Locking

**Date:** 2026-08-12  
**Target Project:** `flex-commando`  
**Status:** Approved  

---

## 1. Executive Summary

This document specifies the technical design for resolving low FPS, stuttering, and garbage collection pauses in `flex-commando` during heavy combat (high bullet and enemy density). 

Key optimizations include:
1. **Camera-Synchronized Active Room Enemy Culling** to disable, hide, and remove off-screen room entities from the Phaser Arcade Physics simulation.
2. **Zero-Allocation Primitive AABB Collision Detection** to replace `getBounds()` transient geometry object instantiations.
3. **Direct Array Pool Iteration & In-place Buffer Reuse** to eliminate array filter allocations in update loops.
4. **Target Frame Rate Lock (60 FPS)** in Phaser core configuration to stabilize delta updates across high-refresh monitors.

---

## 2. System Architecture & Component Design

### 2.1 Room-Based Entity Lifecycle & Spatial Culling

#### Component: `CameraManager` & `GameScene`
- **Grid Mapping**: Each enemy instance determines its grid cell coordinates `(gridX, gridY)` using `Math.floor(x / 320)` and `Math.floor(y / 240)`.
- **Culling Logic**: `CameraManager` exposes `cullEnemies(enemies: EnemyBase[])`:
  - Active condition: `enemy.isAlive === true` AND `(enemy.gridX === currentGridX && enemy.gridY === currentGridY)`.
  - During camera panning: keep both source room and target room entities active.
  - Active enemies: `enemy.setActive(true).setVisible(true)`, `if (enemy.body) enemy.body.enable = true`.
  - Culled enemies: `enemy.setActive(false).setVisible(false)`, `if (enemy.body) enemy.body.enable = false`.
- **Update Loop Protection**: `GameScene.update()` calls `cullEnemies()` before enemy AI updates. `enemy.updateAI()` and physics collisions are skipped for inactive enemies.

---

### 2.2 Zero-Allocation Primitive AABB Collision Engine

#### Component: `GameScene.ts` (`checkOverlap`)
- **Primitive Math Overlap**: Replaces `a.getBounds()` and `b.getBounds()` (which allocate `Phaser.Geom.Rectangle` objects every call) with direct numerical AABB comparisons:
  ```typescript
  private checkOverlap(
    a: { x: number; y: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number; body?: any },
    b: { x: number; y: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number; body?: any },
    padding: number = 4
  ): boolean {
    const wA = a.body ? a.body.width : (a.displayWidth || a.width || 16);
    const hA = a.body ? a.body.height : (a.displayHeight || a.height || 16);
    const wB = b.body ? b.body.width : (b.displayWidth || b.width || 16);
    const hB = b.body ? b.body.height : (b.displayHeight || b.height || 16);

    const halfW = (wA + wB) / 2 + padding;
    const halfH = (hA + hB) / 2 + padding;

    return Math.abs(a.x - b.x) <= halfW && Math.abs(a.y - b.y) <= halfH;
  }
  ```
- **Heap Allocation Overhead**: 0 bytes of memory allocated per overlap check call.

---

### 2.3 Pool Iteration, Closure Elimination & Bullet Room Culling

#### Component: `ProjectilePool` & `GameScene`
- **Direct Pool Iteration**: `GameScene.handleCollisions()` iterates directly over `this.projectilePool.pool` with a `for` loop and `if (!proj.active) continue`, avoiding `.filter()` array creations per frame.
- **In-Place Buffer Signature**: `getActiveProjectiles(outArray?: Projectile[])` populates `outArray` in-place when supplied, preserving signature compatibility for existing Vitest tests.
- **Bullet Room Boundary Culling**: `Projectile.updateProjectile()` deactivates bullets if they travel past active room boundaries (or world bounds).
- **Closure-Free Scanners**: `update()` replaces `.every()` with an indexed `for` loop scanning `enemies[i].isAlive` to avoid closure allocations every frame.

---

### 2.4 Target Frame Rate Lock (60 FPS)

#### Component: `GameConfig.ts`
- Lock target FPS to 60 with smooth step rendering:
  ```typescript
  export const GameConfig: Phaser.Types.Core.GameConfig = {
    // ...
    fps: {
      target: 60,
      smoothStep: true,
    },
    // ...
  };
  ```

---

## 3. Verification & Testing Strategy

1. **Vitest Unit Tests**: All 15 existing test files (`tests/*.test.ts`) must pass cleanly (`npm test`).
2. **TypeScript Strict Type Check**: `npx tsc --noEmit` must pass with zero errors.
3. **New Culling Tests**: Verify that `CameraManager.cullEnemies()` properly toggles active/visible/body state based on room coordinates.
