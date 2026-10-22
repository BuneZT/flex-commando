# Player Shooting Angles and Prone Crouching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5-direction shooting aim and recoil animations (`FORWARD`, `UP`, `UP_FORWARD`, `DOWN_FORWARD`, prone `FORWARD`) and replace the squished crouching pose with a classic Contra prone stance.

**Architecture:** Extend the pre-rendered static `player.png` sprite sheet from 6 frames ($144 \times 24$) to 13 frames ($312 \times 24$, $24 \times 24$ each). Drive frame selection in `Player.ts` using state conditions (`isCrouching`, `isGrounded`, `aimDirection`, and a 75ms `firingFlashTimer`). Maintain headless compatibility via `TextureFactory.ts`.

**Tech Stack:** TypeScript, Phaser 3.80+ (Arcade Physics), Node Canvas/PNG generator script, Vitest.

## Global Constraints

- Preloaded static PNG asset with zero runtime canvas/GC allocation during gameplay (conforms strictly to `AGENTS.md`).
- View resolution: 512x288, 16x16 tiles, player frame size 24x24.
- All test suites (`npm test`), TypeScript checks (`npx tsc --noEmit`), and production build (`npm run build`) must pass without errors or warnings.

---

### Task 1: Generate 13-Frame Player Spritesheet via Script

**Files:**
- Modify: `scripts/generate-pixel-assets.mjs:524-641`
- Test / Verify: `tests/assets-integrity.test.ts:10`
- Output: `public/assets/sprites/player.png` ($312 \times 24$ px)

**Interfaces:**
- Produces: `public/assets/sprites/player.png` with 13 frames of $24 \times 24$ px.
- Frame 0: Idle forward
- Frames 1–2: Run 1 & 2
- Frame 3: Jump
- Frame 4: Prone Idle (low head $y=14$, body flat $y=16\text{--}21$, grounded elbows, rifle horizontal $y=18$)
- Frame 5: Prone Shoot (prone stance with yellow/white muzzle flare at $x=22, y=18$)
- Frame 6: Aim Straight Up (vertical rifle $x=11\text{--}13, y=1\text{--}10$)
- Frame 7: Shoot Straight Up (vertical rifle with top muzzle flare $y=0\text{--}2$)
- Frame 8: Aim Diagonal Up (45° angle upward)
- Frame 9: Shoot Diagonal Up (45° angle with top-right muzzle flare)
- Frame 10: Aim Diagonal Down (45° angle downward)
- Frame 11: Shoot Diagonal Down (45° angle with bottom-right muzzle flare)
- Frame 12: Shoot Forward (standing horizontal forward with muzzle flare)

- [ ] **Step 1: Update asset integrity test with expected 312x24 dimensions**

Update `tests/assets-integrity.test.ts`:
Change `{ path: 'public/assets/sprites/player.png', width: 144, height: 24 }` to `{ path: 'public/assets/sprites/player.png', width: 312, height: 24 }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/assets-integrity.test.ts`
Expected: FAIL due to dimension mismatch (144 vs 312).

- [ ] **Step 3: Update `scripts/generate-pixel-assets.mjs` to render all 13 frames**

Implement all 13 frames in `generatePlayer()` and run `node scripts/generate-pixel-assets.mjs`.

- [ ] **Step 4: Run asset integrity test to verify it passes**

Run: `npx vitest run tests/assets-integrity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit asset changes**

```bash
git add scripts/generate-pixel-assets.mjs public/assets/sprites/player.png tests/assets-integrity.test.ts
git commit -m "feat(assets): generate 13-frame player spritesheet with shooting angles and prone crouch"
```

---

### Task 2: Update Headless TextureFactory Fallback & Animations

**Files:**
- Modify: `src/core/TextureFactory.ts:40-117, 350-450`
- Test: `tests/texture-factory.test.ts`

**Interfaces:**
- Consumes: `tex_player` spritesheet ($312 \times 24$ px).
- Produces: 13 registered frame numbers in `TextureManager` and registered animations (`player_idle`, `player_run`, `player_jump`, `player_crouch`, `player_crouch_shoot`, `player_aim_up`, `player_shoot_up`, `player_aim_up_forward`, `player_shoot_up_forward`, `player_aim_down_forward`, `player_shoot_down_forward`, `player_shoot_forward`).

- [ ] **Step 1: Write test in `tests/texture-factory.test.ts` for new animation keys**

Add test assertions verifying all new animation keys exist in `scene.anims`.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/texture-factory.test.ts`
Expected: FAIL missing animation keys.

- [ ] **Step 3: Update `TextureFactory.ts`**

Update `createPlayerTexture` to generate a 312x24 texture with 13 frames (0..12).
Register all new animations in `createAnimations()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/texture-factory.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit TextureFactory changes**

```bash
git add src/core/TextureFactory.ts tests/texture-factory.test.ts
git commit -m "feat(core): register 13-frame player texture fallback and directional aim animations"
```

---

### Task 3: Update Player Entity State Machine, Hitbox & Muzzle Positions

**Files:**
- Modify: `src/entities/Player.ts`
- Test: `tests/player.test.ts`

**Interfaces:**
- Consumes: Aim directions (`AimDirection`), `firingFlashTimer`, input states.
- Produces: Correct animation/frame selection, prone hitbox ($20 \times 10$, offset $2, 14$), calibrated `getMuzzleOffset`.

- [ ] **Step 1: Write unit tests in `tests/player.test.ts` for aiming angles and prone crouching**

Test:
- Crouching hitbox is $20 \times 10$ with offset $(2, 14)$.
- Firing sets `firingFlashTimer = 75` ms.
- Standing aim up selects frame 6 (idle) or frame 7 (firing).
- Standing aim up-forward selects frame 8 (idle) or frame 9 (firing).
- Airborne aim down-forward selects frame 10 (idle) or frame 11 (firing).
- Crouching selects frame 4 (idle prone) or frame 5 (firing prone).
- Muzzle offsets match all aiming angles and prone stance.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/player.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement changes in `src/entities/Player.ts`**

- Add `public firingFlashTimer: number = 0;`
- In `shoot()`: set `this.firingFlashTimer = 75;`
- In `updatePlayer()`: decrement `firingFlashTimer`, compute `targetAnim` or fallback frame based on crouch, grounded state, `aimDirection`, and `isFiring`.
- Update crouching hitbox: `body.setSize(20, 10)`, `body.setOffset(2, 14)`.
- Update `getMuzzleOffset` for prone ($(12, 6)$), up ($(2, -16)$), up-forward ($(10, -11)$), down-forward ($(10, 6)$), forward ($(12, -4)$).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/player.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit Player changes**

```bash
git add src/entities/Player.ts tests/player.test.ts
git commit -m "feat(entities): implement 5-way aim stances, prone hitbox, and firing recoil animation"
```

---

### Task 4: Complete System Verification

**Files:**
- All files across the workspace

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All 23 test suites pass.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Exit code 0, no errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with zero errors.
