# Design Document: Player Shooting and Movement Animations

## 1. Overview
This design enhances the player's shooting and movement animations in `flex-commando`.
Specifically:
1. Adds full running aim and shooting animations so the player can run while aiming and firing horizontally, diagonally up (up-forward / up-left / up-right), and diagonally down (down-forward / down-left / down-right).
2. Adds standing diagonal-down aiming and shooting support when grounded stationary (e.g., when mouse-aiming downward).
3. Provides visual gun recoil / muzzle flare feedback whenever firing while running or standing.

## 2. Spritesheet Expansion (`tex_player`)
The player spritesheet in `public/assets/sprites/player.png` and `TextureFactory.ts` is expanded from 13 frames (312×24px) to 23 frames (552×24px) at 24×24px per frame.

| Frame | Key Name / Description | Muzzle Offset `(x, y)` |
|---|---|---|
| **0** | Idle (standing neutral, horizontal rifle) | `(±12, -4)` |
| **1** | Run step 1 (forward, horizontal rifle) | `(±12, -4)` |
| **2** | Run step 2 (forward, horizontal rifle) | `(±12, -4)` |
| **3** | Jump (neutral tuck, horizontal rifle) | `(±12, -4)` |
| **4** | Crouch / Prone idle (low flat crawl) | `(±12, 6)` |
| **5** | Crouch / Prone shoot (low flat crawl + muzzle flash) | `(±12, 6)` |
| **6** | Aim Up (standing vertical rifle 90°) | `(±2, -16)` |
| **7** | Shoot Up (standing vertical rifle 90° + top flash) | `(±2, -16)` |
| **8** | Aim Up-Forward (standing 45° upward rifle) | `(±10, -11)` |
| **9** | Shoot Up-Forward (standing 45° upward rifle + flash) | `(±10, -11)` |
| **10** | Aim Down-Forward (standing / jump 45° downward rifle) | `(±10, 6)` |
| **11** | Shoot Down-Forward (standing / jump 45° downward + flash) | `(±10, 6)` |
| **12** | Shoot Forward (standing horizontal rifle + flash) | `(±12, -4)` |
| **13** | Run Forward Shoot 1 (run step 1 + horizontal flash) | `(±12, -4)` |
| **14** | Run Forward Shoot 2 (run step 2 + horizontal flash) | `(±12, -4)` |
| **15** | Run Aim Up-Forward 1 (run step 1 + 45° upward rifle) | `(±10, -11)` |
| **16** | Run Aim Up-Forward 2 (run step 2 + 45° upward rifle) | `(±10, -11)` |
| **17** | Run Shoot Up-Forward 1 (run step 1 + 45° upward + flash) | `(±10, -11)` |
| **18** | Run Shoot Up-Forward 2 (run step 2 + 45° upward + flash) | `(±10, -11)` |
| **19** | Run Aim Down-Forward 1 (run step 1 + 45° downward rifle) | `(±10, 6)` |
| **20** | Run Aim Down-Forward 2 (run step 2 + 45° downward rifle) | `(±10, 6)` |
| **21** | Run Shoot Down-Forward 1 (run step 1 + 45° downward + flash) | `(±10, 6)` |
| **22** | Run Shoot Down-Forward 2 (run step 2 + 45° downward + flash) | `(±10, 6)` |

## 3. Registered Phaser Animations
In `src/core/TextureFactory.ts`:
- `player_idle`: frame 0
- `player_run`: frames [1, 2], `frameRate: 8`, `repeat: -1`
- `player_run_shoot`: frames [13, 14], `frameRate: 8`, `repeat: -1`
- `player_run_up`: frames [15, 16], `frameRate: 8`, `repeat: -1`
- `player_run_shoot_up`: frames [17, 18], `frameRate: 8`, `repeat: -1`
- `player_run_down`: frames [19, 20], `frameRate: 8`, `repeat: -1`
- `player_run_shoot_down`: frames [21, 22], `frameRate: 8`, `repeat: -1`
- `player_jump`: frame 3
- `player_crouch`: frame 4
- `player_crouch_shoot`: frame 5
- `player_aim_up`: frame 6
- `player_shoot_up`: frame 7
- `player_aim_up_forward`: frame 8
- `player_shoot_up_forward`: frame 9
- `player_aim_down_forward`: frame 10
- `player_shoot_down_forward`: frame 11
- `player_shoot_forward`: frame 12

## 4. Player Stance & Animation Controller Logic
In `src/entities/Player.ts` (`updatePlayer` method):
Let `isFiring = this.firingFlashTimer > 0`.

1. **Crouching (`this.isCrouching`)**:
   - `targetAnim = isFiring ? 'player_crouch_shoot' : 'player_crouch'`
   - `fallbackFrame = isFiring ? 5 : 4`
2. **Airborne (`!isGrounded`)**:
   - If `aimDirection === 'UP'`:
     `targetAnim = isFiring ? 'player_shoot_up' : 'player_aim_up'`, `fallbackFrame = isFiring ? 7 : 6`
   - Else if `aimDirection === 'UP_FORWARD'`:
     `targetAnim = isFiring ? 'player_shoot_up_forward' : 'player_aim_up_forward'`, `fallbackFrame = isFiring ? 9 : 8`
   - Else if `aimDirection === 'DOWN_FORWARD' || aimDirection === 'DOWN'`:
     `targetAnim = isFiring ? 'player_shoot_down_forward' : 'player_aim_down_forward'`, `fallbackFrame = isFiring ? 11 : 10`
   - Else:
     `targetAnim = 'player_jump'`, `fallbackFrame = 3`
3. **Grounded & Moving (`input.left || input.right`)**:
   - If `aimDirection === 'UP_FORWARD'`:
     `targetAnim = isFiring ? 'player_run_shoot_up' : 'player_run_up'`, `fallbackFrame = isFiring ? 17 : 15`
   - Else if `aimDirection === 'DOWN_FORWARD'`:
     `targetAnim = isFiring ? 'player_run_shoot_down' : 'player_run_down'`, `fallbackFrame = isFiring ? 21 : 19`
   - Else if `aimDirection === 'UP'`:
     `targetAnim = isFiring ? 'player_shoot_up' : 'player_aim_up'`, `fallbackFrame = isFiring ? 7 : 6`
   - Else:
     `targetAnim = isFiring ? 'player_run_shoot' : 'player_run'`, `fallbackFrame = isFiring ? 13 : 1`
4. **Grounded Stationary**:
   - If `aimDirection === 'UP'`:
     `targetAnim = isFiring ? 'player_shoot_up' : 'player_aim_up'`, `fallbackFrame = isFiring ? 7 : 6`
   - Else if `aimDirection === 'UP_FORWARD'`:
     `targetAnim = isFiring ? 'player_shoot_up_forward' : 'player_aim_up_forward'`, `fallbackFrame = isFiring ? 9 : 8`
   - Else if `aimDirection === 'DOWN_FORWARD'`:
     `targetAnim = isFiring ? 'player_shoot_down_forward' : 'player_aim_down_forward'`, `fallbackFrame = isFiring ? 11 : 10`
   - Else if `isFiring`:
     `targetAnim = 'player_shoot_forward'`, `fallbackFrame = 12`
   - Else:
     `targetAnim = 'player_idle'`, `fallbackFrame = 0`

## 5. Verification & Testing Strategy
1. **Asset Integrity Test** (`tests/assets-integrity.test.ts`):
   Assert that `public/assets/sprites/player.png` exists, is valid PNG, and has dimensions 552×24px (23 frames × 24px).
2. **Player Unit Tests** (`tests/player.test.ts`):
   - Verify running straight while firing plays `player_run_shoot`.
   - Verify running while aiming up-forward plays `player_run_up` and firing plays `player_run_shoot_up`.
   - Verify running while holding down (down-forward) plays `player_run_down` and firing plays `player_run_shoot_down`.
   - Verify standing stationary while aiming down-forward plays `player_aim_down_forward` and firing plays `player_shoot_down_forward`.
   - Verify muzzle position and offset for all aim directions.
3. **Typecheck & Full Test Suite**:
   Run `npx tsc --noEmit` and `npx vitest run`.
