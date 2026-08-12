# Design Specification: Room Entry & Physics Group Optimization

**Date:** 2026-08-12  
**Target Project:** `flex-commando`  
**Status:** Approved  

---

## 1. Executive Summary

This specification addresses the frame hitch when transitioning into a new room cell.

Key improvements:
1. **Unified Enemy Physics Group**: Replace 56 individual enemy-to-tilemap colliders with a single `Phaser.Physics.Arcade.Group` collider.
2. **Camera Pan Viewport Clamping**: Clamp camera bounds during 400ms room transitions to the union bounding box of the current and target rooms.
3. **Pre-Warmed Sprite Animations**: Pre-initialize enemy sprite animations during boot scene generation to avoid frame-1 allocation hitches.

---

## 2. System Architecture & Component Design

### 2.1 Unified Enemy Physics Group

#### Component: `GameScene.ts`
- **Group Initialization**:
  - `this.enemyGroup = this.physics.add.group()` created during `GameScene.create()`.
  - All spawned enemies added to `this.enemyGroup`.
  - Single collider added: `this.physics.add.collider(this.enemyGroup, groundLayer)`.
- **Performance Impact**: Reduces Phaser physics collision array overhead from 56 colliders down to 1.

---

### 2.2 Camera Pan Viewport Clamping

#### Component: `CameraManager.ts`
- **Union Bounding Box**:
  - When transitioning from `(fromGridX, fromGridY)` to `(toGridX, toGridY)`, compute union rectangle:
    `minX = Math.min(fromGridX, toGridX) * 320`, `maxX = (Math.max(fromGridX, toGridX) + 1) * 320`,
    `minY = Math.min(fromGridY, toGridY) * 240`, `maxY = (Math.max(fromGridY, toGridY) + 1) * 240`.
  - Set `camera.setBounds(minX, minY, maxX - minX, maxY - minY)` during the pan duration.
  - Re-clamp to target room bounds when pan completes.

---

## 3. Verification Strategy

1. **Vitest Unit Tests**: All 16 test files must pass cleanly (`npm test`).
2. **TypeScript Strict Check**: `npx tsc --noEmit` must return 0 errors.
3. **Production Build**: `npm run build` must compile cleanly.
