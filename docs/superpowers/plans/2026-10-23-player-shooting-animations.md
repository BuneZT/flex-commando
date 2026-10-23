# Player Shooting and Movement Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Contra-style shooting and aim animations while moving (forward, up-forward, down-forward) and add standing diagonal-down shooting support in `flex-commando`.

**Architecture:** Expand the player spritesheet from 13 frames (312×24px) to 23 frames (552×24px) containing running legs with horizontal, 45° upward, and 45° downward rifles and muzzle flares. Register the new animations in `TextureFactory.ts` and update `Player.ts` to switch between `run`, `run_up`, and `run_down` (and their `_shoot` variants) based on `aimDirection` and `firingFlashTimer`, as well as supporting `DOWN_FORWARD` while grounded stationary.

**Tech Stack:** TypeScript, Phaser 3.80+, Arcade Physics, Vitest, Node.js scripts.

## Global Constraints
- Frame size: strictly 24×24 pixels per frame.
- Static PNG preloaded asset in `public/assets/sprites/player.png` must be regenerated via offline script `scripts/generate-pixel-assets.mjs`.
- Procedural fallback generator in `TextureFactory.ts` must maintain parity with the preloaded PNG and be guarded with `if (scene.textures.exists(key)) return;`.
- Zero dynamic texture generation or Web Audio node creation during gameplay runtime.

---

### Task 1: Generate Expanded Player Spritesheet (23 frames) & Update Asset Integrity Tests

**Files:**
- Modify: `scripts/generate-pixel-assets.mjs:540-800`
- Modify: `tests/assets-integrity.test.ts`
- Asset generated: `public/assets/sprites/player.png`

**Interfaces:**
- Produces: `public/assets/sprites/player.png` (552×24px PNG, 23 frames of 24×24px)

- [ ] **Step 1: Update asset integrity test in `tests/assets-integrity.test.ts` to assert 23 frames (552px width)**

```typescript
// in tests/assets-integrity.test.ts, update player sprite assertion
expect(fs.existsSync(path.join(spritesDir, 'player.png'))).toBe(true);
const playerBuf = fs.readFileSync(path.join(spritesDir, 'player.png'));
const playerWidth = playerBuf.readUInt32BE(16);
const playerHeight = playerBuf.readUInt32BE(20);
expect(playerWidth).toBe(552); // 23 frames * 24px
expect(playerHeight).toBe(24);
```

- [ ] **Step 2: Run asset integrity test to verify it fails**

Run: `npx vitest run tests/assets-integrity.test.ts`
Expected: FAIL (received 312 instead of 552)

- [ ] **Step 3: Update `generatePlayer()` in `scripts/generate-pixel-assets.mjs` with frames 13-22**

Add pixel art generation for:
- Frame 13: Run Step 1 with horizontal rifle & forward muzzle flare
- Frame 14: Run Step 2 with horizontal rifle & forward muzzle flare
- Frame 15: Run Step 1 with 45° upward rifle
- Frame 16: Run Step 2 with 45° upward rifle
- Frame 17: Run Step 1 with 45° upward rifle & diagonal muzzle flare
- Frame 18: Run Step 2 with 45° upward rifle & diagonal muzzle flare
- Frame 19: Run Step 1 with 45° downward rifle
- Frame 20: Run Step 2 with 45° downward rifle
- Frame 21: Run Step 1 with 45° downward rifle & diagonal muzzle flare
- Frame 22: Run Step 2 with 45° downward rifle & diagonal muzzle flare

- [ ] **Step 4: Execute `node scripts/generate-pixel-assets.mjs` to re-create `public/assets/sprites/player.png`**

Run: `node scripts/generate-pixel-assets.mjs`
Expected: Successfully generates `public/assets/sprites/player.png`

- [ ] **Step 5: Run asset integrity test to verify it passes**

Run: `npx vitest run tests/assets-integrity.test.ts`
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add scripts/generate-pixel-assets.mjs public/assets/sprites/player.png tests/assets-integrity.test.ts
git commit -m "feat(assets): expand player spritesheet to 23 frames for running aim and shoot"
```

---

### Task 2: Texture Factory Fallback Generator & Animation Registrations

**Files:**
- Modify: `src/core/TextureFactory.ts:40-280, 550-620`
- Test: `tests/texture-factory.test.ts`

**Interfaces:**
- Consumes: `tex_player` texture key
- Produces:
  - Animation `player_run_shoot` (frames 13, 14)
  - Animation `player_run_up` (frames 15, 16)
  - Animation `player_run_shoot_up` (frames 17, 18)
  - Animation `player_run_down` (frames 19, 20)
  - Animation `player_run_shoot_down` (frames 21, 22)

- [ ] **Step 1: Write unit test in `tests/texture-factory.test.ts` asserting new player animations exist**

```typescript
it('should create running aim and shoot player animations', () => {
  // test anims registered: player_run_shoot, player_run_up, player_run_shoot_up, player_run_down, player_run_shoot_down
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/texture-factory.test.ts`
Expected: FAIL (animations do not exist)

- [ ] **Step 3: Update `TextureFactory.createPlayerTexture` and `TextureFactory.createAnimations`**

Add frames 13-22 in `createPlayerTexture` (width 552, 23 frames).
Register animations:
- `player_run_shoot`: frames [13, 14], frameRate 8, repeat -1
- `player_run_up`: frames [15, 16], frameRate 8, repeat -1
- `player_run_shoot_up`: frames [17, 18], frameRate 8, repeat -1
- `player_run_down`: frames [19, 20], frameRate 8, repeat -1
- `player_run_shoot_down`: frames [21, 22], frameRate 8, repeat -1

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/texture-factory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/core/TextureFactory.ts tests/texture-factory.test.ts
git commit -m "feat(core): register running aim and shoot player animations in TextureFactory"
```

---

### Task 3: Update Player Stance, Muzzle Offsets, and Movement Shoot Animations

**Files:**
- Modify: `src/entities/Player.ts:314-375`
- Modify: `tests/player.test.ts`

**Interfaces:**
- Consumes: Animations from `TextureFactory.ts`, `RawInputState`, `aimDirection`, `firingFlashTimer`
- Produces: Correct `targetAnim` and `fallbackFrame` when moving and aiming/shooting, as well as stationary down-forward aim/shoot

- [ ] **Step 1: Write failing unit tests in `tests/player.test.ts` for movement aim/shoot and stationary down-forward**

Tests to add:
- Moving horizontally while firing plays `player_run_shoot`
- Moving horizontally while aiming UP_FORWARD plays `player_run_up`
- Moving horizontally while aiming UP_FORWARD and firing plays `player_run_shoot_up`
- Moving horizontally while holding down (DOWN_FORWARD) plays `player_run_down`
- Moving horizontally while holding down and firing plays `player_run_shoot_down`
- Grounded stationary while aiming DOWN_FORWARD plays `player_aim_down_forward`
- Grounded stationary while aiming DOWN_FORWARD and firing plays `player_shoot_down_forward`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/player.test.ts`
Expected: FAIL (returns `player_run` or `player_idle`)

- [ ] **Step 3: Update animation selection logic in `src/entities/Player.ts`**

Update `updatePlayer`:
```typescript
      } else if (input.left || input.right) {
        if (this.aimDirection === 'UP_FORWARD') {
          targetAnim = isFiring ? 'player_run_shoot_up' : 'player_run_up';
          fallbackFrame = isFiring ? 17 : 15;
        } else if (this.aimDirection === 'DOWN_FORWARD') {
          targetAnim = isFiring ? 'player_run_shoot_down' : 'player_run_down';
          fallbackFrame = isFiring ? 21 : 19;
        } else if (this.aimDirection === 'UP') {
          targetAnim = isFiring ? 'player_shoot_up' : 'player_aim_up';
          fallbackFrame = isFiring ? 7 : 6;
        } else {
          targetAnim = isFiring ? 'player_run_shoot' : 'player_run';
          fallbackFrame = isFiring ? 13 : 1;
        }
      } else {
        // Grounded stationary
        if (this.aimDirection === 'UP') {
          targetAnim = isFiring ? 'player_shoot_up' : 'player_aim_up';
          fallbackFrame = isFiring ? 7 : 6;
        } else if (this.aimDirection === 'UP_FORWARD') {
          targetAnim = isFiring ? 'player_shoot_up_forward' : 'player_aim_up_forward';
          fallbackFrame = isFiring ? 9 : 8;
        } else if (this.aimDirection === 'DOWN_FORWARD') {
          targetAnim = isFiring ? 'player_shoot_down_forward' : 'player_aim_down_forward';
          fallbackFrame = isFiring ? 11 : 10;
        } else if (isFiring) {
          targetAnim = 'player_shoot_forward';
          fallbackFrame = 12;
        } else {
          targetAnim = 'player_idle';
          fallbackFrame = 0;
        }
      }
```

- [ ] **Step 4: Run unit tests to verify they pass**

Run: `npx vitest run tests/player.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/entities/Player.ts tests/player.test.ts
git commit -m "feat(player): add running aim/shoot and standing diagonal-down animation support"
```

---

### Task 4: Complete Verification and Build

**Files:**
- None (verification phase)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL test suites pass (23/23 passed)

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds without errors
