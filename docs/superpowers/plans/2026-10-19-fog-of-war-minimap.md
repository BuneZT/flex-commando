# Fog of War Minimap Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide unvisited rooms and the Boss room location on the 4x4 HUD minimap, revealing rooms in solid colors only as the player enters them, leaving unvisited space in blank darkness.

**Architecture:** Pure bitmask functions (`getRoomBitIndex`, `markRoomVisited`, `isRoomVisited`, `getMinimapCellColor`) manage 16-room visited state with zero heap allocations. `HUD.update()` tracks a `visitedMask` primitive, triggers `renderMinimap` only on room/discovery changes, and skips rendering unvisited cells.

**Tech Stack:** TypeScript (strict, `noEmit: true`), Phaser 3.80+ (Arcade Physics), Vitest (`happy-dom`).

## Global Constraints

- **Zero Runtime GC Overhead:** Visited state is represented as a single primitive number bitmask (16 bits for a 4x4 grid). No arrays or objects allocated per frame.
- **Decoupled Pure Logic:** Color resolution and bitmask manipulation functions must be pure and exported for headless Vitest testing without Phaser DOM/Canvas dependencies.
- **Headless Compatibility:** All new methods and tests must pass cleanly in headless Vitest.

---

### Task 1: Pure Bitmask & Minimap Color Resolution Helpers (TDD)

**Files:**
- Modify: `src/ui/HUD.ts`
- Modify: `tests/hud.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export function getRoomBitIndex(gridX: number, gridY: number): number;
  export function markRoomVisited(mask: number, gridX: number, gridY: number): number;
  export function isRoomVisited(mask: number, gridX: number, gridY: number): boolean;
  export function getMinimapCellColor(
    cell: GridCell | null | undefined,
    isVisited: boolean,
    isCurrent: boolean
  ): number | null;
  ```

- [ ] **Step 1: Write failing unit tests in `tests/hud.test.ts`**
  Add test blocks verifying:
  - `getRoomBitIndex` maps `(0,0)->0`, `(3,0)->3`, `(0,1)->4`, `(3,3)->15`.
  - `markRoomVisited` sets the correct bit; `isRoomVisited` returns true for visited and false for unvisited. Out-of-bounds inputs return original mask / false.
  - `getMinimapCellColor`:
    - Unvisited cell returns `null` (even for `START`, `PATH`, or `BOSS`).
    - Unvisited or `null` / `EMPTY` cell returns `null`.
    - Visited `current` cell returns `0x00ff00`.
    - Visited `START` non-current cell returns `0x0088ff`.
    - Visited `PATH` / `BRANCH` non-current cell returns `0x666666`.
    - Visited `BOSS` non-current cell returns `0xff0044`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/hud.test.ts`
  Expected: FAIL (`getRoomBitIndex` / `getMinimapCellColor` not exported or undefined).

- [ ] **Step 3: Implement pure helper functions in `src/ui/HUD.ts`**
  Define and export `getRoomBitIndex`, `markRoomVisited`, `isRoomVisited`, and `getMinimapCellColor`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/hud.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/ui/HUD.ts tests/hud.test.ts
  git commit -m "feat(hud): implement pure room visited bitmask and minimap color helpers"
  ```

---

### Task 2: Integrate Fog of War into HUD Minimap Rendering & Caching (TDD)

**Files:**
- Modify: `src/ui/HUD.ts`
- Modify: `tests/hud.test.ts`

**Interfaces:**
- Consumes: Pure helpers from Task 1.
- Produces: Updated `HUD` internal state (`visitedMask`, `lastVisitedMask`) and updated `renderMinimap` honoring `getMinimapCellColor`.

- [ ] **Step 1: Write failing integration tests for HUD Fog of War in `tests/hud.test.ts`**
  Add tests asserting:
  - On frame 1 at `(0,0)`: Only 1 cell rect is drawn (at `startX, startY`) besides the background panel. Cells at `(1,0)` and `(3,0)` (Boss) are NOT drawn.
  - When moving to `(1,0)`: Exactly 2 cell rects are drawn (one at `startX`, one at `startX + cellSize + gap`). Boss cell at `(3,0)` is still NOT drawn.
  - When moving to `(3,0)` (Boss room): Boss cell is now drawn with `0x00ff00` (active) and remains drawn if player moves back.
  - If player remains in same room, `minimapGraphics.clear()` is NOT called (dirty-checking preserved).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/hud.test.ts`
  Expected: FAIL (currently all non-null cells are rendered unconditionally).

- [ ] **Step 3: Update `HUD.ts` state and `renderMinimap`**
  - Add `private visitedMask: number = 0;` and `private lastVisitedMask: number = -1;`.
  - In `HUD.update(...)`, update `this.visitedMask = markRoomVisited(this.visitedMask, currentGridX, currentGridY);`.
  - In dirty-check condition: check `currentGridX !== this.lastMinimapGridX || currentGridY !== this.lastMinimapGridY || this.visitedMask !== this.lastVisitedMask`.
  - In `renderMinimap`: for each `r` (0..3), `c` (0..3):
    - Compute `isVisited = isRoomVisited(this.visitedMask, c, r)`.
    - Compute `color = getMinimapCellColor(cell, isVisited, c === currentGridX && r === currentGridY)`.
    - If `color === null`: continue (do not draw rect).
    - If `color !== null`: draw cell fill rect with `color`.
    - If `c === currentGridX && r === currentGridY`: draw active room border `strokeRect`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/hud.test.ts`
  Expected: PASS.

- [ ] **Step 5: Run all unit tests and TypeScript type check**
  Run:
  `npm test`
  `npx tsc --noEmit`
  Expected: All 22+ test suites pass, 0 type errors.

- [ ] **Step 6: Commit**
  ```bash
  git add src/ui/HUD.ts tests/hud.test.ts
  git commit -m "feat(hud): add fog of war room reveal to minimap graphics"
  ```
