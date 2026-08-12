# Performance Optimization & Room Culling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate FPS drops, stuttering, and GC pauses during heavy combat by implementing 60 FPS locking, camera-synchronized room enemy culling, zero-allocation primitive AABB collision math, and in-place projectile pool iteration.

**Architecture:** Extend `CameraManager` with active room culling logic that toggles `active`, `visible`, and physics body enablement for room entities based on current grid coordinates. Refactor `GameScene` collision checks to use zero-allocation AABB numerical comparisons and direct pool iteration.

**Tech Stack:** TypeScript, Phaser 3 Arcade Physics, Vitest (`happy-dom`).

## Global Constraints

- **FPS Target**: Lock target FPS to 60 with `smoothStep: true` in Phaser core config.
- **Allocation Budget**: 0 bytes heap allocation per collision check frame.
- **Headless Compatibility**: Use optional chaining on physics bodies (`enemy.body?.enable = ...`) to preserve Vitest compatibility.
- **Testing**: All 15 existing Vitest test suites must remain 100% green (`npx vitest run`).

---

### Task 1: Frame Rate Lock (60 FPS) in GameConfig

**Files:**
- Modify: `src/config/GameConfig.ts`
- Modify: `tests/config.test.ts`

**Interfaces:**
- Consumes: `Phaser.Types.Core.GameConfig`
- Produces: `GameConfig` export with `fps` settings

- [ ] **Step 1: Write failing test for GameConfig FPS settings**

Add assertion to `tests/config.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GameConfig } from '../src/config/GameConfig';

describe('GameConfig', () => {
  it('should include target 60 fps configuration', () => {
    expect(GameConfig.fps).toBeDefined();
    expect(GameConfig.fps?.target).toBe(60);
    expect(GameConfig.fps?.smoothStep).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL (`GameConfig.fps` is undefined)

- [ ] **Step 3: Update GameConfig.ts**

Update `src/config/GameConfig.ts`:
```typescript
import type Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { GameOverScene } from '../scenes/GameOverScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: 0, // Phaser.AUTO
  parent: 'game-container',
  width: 320,
  height: 240,
  pixelArt: true,
  fps: {
    target: 60,
    smoothStep: true,
  },
  scale: {
    mode: 3, // Phaser.Scale.FIT
    autoCenter: 1 // Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 600 },
      debug: false
    }
  },
  scene: [BootScene, MainMenuScene, GameScene, GameOverScene]
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/GameConfig.ts tests/config.test.ts
git commit -m "perf: lock game target fps to 60 in GameConfig"
```

---

### Task 2: Camera-Synchronized Active Room Enemy Culling

**Files:**
- Modify: `src/core/CameraManager.ts`
- Modify: `src/scenes/GameScene.ts`
- Create: `tests/camera-manager-culling.test.ts`

**Interfaces:**
- Consumes: `CameraManager.getCurrentRoom()`, `EnemyBase`
- Produces: `CameraManager.cullEnemies(enemies: EnemyBase[]): void`

- [ ] **Step 1: Write failing test for CameraManager room culling**

Create `tests/camera-manager-culling.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { CameraManager } from '../src/core/CameraManager';
import { EnemyBase } from '../src/entities/enemies/EnemyBase';

class DummyEnemy extends EnemyBase {
  public updateAI(): void {}
}

describe('CameraManager Room Culling', () => {
  it('should activate enemies in active room and deactivate enemies in inactive rooms', () => {
    const mockCamera: any = { setBounds: () => {}, centerOn: () => {} };
    const cameraManager = new CameraManager(mockCamera, 1, 1);

    const sceneMock: any = {};
    const enemyInRoom = new DummyEnemy(sceneMock, 1 * 320 + 50, 1 * 240 + 50);
    const enemyOutRoom = new DummyEnemy(sceneMock, 2 * 320 + 50, 0 * 240 + 50);

    const enemies = [enemyInRoom, enemyOutRoom];
    cameraManager.cullEnemies(enemies);

    expect(enemyInRoom.active).toBe(true);
    expect(enemyInRoom.visible).toBe(true);
    expect(enemyOutRoom.active).toBe(false);
    expect(enemyOutRoom.visible).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/camera-manager-culling.test.ts`
Expected: FAIL (`cullEnemies` is not a function)

- [ ] **Step 3: Implement cullEnemies in CameraManager.ts and integrate into GameScene.ts**

In `src/core/CameraManager.ts`, add method:
```typescript
  public cullEnemies(enemies: { x: number; y: number; isAlive: boolean; setActive: (active: boolean) => any; setVisible: (visible: boolean) => any; body?: any }[]): void {
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;

      const enemyGridX = Math.floor(enemy.x / this.roomWidthPx);
      const enemyGridY = Math.floor(enemy.y / this.roomHeightPx);

      const isActiveRoom = enemyGridX === this.currentGridX && enemyGridY === this.currentGridY;

      enemy.setActive(isActiveRoom);
      enemy.setVisible(isActiveRoom);
      if (enemy.body) {
        enemy.body.enable = isActiveRoom;
      }
    }
  }
```

In `src/scenes/GameScene.ts`:
Call `this.cameraManager.cullEnemies(this.enemies)` inside `update()` after updating camera position:
```typescript
    if (this.cameraManager) {
      this.cameraManager.cullEnemies(this.enemies);
    }
```
And guard enemy AI update:
```typescript
    for (const enemy of this.enemies) {
      if (enemy.isAlive && enemy.active) {
        enemy.updateAI(time, delta, this.player, this.projectilePool);
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/camera-manager-culling.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/CameraManager.ts src/scenes/GameScene.ts tests/camera-manager-culling.test.ts
git commit -m "feat: add active-room spatial culling for enemies in CameraManager"
```

---

### Task 3: Zero-Allocation Primitive AABB Collision Detection & Scan Loop Optimization

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/game-loop.test.ts`

**Interfaces:**
- Consumes: `checkOverlap(a, b, padding)`
- Produces: 0-heap-allocation collision overlap checking and closure-free victory check loop

- [ ] **Step 1: Write test for primitive AABB check overlap**

In `tests/game-loop.test.ts`, add test:
```typescript
  it('should accurately calculate zero-allocation AABB overlap without getBounds', () => {
    const scene = new GameScene();
    const objA = { x: 100, y: 100, width: 16, height: 16 };
    const objB = { x: 105, y: 105, width: 16, height: 16 };
    const objFar = { x: 200, y: 200, width: 16, height: 16 };

    expect((scene as any).checkOverlap(objA, objB, 4)).toBe(true);
    expect((scene as any).checkOverlap(objA, objFar, 4)).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify existing/new tests**

Run: `npx vitest run tests/game-loop.test.ts`

- [ ] **Step 3: Refactor checkOverlap and victory condition check in GameScene.ts**

Update `checkOverlap` in `src/scenes/GameScene.ts`:
```typescript
  private checkOverlap(
    a: { x: number; y: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number; body?: any; getBounds?: () => any },
    b: { x: number; y: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number; body?: any; getBounds?: () => any },
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

Update victory check scan in `update()` in `src/scenes/GameScene.ts`:
```typescript
    // 7.5 Check All Enemies Defeated Victory Condition
    if (!this.isVictory && this.enemies.length > 0) {
      let allDead = true;
      for (let i = 0; i < this.enemies.length; i++) {
        if (this.enemies[i].isAlive) {
          allDead = false;
          break;
        }
      }
      if (allDead) {
        this.triggerVictory();
      }
    }
```

Update `handleCollisions()` in `src/scenes/GameScene.ts` to iterate `projectilePool.pool` directly:
```typescript
  private handleCollisions(): void {
    if (!this.player || !this.projectilePool || this.isGameOver) return;

    // Direct loop over pool array without allocating a filtered array every frame
    for (const proj of this.projectilePool.pool) {
      if (!proj.active) continue;

      if (proj.isPlayerBullet) {
        // Player bullet vs Enemies
        for (const enemy of this.enemies) {
          if (enemy.isAlive && enemy.active) {
            if (this.checkOverlap(proj, enemy, 4)) {
              const killed = enemy.takeDamage(proj.damage);
              if (!proj.piercing) {
                proj.deactivate();
              }

              if (killed && enemy === this.boss) {
                this.triggerVictory();
              }
              break;
            }
          }
        }
// ...
```

- [ ] **Step 4: Run tests to verify all tests pass**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts tests/game-loop.test.ts
git commit -m "perf: zero-allocation AABB collisions and direct projectile pool iteration"
```

---

### Task 4: Projectile Pool Boundary Culling and Verification

**Files:**
- Modify: `src/weapons/ProjectilePool.ts`
- Modify: `tests/weapons.test.ts`

**Interfaces:**
- Consumes: `ProjectilePool`, `Projectile.updateProjectile`
- Produces: Room-boundary bullet deactivation and backward-compatible `getActiveProjectiles(outArray?)`

- [ ] **Step 1: Write test for Projectile boundary culling and in-place buffer**

Add test to `tests/weapons.test.ts`:
```typescript
  it('should support in-place buffer for getActiveProjectiles', () => {
    const sceneMock: any = {};
    const pool = new ProjectilePool(sceneMock, 10);
    pool.spawn(100, 100, 0, 'PEA_SHOOTER', true);

    const buffer: any[] = [];
    const result = pool.getActiveProjectiles(buffer);
    expect(result).toBe(buffer);
    expect(buffer.length).toBe(1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/weapons.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement in-place buffer in ProjectilePool.ts**

Update `getActiveProjectiles` in `src/weapons/ProjectilePool.ts`:
```typescript
  public getActiveProjectiles(outArray?: Projectile[]): Projectile[] {
    if (outArray) {
      outArray.length = 0;
      for (const p of this.pool) {
        if (p.active) {
          outArray.push(p);
        }
      }
      return outArray;
    }
    return this.pool.filter(p => p.active);
  }
```

- [ ] **Step 4: Run full test suite and TypeScript check**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: ALL 16 test files pass cleanly, TypeScript compiles with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/weapons/ProjectilePool.ts tests/weapons.test.ts
git commit -m "perf: add in-place buffer support to ProjectilePool and verify test suite"
```
