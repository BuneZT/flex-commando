# Design Document: Curated Weapon Capsule Placement & Drop Rarity

**Date:** 2026-10-10  
**Status:** Approved  
**Author:** AI Pair Programmer & User  

---

## 1. Problem Statement

In `Flex Commando: Rogue Beef`, weapon drops occur excessively frequently:
1. A weapon capsule spawns in the starting room.
2. A weapon capsule spawns in every single `PATH` and `BRANCH` room (resulting in 10+ flying capsules per run).
3. Normal enemies drop a weapon badge with a 20% chance on death (`Math.random() < 0.2`). With ~4 enemies per room, another ~8 weapons drop across the run.

Because of this constant flood of weapon drops, finding a new weapon feels mundane rather than an exciting discovery, and players frequently overwrite weapons unintentionally.

---

## 2. Goals & Design Decisions

* **Eliminate Enemy Weapon Drops:** Normal enemies will no longer drop weapon items (`PickupItem`) on death (0% drop chance).
* **Remove Start Room Capsule:** The player starts equipped with the default Pea Shooter and must explore to discover weapon upgrades.
* **Curated Placement (2–3 Capsules Per Run):**
  * Weapon capsules will be placed in optional `BRANCH` rooms (dead-ends off the main route), rewarding players who explore.
  * 1 weapon capsule will be placed in the pre-boss staging room (the `PATH` room directly connected to the `BOSS` room).
  * If a generated grid contains zero `BRANCH` rooms, a fallback mechanism will select a mid-stage `PATH` room so every run always contains 2–3 weapon capsules.
* **Keep Pickup Mechanics Clean:** No additional popups or intrusive UI clutter; picking up a weapon remains fast and responsive.

---

## 3. Architecture & Implementation

### 3.1 Pure Function: `selectCapsuleRoomCoords`

In `src/core/GridGenerator.ts`:
```typescript
export interface RoomCoord {
  x: number;
  y: number;
}

export function selectCapsuleRoomCoords(grid: GridCell[][]): RoomCoord[]
```

**Selection Algorithm:**
1. Locate the `BOSS` room coordinates `(bossX, bossY)`.
2. Locate the pre-boss room: find any `PATH` cell that connects to the `BOSS` room (sharing an open door with the boss room). If multiple or none found, fallback to the path cell with highest `x`.
3. Locate all `BRANCH` rooms `(x, y)` where `cell.type === 'BRANCH'`.
4. If `branchRooms.length >= 2`: take up to 2 branch rooms and the pre-boss room (total 2–3 capsules).
5. If `branchRooms.length === 1`: take the 1 branch room, the pre-boss room, and (if available) an early/mid-stage path room (total 3 capsules).
6. If `branchRooms.length === 0`: select a mid-stage path room (halfway between start and boss) plus the pre-boss room (total 2 capsules).
7. Ensure no duplicate room coordinates in the returned list.

### 3.2 Update `GameScene.ts`

1. **Remove Start Room Capsule:**
   Remove line 173–175 in `GameScene.ts` that spawns a capsule in the starting area.
2. **Curated Room Spawning in `spawnRoomEnemies`:**
   * Compute capsule rooms: `const capsuleRooms = selectCapsuleRoomCoords(this.grid);`
   * Only spawn a `PickupCapsule` in `(c, r)` if `(c, r)` matches an entry in `capsuleRooms`.
3. **Remove Normal Enemy Weapon Drops:**
   In `GameScene.ts` bullet collision handler against enemies:
   * Remove the `else if (Math.random() < 0.2) { const droppedItem = new PickupItem(...); ... }` block when killing regular enemies. Regular enemies drop nothing.

---

## 4. Verification & Testing

1. **Unit Tests in `tests/grid-generator.test.ts`:**
   * Test `selectCapsuleRoomCoords` across multiple grid seeds.
   * Verify that:
     * Capsule count is consistently 2 or 3 across different seeds.
     * The start room is never selected.
     * The boss room is never selected.
     * Branch rooms and pre-boss room are appropriately prioritized.
     * Zero-branch edge cases fallback cleanly to mid-path rooms.
2. **Unit Tests in `tests/game-loop.test.ts` / `tests/enemy.test.ts`:**
   * Verify regular enemy deaths do not instantiate or drop `PickupItem`.
3. **Full Test Suite:**
   * Run `npm test` and `npx tsc --noEmit` to ensure zero regressions across all 18 test suites.
