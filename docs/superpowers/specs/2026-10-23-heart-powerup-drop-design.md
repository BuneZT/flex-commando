# Design Spec: Heart Powerup Drop from Capsules

## 1. Overview
This specification details the design for allowing flying powerup capsules (`PickupCapsule`) in *Flex Commando* to occasionally drop a 1-heart healing pickup (`PickupItem`) that restores 1 life to the player up to the starting maximum of 3 lives.

---

## 2. Requirements & User Decisions
1. **Drop Chance:** 25% chance for any spawned capsule to carry and drop a `'HEART'`; 75% chance to carry a random weapon from `PICKUP_WEAPON_TYPES`.
2. **Healing Mechanics:** 
   - Collecting a heart restores +1 life up to `MAX_PLAYER_LIVES = 3`.
   - If player is already at 3 lives (or running with infinite lives), player does not gain extra lives beyond 3, but collecting the heart still successfully consumes the item and awards 500 bonus points (`POWERUP_SCORE_VALUE`).
3. **Audio & VFX:**
   - Plays the preloaded `sfx_pickup` sound effect via `SoundManager.getInstance().playSfx('pickup')`.
   - Uses the unified falling badge physics (`PickupItem` Arcade sprite with bounce, gentle fall, and ground collision).
4. **Visual Asset:**
   - Adds an 8th frame to `public/assets/vfx/pickups.png` (frame index 7): a 16x16 red heart badge styled consistently with the existing letter badges (metal beveled border, dark red background, bright neon red heart glyph).
   - Generated deterministically via `scripts/generate-pixel-assets.mjs`.

---

## 3. Architecture & Data Structures

### 3.1 Drop Type Union & Selection Helper (`src/entities/PickupCapsule.ts`)
```ts
export type CapsuleDropType = WeaponType | 'HEART';
export const HEART_DROP_CHANCE = 0.25;
export const MAX_PLAYER_LIVES = 3;

export function getRandomCapsuleDrop(rng?: () => number): CapsuleDropType {
  const rand = rng ? rng() : Math.random();
  if (rand < HEART_DROP_CHANCE) {
    return 'HEART';
  }
  return getRandomPickupWeapon(rng);
}
```

### 3.2 Badge Frame Mapping
In `PickupItem`:
- Frames:
  - 'S' -> Frame 2
  - 'L' -> Frame 3
  - 'F' -> Frame 4
  - 'M' -> Frame 5
  - 'B' -> Frame 6
  - 'HEART' (or 'H') -> Frame 7
- `collect(): CapsuleDropType` releases the physics body and returns the dropped item type.

### 3.3 Player Healing (`src/entities/Player.ts`)
```ts
public heal(amount: number = 1): number {
  if (this.lives <= 0 || this.isDead) return 0;
  const prevLives = this.lives;
  this.lives = Math.min(3, this.lives + amount);
  return this.lives - prevLives;
}
```

### 3.4 GameScene Pickup Collision (`src/scenes/GameScene.ts`)
When player overlaps `PickupItem`:
1. Call `const drop = item.collect()`.
2. If `drop === 'HEART'`:
   - `this.player.heal(1)`.
3. If `drop !== 'HEART'`:
   - `this.player.equipWeapon(drop)`.
4. Trigger `SoundManager.getInstance().playSfx('pickup')`.
5. Increment `this.score += POWERUP_SCORE_VALUE`.
6. Destroy item sprite and remove from `this.pickupItems`.

---

## 4. Testing & Verification Plan
1. **Unit Tests (`tests/weapons.test.ts` or new `tests/pickup-capsule.test.ts`)**:
   - `getRandomCapsuleDrop(rng)` returns `'HEART'` when rng < 0.25, and weapon types otherwise.
   - `PickupCapsule` initialized with `'HEART'` drops a `PickupItem` with `dropType: 'HEART'`.
   - `PickupItem` with `'HEART'` correctly maps to frame 7 of `tex_pickups`.
   - `collect()` on `PickupItem` returns `'HEART'`.
2. **Player Unit Tests (`tests/player.test.ts`)**:
   - `player.heal(1)` increases lives from 1 to 2, 2 to 3.
   - `player.heal(1)` does not increase lives past 3 when at 3 lives.
   - `player.heal(1)` does not revive a dead player (`lives <= 0` or `isDead`).
3. **Asset & Animation Integrity (`tests/assets-integrity.test.ts`, `tests/animation-factory.test.ts`)**:
   - Update `tex_pickups` frame count assertion from 7 to 8.
   - Run asset generator script and verify `pickups.png` is generated at 128x16 px.
4. **End-to-End Suite**:
   - Run `npx vitest run` (all 250+ tests pass).
   - Run `npx tsc --noEmit` (clean typecheck).
   - Run `npm run build` (successful Vite bundle).
