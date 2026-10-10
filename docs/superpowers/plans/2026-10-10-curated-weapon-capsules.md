# Curated Weapon Capsule Placement & Drop Rarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drastically reduce weapon drop frequency and make weapon discovery rewarding by placing weapon capsules exclusively in 2–3 curated rooms (branch dead-ends and pre-boss room) and removing weapon drops from normal enemies.

**Architecture:** Pure function `selectCapsuleRoomCoords` in `GridGenerator.ts` determines capsule rooms from the 4x4 room grid. `GameScene.ts` queries this function during level initialization, removes start-room capsules, and eliminates weapon drops from normal enemy kills.

**Tech Stack:** TypeScript, Phaser 3.80+, Arcade Physics, Vitest (`happy-dom`).

## Global Constraints

- Pure grid calculations must remain decoupled from Phaser rendering and runnable in headless Vitest.
- Weapon capsules count per run must strictly be 2 or 3.
- Normal enemies have a 0% drop rate for weapon items.
- No intrusive UI popups or gameplay interruptions on pickup.

---

### Task 1: Implement `selectCapsuleRoomCoords` with TDD

**Files:**
- Modify: `src/core/GridGenerator.ts`
- Test: `tests/grid-generator.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface RoomCoord {
    x: number;
    y: number;
  }
  export function selectCapsuleRoomCoords(grid: GridCell[][]): RoomCoord[]
  ```

- [ ] **Step 1: Write failing unit tests for `selectCapsuleRoomCoords`**

Add tests in `tests/grid-generator.test.ts`:
```typescript
describe('selectCapsuleRoomCoords', () => {
  it('should select 2 to 3 rooms for weapon capsules across multiple seeds', () => {
    for (const seed of [12345, 99999, 42, 777, 2026]) {
      const grid = generateRoomGrid(seed);
      const coords = selectCapsuleRoomCoords(grid);
      expect(coords.length).toBeGreaterThanOrEqual(2);
      expect(coords.length).toBeLessThanOrEqual(3);

      // Verify no duplicates
      const keys = new Set(coords.map((c) => `${c.x},${c.y}`));
      expect(keys.size).toBe(coords.length);

      // Verify START and BOSS rooms are never selected
      for (const coord of coords) {
        const cell = grid[coord.y][coord.x];
        expect(cell.type).not.toBe('START');
        expect(cell.type).not.toBe('BOSS');
        expect(cell.type).not.toBe('EMPTY');
      }
    }
  });

  it('should prioritize BRANCH rooms and pre-boss PATH room', () => {
    const grid = generateRoomGrid(12345);
    const coords = selectCapsuleRoomCoords(grid);
    const branchCells = grid.flat().filter((c) => c.type === 'BRANCH');
    if (branchCells.length > 0) {
      const selectedBranches = coords.filter((c) => grid[c.y][c.x].type === 'BRANCH');
      expect(selectedBranches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should fallback gracefully to mid-stage PATH room when zero BRANCH rooms exist', () => {
    // Construct a synthetic grid with only START, PATH, and BOSS
    const mockGrid: GridCell[][] = Array.from({ length: 4 }, (_, y) =>
      Array.from({ length: 4 }, (_, x) => ({
        x,
        y,
        type: 'EMPTY' as const,
        doors: { north: false, south: false, east: false, west: false },
        doorMask: 0,
      }))
    );
    mockGrid[0][0].type = 'START';
    mockGrid[0][1].type = 'PATH';
    mockGrid[0][1].doors.west = true;
    mockGrid[0][1].doors.east = true;
    mockGrid[0][2].type = 'PATH';
    mockGrid[0][2].doors.west = true;
    mockGrid[0][2].doors.east = true;
    mockGrid[0][3].type = 'BOSS';
    mockGrid[0][3].doors.west = true;

    const coords = selectCapsuleRoomCoords(mockGrid);
    expect(coords.length).toBe(2);
    expect(coords).toContainEqual({ x: 2, y: 0 }); // Pre-boss
    expect(coords).toContainEqual({ x: 1, y: 0 }); // Mid-path
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/grid-generator.test.ts`  
Expected: FAIL with `selectCapsuleRoomCoords is not defined`.

- [ ] **Step 3: Implement `selectCapsuleRoomCoords` in `src/core/GridGenerator.ts`**

Export interface and implementation:
```typescript
export interface RoomCoord {
  x: number;
  y: number;
}

export function selectCapsuleRoomCoords(grid: GridCell[][]): RoomCoord[] {
  const result: RoomCoord[] = [];
  const flat = grid.flat();

  // 1. Locate BOSS cell
  const bossCell = flat.find((c) => c.type === 'BOSS');

  // 2. Locate pre-boss PATH cell
  let preBossCell: GridCell | undefined;
  if (bossCell) {
    const neighbors: GridCell[] = [];
    if (bossCell.y > 0) neighbors.push(grid[bossCell.y - 1][bossCell.x]);
    if (bossCell.y < 3) neighbors.push(grid[bossCell.y + 1][bossCell.x]);
    if (bossCell.x > 0) neighbors.push(grid[bossCell.y][bossCell.x - 1]);
    if (bossCell.x < 3) neighbors.push(grid[bossCell.y][bossCell.x + 1]);

    preBossCell = neighbors.find((n) => n.type === 'PATH');
  }

  // 3. Locate all BRANCH cells
  const branchCells = flat.filter((c) => c.type === 'BRANCH');

  // Allocate branch rooms (up to 2)
  for (let i = 0; i < Math.min(2, branchCells.length); i++) {
    result.push({ x: branchCells[i].x, y: branchCells[i].y });
  }

  // Add pre-boss room if found and not already included
  if (preBossCell && !result.some((c) => c.x === preBossCell!.x && c.y === preBossCell!.y)) {
    result.push({ x: preBossCell.x, y: preBossCell.y });
  }

  // Fallback if fewer than 2 total capsules selected
  if (result.length < 2) {
    const pathCells = flat.filter(
      (c) =>
        c.type === 'PATH' &&
        !result.some((r) => r.x === c.x && r.y === c.y)
    );
    if (pathCells.length > 0) {
      const midPath = pathCells[Math.floor(pathCells.length / 2)];
      result.push({ x: midPath.x, y: midPath.y });
    }
  }

  return result.slice(0, 3);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/grid-generator.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/GridGenerator.ts tests/grid-generator.test.ts
git commit -m "feat: implement selectCapsuleRoomCoords pure function"
```

---

### Task 2: Integrate Curated Placement & Remove Enemy Drops in `GameScene`

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/game-loop.test.ts`

**Interfaces:**
- Consumes: `selectCapsuleRoomCoords` from `src/core/GridGenerator.ts`

- [ ] **Step 1: Write tests for curated capsule count and zero enemy drops**

In `tests/game-loop.test.ts`:
```typescript
it('should spawn weapon capsules only in curated rooms (2 to 3 per level)', () => {
  const scene = new GameScene();
  scene.create();
  expect(scene.pickupCapsules.length).toBeGreaterThanOrEqual(2);
  expect(scene.pickupCapsules.length).toBeLessThanOrEqual(3);
});

it('should not drop pickup items when regular enemies are killed', () => {
  const scene = new GameScene();
  scene.create();
  const initialItemsCount = scene.pickupItems.length;
  // Trigger kill on first active enemy
  if (scene.activeEnemies.length > 0) {
    const enemy = scene.activeEnemies[0];
    enemy.takeDamage(9999);
    // Execute collision / update cycle or check drop logic
    expect(scene.pickupItems.length).toBe(initialItemsCount);
  }
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/game-loop.test.ts`  
Expected: FAIL (currently `scene.pickupCapsules.length` is 10+).

- [ ] **Step 3: Update `src/scenes/GameScene.ts`**

1. Import `selectCapsuleRoomCoords` from `../core/GridGenerator`.
2. Remove starting room capsule creation:
   Remove lines 172–175:
   ```typescript
   // 10. Spawn flying weapon pickup capsule in starting area
   const startWeapon = getRandomPickupWeapon();
   const capsule = new PickupCapsule(this, startX + 100, startY - 80, startWeapon);
   this.pickupCapsules.push(capsule);
   ```
3. In `spawnRoomEnemies()`:
   Calculate curated rooms before the loop:
   ```typescript
   const capsuleRooms = this.grid ? selectCapsuleRoomCoords(this.grid) : [];
   ```
   Replace lines 243–247 inside room loop with:
   ```typescript
   const shouldSpawnCapsule = capsuleRooms.some((cr) => cr.x === c && cr.y === r);
   if (shouldSpawnCapsule) {
     const roomCapsuleWeapon = getRandomPickupWeapon();
     const roomCapsule = new PickupCapsule(this, roomX + 40, roomY + 70, roomCapsuleWeapon);
     this.pickupCapsules.push(roomCapsule);
   }
   ```
4. Remove normal enemy weapon drop in bullet hit check:
   In `GameScene.ts` line 526–536:
   ```typescript
   if (killed) {
     if (enemy === this.boss) {
       this.triggerVictory();
     }
     // Regular enemies drop nothing
   }
   ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/game-loop.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts tests/game-loop.test.ts
git commit -m "feat: apply curated weapon capsule placement and remove regular enemy drops"
```

---

### Task 3: Regression Verification & Documentation Update

**Files:**
- Modify: `docs/GAME_MANUAL.md`

- [ ] **Step 1: Run full test suite & typecheck**

Run: `npm test`  
Run: `npx tsc --noEmit`  
Expected: All test suites pass, 0 type errors.

- [ ] **Step 2: Update `docs/GAME_MANUAL.md`**

Update Weapon Pickup section in `docs/GAME_MANUAL.md` to document:
- Weapons are rare discoveries placed in 2–3 curated rooms per run (branch dead-ends and pre-boss staging room).
- Regular enemies no longer drop weapons.
- Players start with the Pea Shooter and discover upgrades by exploring.

- [ ] **Step 3: Commit**

```bash
git add docs/GAME_MANUAL.md
git commit -m "docs: update GAME_MANUAL for curated weapon drops"
```
