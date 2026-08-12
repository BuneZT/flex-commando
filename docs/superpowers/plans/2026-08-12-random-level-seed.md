# Random Level Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Randomize level layout generation on every game play session by replacing hardcoded seed `12345` with dynamic random seed generation in `GameScene`.

**Architecture:** Extend `GameSceneInitData` with an optional `seed?: number`. `GameScene.init()` generates a 31-bit pseudo-random integer seed when no seed is passed, or uses the passed seed when provided. `GameScene.create()` passes `this.seed` to `generateRoomGrid()`.

**Tech Stack:** TypeScript, Phaser 3, Vitest (`happy-dom`).

## Global Constraints

- Strictly typed TypeScript (`noEmit: true`).
- All existing 67 tests must remain passing.
- Deterministic seed testing must be preserved when explicit seed is passed.

---

### Task 1: Add seed support and randomization to GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts:18-75`
- Create: `tests/game-scene-seed.test.ts`

**Interfaces:**
- Consumes: `generateRoomGrid(seed: number)` from `src/core/GridGenerator.ts`
- Produces: `GameSceneInitData` with `seed?: number`, `GameScene.seed: number`

- [ ] **Step 1: Write the failing unit test**

Create `tests/game-scene-seed.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GameScene } from '../src/scenes/GameScene';

describe('GameScene Level Seed Randomization', () => {
  it('should generate a random seed when no seed is provided in init()', () => {
    const scene1 = new GameScene();
    scene1.init();
    expect(typeof scene1.seed).toBe('number');
    expect(scene1.seed).toBeGreaterThanOrEqual(0);

    const scene2 = new GameScene();
    scene2.init();
    expect(typeof scene2.seed).toBe('number');
  });

  it('should use explicit seed when provided in init()', () => {
    const scene = new GameScene();
    scene.init({ seed: 42 });
    expect(scene.seed).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/game-scene-seed.test.ts`
Expected: FAIL (property `seed` does not exist on `GameScene`).

- [ ] **Step 3: Implement seed logic in GameScene.ts**

Modify `src/scenes/GameScene.ts`:
```typescript
export interface GameSceneInitData {
  infiniteLives?: boolean;
  seed?: number;
}

export class GameScene extends Phaser.Scene {
  public infiniteLives: boolean = false;
  public seed: number = 0;
  // ...
```

In `init(data?: GameSceneInitData)`:
```typescript
  init(data?: GameSceneInitData): void {
    this.infiniteLives = !!data?.infiniteLives;
    this.seed = (data?.seed !== undefined && data?.seed !== null)
      ? data.seed
      : Math.floor(Math.random() * 2147483647);
  }
```

In `create()`:
```typescript
    // 1. Generate room grid
    this.grid = generateRoomGrid(this.seed);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game-scene-seed.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite & typecheck**

Run: `npm test; npx tsc --noEmit`
Expected: All 68 tests PASS, zero type errors.

- [ ] **Step 6: Commit**

Run: `git add src/scenes/GameScene.ts tests/game-scene-seed.test.ts; git commit -m "feat: randomize level seed on game start"`
