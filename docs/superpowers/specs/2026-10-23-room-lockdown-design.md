# Room Lockdown System Specification

## 1. Overview
In *Flex Commando: Rogue Beef*, rooms containing hostile enemies must prevent the player from escaping until all hostiles in that room have been defeated.
When a player enters a room with undefeated enemies, energy barriers (forcefields) close over all doors in that room, physically blocking both the player and projectiles. Once every enemy in the room is eliminated, an unlock audio chime plays, and the barriers deactivate, allowing free movement.

---

## 2. Gameplay Requirements & Rules
1. **Lockdown Trigger:**
   - When the player transitions into a room containing living enemies (any `PATH`, `BRANCH`, or `BOSS` room where enemies exist), the room enters **Lockdown**.
   - Rooms with 0 living enemies (such as the `START` room or previously cleared rooms) do not lock down.
2. **Door Barrier Mechanics:**
   - Energy barrier forcefields activate at each doorway of the locked room (North, South, East, West).
   - The barriers have solid Arcade physics bodies (`immovable: true`) preventing the player from passing through.
   - Projectiles (both player bullets and enemy bullets) detonate on contact with active barriers, creating impact FX.
   - When the barrier closes upon entering, any player coordinate still overlapping the doorway threshold is safely pushed/clamped inside the room interior.
3. **Room Clear & Unlock:**
   - When the last alive enemy in the current room is defeated:
     - The barriers immediately deactivate and become hidden.
     - Barrier physics bodies are disabled.
     - An unlock sound chime (`sfx_pickup`) plays.
     - The room remains unlocked for the rest of the run (cleared rooms stay cleared).
4. **Boss Room Integration:**
   - The `BOSS` room locks its entry doors while the Boss is active.
   - Once the Boss is defeated, the barriers open and the stage exit portal unlocks.

---

## 3. Architecture & Decoupled Design

Following `AGENTS.md` guidelines, all spatial math and state queries are pure functions headlessly testable in Vitest:

### `src/core/RoomLockdown.ts`
- **`BarrierConfig` interface:**
  ```ts
  export interface BarrierConfig {
    direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
    x: number;       // Center X in world px
    y: number;       // Center Y in world px
    width: number;   // Collision box width
    height: number;  // Collision box height
  }
  ```
- **`getRoomDoorBarriers(gridX: number, gridY: number, doors: RoomDoors): BarrierConfig[]`**:
  Calculates exact pixel bounds for barriers at room doors:
  - North: `x = roomX + 256`, `y = roomY + 8`, `width = 64`, `height = 16`
  - South: `x = roomX + 256`, `y = roomY + 280`, `width = 64`, `height = 16`
  - West: `x = roomX + 16`, `y = roomY + 224`, `width = 32`, `height = 96`
  - East: `x = roomX + 496`, `y = roomY + 224`, `width = 32`, `height = 96`
- **`isRoomCleared(enemies: EnemyState[], gridX: number, gridY: number): boolean`**:
  Checks if all enemies located within `gridX, gridY` have `isAlive === false`.
- **`getEnemiesInRoom(enemies: EnemyState[], gridX: number, gridY: number): EnemyState[]`**:
  Filters enemies belonging to a specific room cell.
- **`clampPlayerInsideRoom(playerPos: { x: number; y: number }, gridX: number, gridY: number): { x: number; y: number }`**:
  Ensures player coordinates stay safely inside the room boundaries (offsetting inwards from door edges).

### `src/scenes/GameScene.ts`
- **`RoomBarrierManager` or GameScene barrier integration:**
  - Manages a pool of barrier physics sprites with red/cyan energy tint.
  - Setup collider: `physics.add.collider(this.player, this.roomBarriers)`.
  - In `handleCollisions()`: checks active bullets against active barriers, triggering `impactFXPool.spawn()` and deactivating projectiles.
  - In room transition: checks `isRoomCleared()`. If not cleared, positions barriers and enables their physics.
  - When enemy dies: checks if room is now cleared; if so, plays chime and deactivates barriers.

---

## 4. Performance & Zero-GC Invariants
- Uses preloaded static sprite textures (`tileset` frame 4 with tint, or dedicated sprites) without procedural canvas calls.
- Barrier sprites are pre-instantiated in a static pool of at most 4 barriers (since at most 4 doors exist per room) and reused across rooms.
- Inactive barriers have `body.enable = false` and `visible = false`.

---

## 5. Testing Plan
- Unit tests in `tests/room-lockdown.test.ts`:
  - Calculate barrier positions for all door configurations (N, S, E, W).
  - Verify room cleared logic with multiple enemies, dead enemies, and empty rooms.
  - Verify player clamping logic.
- Integration tests in `tests/game-scene-lockdown.test.ts`:
  - Player cannot pass through barrier when enemies are alive.
  - Defeating the last enemy unlocks barriers and plays SFX.
  - Projectiles stop upon colliding with barriers.
  - START room and previously cleared rooms remain unlocked.
