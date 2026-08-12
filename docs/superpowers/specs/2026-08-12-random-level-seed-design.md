# Random Level Seed Design Specification

* **Date:** 2026-08-12
* **Target Issue:** Fixed level layout on every game start (`generateRoomGrid(12345)` hardcoded seed).

---

## 1. Goal

Ensure that starting or restarting a game in `flex-commando` generates a random level layout on every play session, while maintaining the ability to pass explicit seeds for deterministic testing and debugging.

---

## 2. Architecture & Data Flow

### 2.1 Interface & State Changes (`src/scenes/GameScene.ts`)
- Extend `GameSceneInitData`:
  ```typescript
  export interface GameSceneInitData {
    infiniteLives?: boolean;
    seed?: number;
  }
  ```
- Add `public seed: number = 0;` to `GameScene`.

### 2.2 Initialization & Generation (`GameScene.ts`)
- In `init(data?: GameSceneInitData)`:
  - If `data?.seed` is defined and non-null, assign `this.seed = data.seed`.
  - Otherwise, generate a random non-negative 31-bit integer seed: `Math.floor(Math.random() * 2147483647)`.
- In `create()`:
  - Replace `this.grid = generateRoomGrid(12345)` with `this.grid = generateRoomGrid(this.seed)`.

### 2.3 Scene Callers (`MainMenuScene.ts`, `GameOverScene.ts`)
- Callers invoking `this.scene.start('GameScene', ...)` do not need to generate seeds explicitly unless testing specific seeds. `GameScene` will automatically generate a new random seed on every launch.

---

## 3. Testing Strategy

1. **Unit Tests (`tests/game-scene-seed.test.ts`)**:
   - Test that calling `GameScene.init()` without a `seed` assigns a random integer seed.
   - Test that calling `GameScene.init({ seed: 42 })` sets `this.seed` to `42`.
   - Test that `GameScene.create()` builds a grid using `this.seed`.
2. **Regression Verification**:
   - Run `npm test` and `npx tsc --noEmit` to verify zero type errors and all tests pass.
