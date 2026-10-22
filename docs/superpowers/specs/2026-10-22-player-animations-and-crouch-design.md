# Design Document: Player Shooting Angles and Classic Prone Crouching

- **Date:** 2026-10-22
- **Topic:** Commando directional shooting animations, muzzle flash recoil frames, and Contra-style prone crouching.
- **Status:** Approved

---

## 1. Context and Problem Statement
In `flex-commando`, the main commando character currently only has a 6-frame spritesheet (144x24 px). When aiming in the 8 supported directions (`UP`, `UP_FORWARD`, `FORWARD`, `DOWN_FORWARD`, `DOWN`), the player sprite remains facing horizontally forward (frame 0) or plays the running animation, without visibly aiming the weapon up, diagonal-up, or diagonal-down. Additionally, crouching currently retains full standing head height ($y=1\text{--}8$), causing an unnatural squished look that misaligns with the low crouching collision box.

---

## 2. Requirements & Goals
1. **Classic Contra Prone Crouching:**
   - Drop the commando's head, chest, and arms down to the ground plane ($y=13\text{--}21$).
   - Prone stance with elbows grounded and rifle barrel resting horizontally forward along the floor.
   - Distinct prone shooting frame with a muzzle flash flare.
   - Calibrated hitbox: $20\text{px} \times 10\text{px}$, offset $(2, 14)$ to accurately allow low-profile projectile dodging.
2. **5-Way Shooting Angles:**
   - Distinct aim stances and firing recoil frames:
     - Straight Forward (Idle frame 0, Firing frame 12)
     - Straight Up 90° (Aim frame 6, Firing frame 7)
     - Diagonal Up 45° (Aim frame 8, Firing frame 9)
     - Diagonal Down 45° (Aim frame 10, Firing frame 11)
     - Prone Forward (Aim frame 4, Firing frame 5)
3. **Muzzle Flash Feedback:**
   - On each shot trigger, activate a 75ms firing flash state displaying the corresponding angle's muzzle flash frame before returning to the steady aim frame.
4. **Zero Runtime GC & Static Asset Integrity:**
   - Pre-generate the 13-frame sprite sheet ($312\text{px} \times 24\text{px}$) via `scripts/generate-pixel-assets.mjs`.
   - Update fallback in `TextureFactory.ts` with matching dimensions and frames.
   - Maintain strict types and 100% headless Vitest test pass rate.

---

## 3. Spritesheet Layout (312x24 px, 13 Frames of 24x24 px)

| Frame | Key Name / Stance | Description | Muzzle Offset $(x, y)$ |
|:-----:|:------------------|:------------|:----------------------:|
| 0 | `player_idle` | Standing level forward | $(12, -4)$ |
| 1 | `player_run_1` | Run cycle frame 1 | $(12, -4)$ |
| 2 | `player_run_2` | Run cycle frame 2 | $(12, -4)$ |
| 3 | `player_jump` | Airborne tuck | $(12, -4)$ |
| 4 | `player_crouch` | Prone idle flat on ground | $(12, 6)$ |
| 5 | `player_crouch_shoot` | Prone firing with muzzle flare | $(12, 6)$ |
| 6 | `player_aim_up` | Standing aim straight up (90°) | $(2, -16)$ |
| 7 | `player_shoot_up` | Firing straight up with top flare | $(2, -16)$ |
| 8 | `player_aim_up_forward` | Aim diagonal up (45°) | $(10, -11)$ |
| 9 | `player_shoot_up_forward`| Firing diagonal up with 45° flare | $(10, -11)$ |
| 10 | `player_aim_down_forward` | Aim diagonal down (45° in air) | $(10, 6)$ |
| 11 | `player_shoot_down_forward`| Firing diagonal down with flare | $(10, 6)$ |
| 12 | `player_shoot_forward` | Standing firing horizontal flare | $(12, -4)$ |

---

## 4. State Machine Logic in `Player.ts`

### 4.1 Firing Flash Recoil Timer
- `public firingFlashTimer: number = 0;`
- In `shoot()`: set `this.firingFlashTimer = 75;`
- In `updatePlayer(delta)`: `if (this.firingFlashTimer > 0) this.firingFlashTimer -= delta;`
- `const isFiring = this.firingFlashTimer > 0;`

### 4.2 Frame Selection Hierarchy
1. **Grounded & Crouching (`this.isCrouching`):**
   - Frame 5 if `isFiring`, else Frame 4.
2. **Airborne (`!isGrounded`):**
   - If `aimDirection === 'UP'`: Frame 7 if `isFiring`, else Frame 6.
   - If `aimDirection === 'UP_FORWARD'`: Frame 9 if `isFiring`, else Frame 8.
   - If `aimDirection === 'DOWN_FORWARD'` or `'DOWN'`: Frame 11 if `isFiring`, else Frame 10.
   - Else: Frame 3 (`player_jump`).
3. **Grounded & Moving (`input.left || input.right`):**
   - Play `player_run` animation (Frames 1–2).
4. **Grounded & Standing Still:**
   - If `aimDirection === 'UP'`: Frame 7 if `isFiring`, else Frame 6.
   - If `aimDirection === 'UP_FORWARD'`: Frame 9 if `isFiring`, else Frame 8.
   - If `isFiring`: Frame 12.
   - Else: Frame 0 (`player_idle`).

---

## 5. Testing & Verification Plan
- **Unit Tests (`tests/player.test.ts`):**
  - Verify crouch/prone frame and hitbox dimensions ($20\text{px} \times 10\text{px}$, offset $2, 14$).
  - Verify correct animation frames selected for standing aim up, aim up-forward, airborne aim down-forward, and prone.
  - Verify firing flash duration and transition back to steady aim.
  - Verify muzzle offsets across all aiming angles.
- **Asset Integrity (`tests/assets-integrity.test.ts`):**
  - Update `player.png` spec to width $312$, height $24$.
- **TextureFactory (`tests/texture-factory.test.ts`):**
  - Verify 13 frames registered for `tex_player`.
