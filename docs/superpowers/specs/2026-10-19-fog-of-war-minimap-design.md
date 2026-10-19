# Fog of War Minimap Progression Design Spec

**Date:** 2026-10-19  
**Status:** Approved  
**Topic:** Fog of War room discovery and progression on the 4x4 HUD minimap.

---

## 1. Overview & Objective

In `flex-commando`, the player traverses a 4x4 matrix grid of interconnected rooms. Previously, the HUD minimap rendered all generated rooms immediately from frame 0—including the START room (blue), all PATH/BRANCH rooms (gray), and the BOSS room (red). This revealed the entire level topology and the boss's exact location at the start of each run.

This feature implements a strict **Fog of War** room progression system on the HUD minimap:
* Unvisited rooms remain hidden in blank darkness (no outlines, blending with the minimap panel background).
* A room is revealed only when the player enters it.
* The Boss room icon (`0xff0044` red) remains hidden until the player actually steps into the Boss chamber.
* Once visited, rooms remain revealed for the remainder of the run.
* Conforms strictly to zero-GC and decoupled architecture guidelines in `AGENTS.md`.

---

## 2. Architecture & Data Model

### 2.1 Visited Rooms Bitmask & Pure Functions
Because the world is strictly a 4x4 room grid (16 cells total), visited state is modeled as a 16-bit unsigned integer bitmask (`0x0000` to `0xFFFF`).

Pure helper functions in `src/ui/HUD.ts` (or standalone utility):
```typescript
/**
 * Computes bit index (0..15) for a 4x4 room coordinate.
 */
export function getRoomBitIndex(gridX: number, gridY: number): number {
  return gridY * 4 + gridX;
}

/**
 * Returns a new bitmask with the specified room marked as visited.
 */
export function markRoomVisited(mask: number, gridX: number, gridY: number): number {
  if (gridX < 0 || gridX > 3 || gridY < 0 || gridY > 3) return mask;
  return mask | (1 << getRoomBitIndex(gridX, gridY));
}

/**
 * Checks whether a given room coordinate has been visited.
 */
export function isRoomVisited(mask: number, gridX: number, gridY: number): boolean {
  if (gridX < 0 || gridX > 3 || gridY < 0 || gridY > 3) return false;
  return (mask & (1 << getRoomBitIndex(gridX, gridY))) !== 0;
}

/**
 * Determines the minimap cell color.
 * Returns null if the cell should remain hidden in darkness.
 */
export function getMinimapCellColor(
  cell: GridCell | null | undefined,
  isVisited: boolean,
  isCurrent: boolean
): number | null {
  // If not visited or cell is empty/missing, remain blank darkness
  if (!isVisited || !cell || cell.type === 'EMPTY') {
    return null;
  }

  // Active room is highlighted green
  if (isCurrent) {
    return 0x00ff00;
  }

  // Revealed room types
  switch (cell.type) {
    case 'START':
      return 0x0088ff; // Blue
    case 'BOSS':
      return 0xff0044; // Red
    case 'PATH':
    case 'BRANCH':
      return 0x666666; // Gray
    default:
      return null;
  }
}
```

### 2.2 Minimap Rendering & Caching in `HUD.ts`

* **Internal State in `HUD`:**
  * `private visitedMask: number = 0;`
  * `private lastVisitedMask: number = -1;`
  * `private lastMinimapGridX: number = -1;`
  * `private lastMinimapGridY: number = -1;`
* **Dirty-Checking in `HUD.update(...)`:**
  ```typescript
  // 1. Mark current room as visited
  this.visitedMask = markRoomVisited(this.visitedMask, currentGridX, currentGridY);

  // 2. Dirty-check: only re-render if coordinates changed OR new room discovered
  if (
    currentGridX !== this.lastMinimapGridX ||
    currentGridY !== this.lastMinimapGridY ||
    this.visitedMask !== this.lastVisitedMask
  ) {
    this.renderMinimap(grid, currentGridX, currentGridY);
    this.lastMinimapGridX = currentGridX;
    this.lastMinimapGridY = currentGridY;
    this.lastVisitedMask = this.visitedMask;
  }
  ```
* **Minimap Rendering Loop:**
  * Minimap background panel: `fillRect(startX - 2, startY - 2, 4 * 11 + 3, 4 * 11 + 3)` with black alpha `0.6`.
  * For each `r` (0..3) and `c` (0..3):
    * `const visited = isRoomVisited(this.visitedMask, c, r);`
    * `const isCurrent = (c === currentGridX && r === currentGridY);`
    * `const color = getMinimapCellColor(grid[r]?.[c], visited, isCurrent);`
    * If `color === null`: skip! (No outline, no fill; remains pure darkness).
    * If `color !== null`:
      * `this.minimapGraphics.fillStyle(color, 0.9);`
      * `this.minimapGraphics.fillRect(x, y, cellSize, cellSize);`
    * If `isCurrent`:
      * `this.minimapGraphics.lineStyle(1, 0xffffff, 1);`
      * `this.minimapGraphics.strokeRect(x, y, cellSize, cellSize);`

---

## 3. Performance & Zero-GC Guarantees

* **Zero Memory Allocation:** Uses primitive numbers (`number`) and bitwise operators (`|`, `&`, `<<`). No arrays, objects, or strings are created per frame during minimap processing.
* **Canvas Minimap Draw Calls:** Only called once upon level start and when transitioning between rooms, preserving maximum rendering throughput.

---

## 4. Testing Strategy

1. **Pure Function Unit Tests (`tests/hud.test.ts`):**
   * `getRoomBitIndex`: validates calculation for corners `(0,0)=0`, `(3,0)=3`, `(0,3)=12`, `(3,3)=15`.
   * `markRoomVisited` & `isRoomVisited`: validates bit setting and out-of-bounds guards.
   * `getMinimapCellColor`:
     * Unvisited room returns `null`.
     * Unvisited BOSS room returns `null`.
     * Visited START room returns `0x0088ff` (or `0x00ff00` when current).
     * Visited BOSS room returns `0xff0044` (or `0x00ff00` when current).
     * Visited PATH room returns `0x666666`.
     * EMPTY room returns `null`.
2. **Minimap Graphics Interaction Tests:**
   * Frame 1 at `(0,0)`: only 1 room cell fillRect is called (plus the background panel). Boss room and other rooms are NOT drawn.
   * Moving to `(1,0)`: exactly 2 room cell fillRects are called (START and room 1).
   * Verifies dirty-state memoization prevents re-drawing when remaining in the same room.
