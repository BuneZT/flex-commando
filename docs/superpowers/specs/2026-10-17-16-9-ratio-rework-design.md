# 16:9 Aspect Ratio Rework & Hybrid Platforming Design

**Date:** 2026-10-17  
**Status:** Approved  
**Topic:** Transition from 4:3 (320×240) to 16:9 (512×288) with 32×18 tile rooms and hybrid platforming (curated archetypes + procedural micro-decorations).

---

## 1. Overview & Objectives

*Flex Commando: Rogue Beef* currently operates at a retro 4:3 viewport resolution of 320×240 pixels (20×15 tiles at 16×16px). This project transitions the game to an exact 16:9 widescreen ratio at **512×288 pixels** (32×18 tiles per room at 16×16px), retaining retro pixel art sharpness with integer-friendly scaling.

The goals of this rework are:
1. **Widescreen 16:9 Presentation:** Upgrade viewport from 320×240 to 512×288, and global 4×4 world space from 1280×960 to 2048×1152 pixels.
2. **Richer Platforming Variety:** Expand room width from 20 to 32 tiles (+60%) and height from 15 to 18 tiles (+20%).
3. **Hybrid Platforming Generation:** Replace the uniform programmatic rooms with curated 32×18 archetype templates paired with a deterministic, seed-based procedural decorator pass that adds micro-platforms, one-way jump ledges, and cover blocks without obstructing critical navigation paths.
4. **Preserved Tactical Combat Feel:** Maintain the deliberate Contra-style movement physics (120 px/s run speed, -340 jump velocity) while distributing enemies and encounters dynamically across the wider arena.
5. **Centralized Architectural Constants:** Eliminate hardcoded dimension magic numbers across the codebase by establishing `src/config/GameConstants.ts`.

---

## 2. Dimension & Resolution Architecture

### 2.1 Centralized Constants (`src/config/GameConstants.ts`)

```typescript
export const GAME_CONSTANTS = {
  TILE_SIZE: 16,
  ROOM_WIDTH_TILES: 32,
  ROOM_HEIGHT_TILES: 18,
  VIEW_WIDTH_PX: 512,      // 32 * 16
  VIEW_HEIGHT_PX: 288,     // 18 * 16
  GRID_COLS: 4,
  GRID_ROWS: 4,
  TOTAL_COLS_TILES: 128,   // 4 * 32
  TOTAL_ROWS_TILES: 72,    // 4 * 18
  WORLD_WIDTH_PX: 2048,    // 128 * 16
  WORLD_HEIGHT_PX: 1152,   // 72 * 16
} as const;
```

### 2.2 Tile Dimensions & Grid Coordinates
- **Tile Size:** 16×16 pixels.
- **Room Dimensions:** 32 columns × 18 rows.
  - Floor level: row 17 (bottom row, index 17).
  - Ceiling level: row 0 (top row, index 0).
  - East/West doorways: centered vertically between rows 11 and 16 (6-tile high opening) to allow running and jumping through.
  - North/South doorways: columns 14 to 17 (4 tiles wide, centered in the 32-tile span).
    - South doorway at row 17 uses Tile 2 (one-way platform drop-through).
    - North doorway at row 0 has open ceiling gap (Tile 0).
- **World Coordinates for Room `(gx, gy)`:**
  - $X = gx \times 512$
  - $Y = gy \times 288$
  - Room Center $X = gx \times 512 + 256$
  - Room Center $Y = gy \times 288 + 144$

### 2.3 Phaser Scale & Config (`src/config/GameConfig.ts`)
- `width: GAME_CONSTANTS.VIEW_WIDTH_PX` (512)
- `height: GAME_CONSTANTS.VIEW_HEIGHT_PX` (288)
- `scale.mode: Phaser.Scale.FIT`, `scale.autoCenter: Phaser.Scale.CENTER_BOTH`.
- `pixelArt: true`, `roundPixels: true`, `render.antialias: false`.
- Physics world bounds: `(0, 0, 2048, 1152)` with gravity `{ x: 0, y: 600 }`.

---

## 3. Room Templates & Platforming Archetypes

Each room template is a $18 \times 32$ integer matrix (18 rows, 32 columns). Tile values:
- `0`: Air / Empty
- `1`: Solid Ground / Floor
- `2`: One-Way Drop-Through Platform
- `3`: Indestructible Wall / Ceiling
- `4`: Exit Portal Tile (reserved)

### 3.1 Curated Platforming Archetypes
Instead of all rooms sharing identical geometry, templates are designed with distinct tactical platforming identities:
1. **Start Room (`room_E_01`):** Gentle training layout with staggered low-to-mid platforms (rows 14, 11), allowing players to test jumping and dropping through platforms before moving east.
2. **Boss Room (`room_W_01`):** Grand 2-tier arena featuring a wide elevated catwalk spanning the middle (row 11, cols 6–26) with flanking ladders/ledges, giving ample room to maneuver around boss spreads.
3. **Horizontal Corridors (`room_EW_01`):** Dual-tier corridor with high sniper catwalks (row 10, cols 4–27) and broken ground obstacles that encourage utilizing drop-through mechanics.
4. **Vertical Shafts (`room_NS_01`):** Stepped zig-zag platforms (rows 14, 11, 8, 5) aligned under the North/South portals (cols 14–17) guaranteeing natural climbable vertical traversal without dead ends.
5. **Corner Rooms (`room_NE_01`, `room_NW_01`, `room_SE_01`, `room_SW_01`):** L-shaped flow with ascending/descending terraces connecting the vertical shafts to horizontal exits.
6. **T-Junctions & Crossroads (`room_NEW`, `room_SEW`, `room_NSE`, `room_NSW`, `room_NSEW`):** Multi-tier hubs with centralized floating islands and side ledges connecting all active doorways seamlessly.

All doorway connection zones (N, S, E, W) strictly respect portal dimensions:
- West exit: cols 0–1, rows 11–16 open.
- East exit: cols 30–31, rows 11–16 open.
- North portal: row 0, cols 14–17 open.
- South portal: row 17, cols 14–17 one-way platform (Tile 2).

---

## 4. Procedural Room Decorator (`src/core/RoomDecorator.ts`)

To inject micro-variety between runs while guaranteeing 100% path traversability:
- **Seed Consistency:** Accepts the room's base tile matrix, the cell's `doors` state, and the level's `SeededRNG`.
- **Safe Zone Definition:**
  - Forbidden Zones: Doorways (cols 0–2, 29–31; rows 0–1, 16–17; and the vertical column corridor cols 13–18 in North/South connected rooms).
  - Eligible Decoration Zones: Mid-room airspace (rows 6–13, cols 5–12 and cols 19–26).
- **Procedural Feature Palette:**
  1. *Small Floating Ledge:* 3-tile wide one-way platform (`[2, 2, 2]`) at row 8 or 12.
  2. *Stepping Island:* 2-tile wide solid block (`[1, 1]`) at row 13.
  3. *Turret Mount / Ceiling Stalactite:* 1–2 solid blocks hanging from ceiling at cols 10 or 21 (`row 1..2`).
- **Decorator Constraint:** Injects 1 to 2 random features per non-START, non-BOSS room. Never obstructs jump parabolas or portal corridors.

---

## 5. System Components & Adjustments

### 5.1 TilemapRenderer (`src/core/TilemapRenderer.ts`)
- Stitches the 4×4 grid of $32 \times 18$ rooms into a single global tile matrix of $72 \text{ rows} \times 128 \text{ cols}$.
- Ground layer collisions: bulk collision on `[1, 3]` and one-way directional collision on Tile `2` (drop-through enabled).

### 5.2 CameraManager (`src/core/CameraManager.ts`)
- Default room bounds updated to $512 \times 288$ px.
- Room calculation:
  - $\text{gridX} = \lfloor x / 512 \rfloor$
  - $\text{gridY} = \lfloor y / 288 \rfloor$
  - Camera center on room: $(gx \times 512 + 256, gy \times 288 + 144)$.
- Spatial culling of off-screen enemies: checks against $512 \times 288$ bounds.

### 5.3 HUD (`src/ui/HUD.ts`)
- Viewport width is 512px.
- Lives & Weapon text: anchored top-left at $(x: 12, y: 8)$ and $(x: 12, y: 22)$.
- Boss HP: centered horizontally at $x = 256$ ($512 / 2$), $y = 8$.
- Minimap: anchored top-right at $x = 440, y = 8$. Cell size 12px with 1px gap, fitting neatly into the top-right corner.

### 5.4 GameScene (`src/scenes/GameScene.ts`)
- Physics world bounds: `(0, 0, 2048, 1152)`.
- Parallax background: `add.tileSprite(0, 0, 512, 288, 'cyber_hangar_bg')`.
- Player spawn in START room: $gx \times 512 + 100$, $gy \times 288 + 220$.
- Exit portal in BOSS room: $gx \times 512 + 420$, $gy \times 288 + 220$.
- Boss spawn in BOSS room: $gx \times 512 + 360$, $gy \times 288 + 200$.
- Enemy distribution in PATH/BRANCH rooms:
  - Trooper: ground patroller at $gx \times 512 + 160$, $gy \times 288 + 220$.
  - Turret: mounted at $gx \times 512 + 380$, $gy \times 288 + 48$.
  - Falcon Drone: flying sine path at $gx \times 512 + 256$, $gy \times 288 + 120$.
  - Jumper Mercenary: platform guard at $gx \times 512 + 420$, $gy \times 288 + 220$.
  - Pickup Capsule: flying drone path at $gx \times 512 + 60$, $gy \times 288 + 90$.

### 5.5 Menu Scenes (`MainMenuScene.ts`, `GameOverScene.ts`)
- Centered elements already use `Math.round(width / 2)` and `Math.round(height / 2)`, automatically adapting to 512×288 with zero manual pixel offsets needed.

---

## 6. Testing Strategy

1. **Unit Tests (`tests/`):**
   - `config.test.ts`: Verify 512×288 arcade settings in `GameConfig`.
   - `tilemap-renderer.test.ts`: Verify $128 \times 72$ tile matrix stitching and bounds for $(1, 2)$ at $(512, 576)$ with width 512 and height 288.
   - `camera-manager-culling.test.ts`: Verify room calculations and culling with 512×288 bounds.
   - `grid-generator.test.ts` & `room-template.test.ts`: Verify 32×18 room template dimensions, door masks, and traversal bounds.
   - `room-decorator.test.ts` (new): Verify decorator adheres to safe-zone rules and does not overwrite door passages.
   - `hud.test.ts`: Verify HUD elements align with 512px width.
2. **Full Regression:**
   - Execute `npx vitest run` ensuring 100% test pass rate across all 18+ test suites.
   - Execute `npx tsc --noEmit` ensuring zero TypeScript compilation errors.
   - Execute `npm run build` ensuring bundle builds cleanly with Vite.

---

## 7. Documentation Updates
- Update `AGENTS.md` to reflect the 512×288 resolution, 32×18 tiles per room, and 4×4 world space.
- Update `docs/GAME_MANUAL.md` with the new 16:9 specs.
