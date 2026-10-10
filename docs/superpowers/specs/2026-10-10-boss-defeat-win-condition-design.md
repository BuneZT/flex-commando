# Boss Defeat Win Condition Design Spec

## 1. Overview
Currently, *Flex Commando: Rogue Beef* allows three distinct win conditions:
1. Slaying the Level Boss
2. Stepping on the Exit Portal directly (even without fighting or defeating the Boss)
3. Total Annihilation (killing all spawned regular enemies across the 4x4 grid)

This spec defines modifying the win conditions so that **finding and defeating the Boss is the strict and only win condition**, followed by extracting through the unlocked Exit Portal.

---

## 2. Architecture & State Management

### 2.1 Boss Room Trigger Logic
- In `GameScene.ts`, the current trigger:
  ```ts
  if (!this.bossTriggered && this.grid && (currentGridX === 3 || this.grid[currentGridY][currentGridX].type === 'BOSS'))
  ```
  will be updated to strictly trigger when entering the designated `'BOSS'` cell:
  ```ts
  if (!this.bossTriggered && this.grid && this.grid[currentGridY][currentGridX].type === 'BOSS')
  ```
- This prevents early Boss spawns or music transitions in Column 3 rooms that are not the actual Boss arena.

### 2.2 Exit Portal Locking & Visual States
- Add tracking property to `GameScene`:
  - `public isPortalUnlocked: boolean = false;`
  - `public exitPortalText?: Phaser.GameObjects.Text;`
- **Initial State (Locked):**
  - When the Exit Portal is created in `GameScene.create()`, it starts locked (`isPortalUnlocked = false`).
  - Sprite tint is set to red/dim: `0xff4444`, alpha `0.75`.
  - Portal label text reads `'PORTAL LOCKED'` with styling `{ color: '#ff4444' }`.
- **Unlocked State (Boss Defeated):**
  - Upon defeating the Boss (`enemy === this.boss` in player projectile collision):
    - `isPortalUnlocked` is set to `true`.
    - `unlockExitPortal()` helper updates the portal sprite tint to `0x00ff88` (alpha `1.0`).
    - The label text is updated to `'EXIT PORTAL'` with `{ color: '#00ff88' }`.
    - SFX cue plays: `SoundManager.getInstance().playSfx('pickup')`.

### 2.3 Elimination of Obsolete Win Triggers
- **Total Annihilation:** Remove the loop in `GameScene.update()` that checks if all enemies in `this.enemies` are dead.
- **Premature Portal Win:** In `GameScene.handleCollisions()`, checking overlap with `this.exitDoors` / `this.exitDoor` only triggers `this.triggerVictory()` if `this.isPortalUnlocked === true`.
- **Direct Victory on Bullet Hit:** Defeating the Boss no longer immediately calls `this.triggerVictory()`. Instead, it calls `this.unlockExitPortal()`, and victory is triggered when the player steps into the unlocked portal.

---

## 3. Documentation Updates
Update `docs/GAME_MANUAL.md`:
- Update mermaid flow diagram to depict: Explore $\rightarrow$ Boss Chamber $\rightarrow$ Slay Boss $\rightarrow$ Portal Unlocks $\rightarrow$ Extraction (Victory).
- Replace three win conditions with the single win condition: Defeat the Level Boss and step through the unlocked Exit Portal.

---

## 4. Verification & Testing
In `tests/game-loop.test.ts`:
- Verify portal starts locked (`isPortalUnlocked === false`).
- Verify stepping into the portal while locked does not call `triggerVictory()`.
- Verify eliminating all regular enemies does not call `triggerVictory()`.
- Verify killing the boss sets `isPortalUnlocked === true` and updates portal text/tint.
- Verify stepping into the portal when `isPortalUnlocked === true` triggers `triggerVictory()`.
- Verify entering a non-BOSS room does not trigger the Boss encounter.
