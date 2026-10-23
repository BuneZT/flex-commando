# Room Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the player from exiting a room until all enemies in that room are defeated, using energy barrier doors that block player movement and detonate bullets, unlocking with an audio cue when cleared.

**Architecture:** Pure logic module `RoomLockdown.ts` calculates door barrier bounding boxes and room cleared state decoupled from Phaser. `GameScene.ts` manages a pool of barrier physics sprites, establishes collision with the player, detonates colliding bullets with impact FX, and unlocks barriers when the final enemy in the room is defeated.

**Tech Stack:** TypeScript, Phaser 3.80+ (Arcade Physics), Vitest (happy-dom).

## Global Constraints
- Decoupled pure logic functions headlessly tested via Vitest without Phaser device dependencies.
- Zero runtime GC overhead: preloaded static assets only (`tileset` frame 4 with tint, `sfx_pickup`). No dynamic texture generation or Web Audio synthesis.
- Reusable static barrier sprite pool (maximum 4 barriers at any time).

---

### Task 1: Decoupled Pure Module `RoomLockdown.ts` & Unit Tests

**Files:**
- Create: `src/core/RoomLockdown.ts`
- Test: `tests/room-lockdown.test.ts`

**Interfaces:**
- Produces:
  - `export interface BarrierConfig { direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'; x: number; y: number; width: number; height: number; }`
  - `export function getRoomDoorBarriers(gridX: number, gridY: number, doors: { north?: boolean; south?: boolean; east?: boolean; west?: boolean }, roomWidthPx?: number, roomHeightPx?: number): BarrierConfig[]`
  - `export function isRoomCleared(enemies: { x: number; y: number; isAlive: boolean }[], gridX: number, gridY: number, roomWidthPx?: number, roomHeightPx?: number): boolean`
  - `export function getLivingEnemiesInRoom<T extends { x: number; y: number; isAlive: boolean }>(enemies: T[], gridX: number, gridY: number, roomWidthPx?: number, roomHeightPx?: number): T[]`
  - `export function clampPlayerInsideRoom(playerX: number, playerY: number, gridX: number, gridY: number, roomWidthPx?: number, roomHeightPx?: number, margin?: number): { x: number; y: number }`

- [ ] **Step 1: Write the failing tests in `tests/room-lockdown.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  getRoomDoorBarriers,
  isRoomCleared,
  getLivingEnemiesInRoom,
  clampPlayerInsideRoom,
} from '../src/core/RoomLockdown';

describe('RoomLockdown pure module', () => {
  it('returns correct barrier configs for all 4 doors', () => {
    const barriers = getRoomDoorBarriers(1, 1, { north: true, south: true, east: true, west: true });
    expect(barriers).toHaveLength(4);

    const west = barriers.find(b => b.direction === 'WEST');
    expect(west).toBeDefined();
    expect(west?.x).toBe(512 + 16);
    expect(west?.y).toBe(288 + 224);
    expect(west?.width).toBe(32);
    expect(west?.height).toBe(96);

    const east = barriers.find(b => b.direction === 'EAST');
    expect(east).toBeDefined();
    expect(east?.x).toBe(512 + 496);
    expect(east?.y).toBe(288 + 224);
    expect(east?.width).toBe(32);
    expect(east?.height).toBe(96);

    const north = barriers.find(b => b.direction === 'NORTH');
    expect(north).toBeDefined();
    expect(north?.x).toBe(512 + 256);
    expect(north?.y).toBe(288 + 8);
    expect(north?.width).toBe(64);
    expect(north?.height).toBe(16);

    const south = barriers.find(b => b.direction === 'SOUTH');
    expect(south).toBeDefined();
    expect(south?.x).toBe(512 + 256);
    expect(south?.y).toBe(288 + 280);
    expect(south?.width).toBe(64);
    expect(south?.height).toBe(16);
  });

  it('correctly determines if room is cleared', () => {
    const enemies = [
      { x: 100, y: 100, isAlive: true }, // Room (0, 0)
      { x: 600, y: 100, isAlive: false }, // Room (1, 0)
    ];

    expect(isRoomCleared(enemies, 0, 0)).toBe(false);
    expect(isRoomCleared(enemies, 1, 0)).toBe(true);
    expect(isRoomCleared(enemies, 2, 2)).toBe(true); // Empty room
  });

  it('filters living enemies in specific room', () => {
    const e1 = { x: 100, y: 100, isAlive: true };
    const e2 = { x: 200, y: 100, isAlive: true };
    const e3 = { x: 150, y: 100, isAlive: false };
    const e4 = { x: 600, y: 100, isAlive: true };

    const living = getLivingEnemiesInRoom([e1, e2, e3, e4], 0, 0);
    expect(living).toEqual([e1, e2]);
  });

  it('clamps player coordinates inside room bounds', () => {
    // Room (1, 1) has bounds [512..1024, 288..576]
    const clampedWest = clampPlayerInsideRoom(515, 400, 1, 1, 512, 288, 36);
    expect(clampedWest.x).toBe(512 + 36);

    const clampedEast = clampPlayerInsideRoom(1020, 400, 1, 1, 512, 288, 36);
    expect(clampedEast.x).toBe(1024 - 36);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/room-lockdown.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/core/RoomLockdown.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/room-lockdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/RoomLockdown.ts tests/room-lockdown.test.ts
git commit -m "feat(core): add RoomLockdown pure spatial calculations and test suite"
```

---

### Task 2: GameScene Room Barrier Pool & Player Collision

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Test: `tests/game-scene-lockdown.test.ts`

**Interfaces:**
- Consumes: `RoomLockdown` (`getRoomDoorBarriers`, `isRoomCleared`, `clampPlayerInsideRoom`)
- Produces:
  - `public roomBarriers: Phaser.Physics.Arcade.Sprite[]`
  - `public roomBarrierGroup?: Phaser.Physics.Arcade.StaticGroup`
  - `public updateRoomLockdown(gridX: number, gridY: number): void`
  - `public unlockRoomBarriers(): void`

- [ ] **Step 1: Write integration tests in `tests/game-scene-lockdown.test.ts`**

Test room barrier initialization, barrier activation on uncleared room, collider setup with player, and barrier deactivation when room is cleared.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game-scene-lockdown.test.ts`
Expected: FAIL

- [ ] **Step 3: Integrate barrier pool and player collision in `src/scenes/GameScene.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game-scene-lockdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts tests/game-scene-lockdown.test.ts
git commit -m "feat(scene): add barrier physics pool and player room confinement"
```

---

### Task 3: Bullet Collision with Barriers & Room Unlock Sound Trigger

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Test: `tests/game-scene-lockdown.test.ts`

**Interfaces:**
- In `handleCollisions()`:
  - Bullet vs Active Barrier: detonate bullet, call `impactFXPool.spawn()`, deactivate bullet.
  - Enemy killed: check `isRoomCleared(this.enemies, currentGridX, currentGridY)`. If true, call `unlockRoomBarriers()`, which plays `SoundManager.getInstance().playSfx('pickup')` and disables barriers.

- [ ] **Step 1: Add bullet barrier collision and defeat unlock tests to `tests/game-scene-lockdown.test.ts`**

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game-scene-lockdown.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement bullet collision and unlock logic in `GameScene.ts`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game-scene-lockdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts tests/game-scene-lockdown.test.ts
git commit -m "feat(combat): detonate bullets on barriers and trigger unlock chime on last enemy defeat"
```

---

### Task 4: Complete Verification & Build Check

**Files:**
- None (verification)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS (all tests pass)

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 3: Run Vite build**

Run: `npm run build`
Expected: PASS (dist generated successfully)
