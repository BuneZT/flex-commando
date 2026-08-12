# Design Specification: Deep Engine Performance & HUD Memoization

**Date:** 2026-08-12  
**Target Project:** `flex-commando`  
**Status:** Approved  

---

## 1. Executive Summary

This specification addresses deep micro-optimizations across HUD rendering, physics sprite synchronization, tilemap collision indexing, and pickup item iteration loops.

Key improvements:
1. **HUD Memoization & Dirty-State Guarding**: Prevent text texture redraws and minimap canvas clears when UI state has not changed.
2. **FalconDrone Physics Velocity Integration**: Replace manual `body.updateFromGameObject()` sync with direct `body.setVelocityY()` calls.
3. **Active Pickup Capsule / Item Filtering**: Skip inactive pickup items early in bullet collision loops.
4. **Tilemap Native Bulk Collision Indexing**: Replace tile-by-tile loops in `TilemapRenderer` with bulk Phaser `map.setCollision()` indexing.

---

## 2. System Architecture & Component Design

### 2.1 HUD Memoization (`HUD.ts`)
- **State Caching**:
  - `lastLivesStr: string`, `lastWeaponStr: string`, `lastBossHpStr: string`, `lastGridX: number`, `lastGridY: number`.
- **Dirty Checks**:
  - Call `setText()` and `renderMinimap()` only when formatted string or room coordinates change.

---

### 2.2 FalconDrone Physics Velocity (`FalconDrone.ts`)
- **Velocity Integration**:
  - Calculate vertical velocity `vy` from sine derivative:
    `const vy = Math.cos(this.elapsedTime * this.frequency) * this.amplitude * this.frequency * 1000;`
  - Call `body.setVelocity(vx, vy)` instead of manually setting `this.y` and calling `body.updateFromGameObject()`.

---

## 3. Verification Strategy

1. **Vitest Unit Tests**: All 16 test files must pass (`npm test`).
2. **TypeScript Strict Check**: `npx tsc --noEmit` must return 0 errors.
3. **Production Build**: `npm run build` must compile cleanly.
