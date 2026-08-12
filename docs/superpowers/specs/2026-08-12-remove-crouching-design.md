# Remove Crouching Design Specification

* **Date:** 2026-08-12
* **Target Request:** Remove player crouching functionality from the game completely.

---

## 1. Goal

Remove player crouching physics, hitbox modifications, and crouching animation. When grounded and holding the `Down` input without horizontal movement, the player will aim straight `DOWN` (90° angle) while retaining full standard player body height (16x24), normal movement, and jumping. Drop-through platform triggers (`Down` + `Jump`) remain fully functional.

---

## 2. Architecture & Code Modifications

### 2.1 Aim Direction State Machine (`src/entities/PlayerAim.ts`)
- Update `AimDirection` type:
  ```typescript
  export type AimDirection = 'FORWARD' | 'UP' | 'UP_FORWARD' | 'DOWN_FORWARD' | 'DOWN';
  ```
- Update `calculateAimDirection(input: InputState)`:
  ```typescript
  export function calculateAimDirection(input: InputState): AimDirection {
    const movingHoriz = input.left || input.right;
    if (input.up) {
      return movingHoriz ? 'UP_FORWARD' : 'UP';
    }
    if (input.down) {
      return movingHoriz ? 'DOWN_FORWARD' : 'DOWN';
    }
    return 'FORWARD';
  }
  ```
- Remove `case 'CROUCH'` handling in `getAimAngleDegrees`.

### 2.2 Player Entity (`src/entities/Player.ts`)
- Remove `public isCrouching: boolean` state property.
- Remove `isCrouching` assignment in `updatePlayer()`.
- Update animation selection in `updatePlayer()`:
  - If not grounded: play `player_jump`.
  - Else if `left` or `right`: play `player_run`.
  - Else: play `player_idle`.
- Update jump condition: allow standard jump on `isGrounded && input.jumpJustPressed`.
- Update movement and physics body sizing:
  - Player physics body stays at size `(16, 24)` with offset `(0, 0)`.
  - Remove crouching speed lock (`body.setVelocityX(0)`) and crouch hitbox shrinking.
- Update `getMuzzlePosition()`:
  - Consistently use `spawnY = this.y - 4`.

### 2.3 Animations & Texture Factory (`src/core/TextureFactory.ts`)
- Remove `player_crouch` animation registration in `generateAllTextures()`.

---

## 3. Testing & Verification Strategy

1. **Unit Tests (`tests/player-aim.test.ts`)**:
   - Update ground `Down` key test to assert `calculateAimDirection` returns `'DOWN'`.
   - Remove `CROUCH` assertions from `getAimAngleDegrees` tests.
2. **Unit Tests (`tests/player.test.ts`)**:
   - Remove tests asserting `isCrouching` and crouch hitbox height (12px).
   - Add test verifying holding `Down` on ground maintains 24px height and aims `DOWN`.
3. **Regression Verification**:
   - Run `npx vitest run` and `npx tsc --noEmit`.
