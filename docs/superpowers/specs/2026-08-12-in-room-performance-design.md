# Design Specification: In-Room Performance & Audio Optimization

**Date:** 2026-08-12  
**Target Project:** `flex-commando`  
**Status:** Approved  

---

## 1. Executive Summary

This specification outlines technical optimizations to eliminate remaining micro-stutters during heavy combat inside a single room containing many bullets and enemies.

Key improvements:
1. **Active Enemy Cache**: Restrict collision loops in `GameScene` to `activeEnemies` (~5-10 enemies) rather than scanning all level enemies (~56).
2. **Active-Room Bullet Boundary Culling**: Instantly deactivate projectiles that fly past active camera room boundaries (+32px margin), preventing off-screen bullets from updating physics.
3. **Web Audio Buffer Pre-Allocation & SFX Throttling**: Pre-allocate white noise audio buffers during engine startup and throttle multi-bullet SFX calls within a 25ms window to prevent audio thread node congestion.

---

## 2. System Architecture & Component Design

### 2.1 Active Enemy Cache & Active-Room Bullet Culling

#### Component: `CameraManager`, `GameScene`, `ProjectilePool`
- **Active Enemy Cache**:
  - `CameraManager.cullEnemies(enemies: EnemyBase[]): EnemyBase[]` returns `activeEnemies: EnemyBase[]`.
  - `GameScene` maintains `this.activeEnemies: EnemyBase[]`.
  - `GameScene.handleCollisions()` iterates `this.activeEnemies` instead of `this.enemies`.
- **Active-Room Bullet Boundary Culling**:
  - `CameraManager` provides `getActiveBoundsMargin(marginPx: number = 32): RoomBounds`.
  - `ProjectilePool.update(time, delta, bounds?: RoomBounds)` passes bounds to `proj.updateProjectile(time, delta, bounds)`.
  - `Projectile.updateProjectile()` deactivates the bullet if its coordinates fall outside `bounds`.

---

### 2.2 Web Audio Buffer Pre-Allocation & SFX Throttling

#### Component: `SoundManager`
- **Static Buffer Pre-Allocation**:
  - Pre-allocate a 1-second 44.1kHz stereo/mono white noise `AudioBuffer` (`this.noiseBuffer`) inside `initAudioContext()`.
  - `playFlameSound()` and snare drum synthesis reuse `this.noiseBuffer` instead of calling `createBuffer()` on every shot.
- **Sound Effect Rate Throttling**:
  - Maintain `lastSfxTimes: Map<string, number>`.
  - `playShoot(weaponType, isPlayerBullet)` checks if `currentTime - lastTime < 0.025` (25ms). If true, skips creating duplicate sound node chains for simultaneous projectiles.

---

## 3. Verification & Testing Strategy

1. **Vitest Unit Tests**: All 16 existing test suites + new tests for audio buffer reuse, SFX throttling, and bullet room culling must pass (`npm test`).
2. **TypeScript Strict Check**: `npx tsc --noEmit` must pass with 0 errors.
