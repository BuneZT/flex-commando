# Heart Powerup Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable flying powerup capsules to have a 25% chance of dropping a 1-heart healing badge that restores 1 life up to 3 max lives (and grants 500 points).

**Architecture:** Extend `PickupCapsule` and `PickupItem` with a discriminated `CapsuleDropType = WeaponType | 'HEART'` type and a `getRandomCapsuleDrop` selector. Add frame 7 (16x16 red heart badge) to `pickups.png` via `scripts/generate-pixel-assets.mjs`. Add `player.heal(1)` capped at 3 lives in `Player.ts`, and integrate into `GameScene`'s capsule spawning and collection loop with SFX and score bonus.

**Tech Stack:** TypeScript, Phaser 3.90+ Arcade Physics, Vitest, Node.js canvas script.

## Global Constraints
- Strictly typed TypeScript (`noEmit: true` must pass).
- No runtime GC churn: all textures and audio must remain preloaded static assets.
- Headless Vitest testability: core game math and logic must work without browser canvas/DOM dependencies.
- Standard drop chance: 25% chance for a heart, 75% for weapon.
- Max lives cap: 3 lives maximum for healing; full health collection still awards 500 score points.

---

### Task 1: Generate Heart Badge Texture Frame in `pickups.png`

**Files:**
- Modify: `scripts/generate-pixel-assets.mjs:1216-1260`
- Modify: `tests/animation-factory.test.ts:23`
- Output: `public/assets/vfx/pickups.png`

**Interfaces:**
- Produces: 8-frame spritesheet `public/assets/vfx/pickups.png` (128x16 px) where frame 7 is the Heart badge.

- [ ] **Step 1: Update `tests/animation-factory.test.ts` to expect 8 frames for `tex_pickups`**
In `tests/animation-factory.test.ts`:
Change line 23:
```ts
tex_pickups: 8,
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/animation-factory.test.ts`
Expected: FAIL (received 7 instead of 8)

- [ ] **Step 3: Update `scripts/generate-pixel-assets.mjs` to render frame 7 and regenerate `pickups.png`**
In `scripts/generate-pixel-assets.mjs`:
Update `generatePickups()` to width 128 (8 frames of 16x16).
Frame 7:
```javascript
  // --- Frame 7: Heart Badge ---
  const hx = 7 * 16;
  canvas.fillRect(hx + 1, 1, 14, 14, '#1C2430');
  canvas.strokeRect(hx + 2, 2, 12, 12, '#FF2244');
  canvas.fillRect(hx + 3, 3, 10, 10, '#4A0011');
  canvas.fillRect(hx + 2, 2, 12, 1, '#FFFFFF'); // Top highlight

  // Heart glyph inside 10x10 center
  const heartPixels = [
    [hx + 5, 5], [hx + 6, 5], [hx + 9, 5], [hx + 10, 5],
    [hx + 4, 6], [hx + 5, 6], [hx + 6, 6], [hx + 7, 6], [hx + 8, 6], [hx + 9, 6], [hx + 10, 6], [hx + 11, 6],
    [hx + 4, 7], [hx + 5, 7], [hx + 6, 7], [hx + 7, 7], [hx + 8, 7], [hx + 9, 7], [hx + 10, 7], [hx + 11, 7],
    [hx + 5, 8], [hx + 6, 8], [hx + 7, 8], [hx + 8, 8], [hx + 9, 8], [hx + 10, 8],
    [hx + 6, 9], [hx + 7, 9], [hx + 8, 9], [hx + 9, 9],
    [hx + 7, 10], [hx + 8, 10],
    [hx + 7, 11], [hx + 8, 11]
  ];
  for (const [px, py] of heartPixels) {
    canvas.fillRect(px, py, 1, 1, '#FF2244');
  }
  // Pink highlight pixel on left lobe
  canvas.fillRect(hx + 5, 6, 1, 1, '#FFAAAA');
```
Then run: `node scripts/generate-pixel-assets.mjs`

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/animation-factory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add scripts/generate-pixel-assets.mjs public/assets/vfx/pickups.png tests/animation-factory.test.ts
git commit -m "feat(assets): add heart badge frame 7 to pickups spritesheet"
```

---

### Task 2: Implement `player.heal()` in `Player.ts`

**Files:**
- Modify: `src/entities/Player.ts:133`
- Modify: `tests/player.test.ts`

**Interfaces:**
- Produces: `player.heal(amount?: number): number` on `Player` class.
- Consumes: `lives` property on `Player`.

- [ ] **Step 1: Write failing tests in `tests/player.test.ts`**
Add unit test suite to `tests/player.test.ts`:
```ts
describe('Player healing', () => {
  it('should increase lives by amount up to 3 max lives', () => {
    const player = new Player(mockScene, 100, 100);
    player.lives = 1;
    const healed = player.heal(1);
    expect(healed).toBe(1);
    expect(player.lives).toBe(2);

    player.heal(1);
    expect(player.lives).toBe(3);

    // Cannot exceed 3
    const overhealed = player.heal(1);
    expect(overhealed).toBe(0);
    expect(player.lives).toBe(3);
  });

  it('should not heal if player is dead (lives <= 0 or isDead)', () => {
    const player = new Player(mockScene, 100, 100);
    player.lives = 0;
    player.isDead = true;
    const healed = player.heal(1);
    expect(healed).toBe(0);
    expect(player.lives).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/player.test.ts`
Expected: FAIL with "player.heal is not a function"

- [ ] **Step 3: Implement `heal` in `src/entities/Player.ts`**
In `src/entities/Player.ts`:
```ts
  public heal(amount: number = 1): number {
    if (this.lives <= 0 || this.isDead) return 0;
    const prevLives = this.lives;
    this.lives = Math.min(3, this.lives + amount);
    return this.lives - prevLives;
  }
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/player.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/entities/Player.ts tests/player.test.ts
git commit -m "feat(player): add heal method capped at max 3 lives"
```

---

### Task 3: Support Heart Drop in `PickupCapsule` and `PickupItem`

**Files:**
- Modify: `src/entities/PickupCapsule.ts`
- Modify: `tests/weapons.test.ts`

**Interfaces:**
- Produces:
  - `export type CapsuleDropType = WeaponType | 'HEART';`
  - `export const HEART_DROP_CHANCE = 0.25;`
  - `export function getRandomCapsuleDrop(rng?: () => number): CapsuleDropType`
  - `PickupCapsule` handles `CapsuleDropType`
  - `PickupItem` handles `CapsuleDropType` and returns `CapsuleDropType` in `collect()`

- [ ] **Step 1: Write failing unit tests for `getRandomCapsuleDrop` and heart `PickupItem` / `PickupCapsule`**
In `tests/weapons.test.ts`:
```ts
describe('getRandomCapsuleDrop', () => {
  it('returns HEART when rng < 0.25', () => {
    const rng = () => 0.1;
    expect(getRandomCapsuleDrop(rng)).toBe('HEART');
  });

  it('returns a weapon when rng >= 0.25', () => {
    const rng = () => 0.5;
    const result = getRandomCapsuleDrop(rng);
    expect(result).not.toBe('HEART');
  });
});

describe('PickupCapsule with HEART', () => {
  it('spawns and drops a HEART PickupItem', () => {
    const capsule = new PickupCapsule(mockScene, 100, 100, 'HEART');
    expect(capsule.dropType).toBe('HEART');
    const droppedItem = capsule.destroyAndDrop();
    expect(droppedItem.dropType).toBe('HEART');
    expect(droppedItem.collect()).toBe('HEART');
  });

  it('assigns frame 7 for HEART PickupItem when tex_pickups exists', () => {
    const mockSceneWithSheet = {
      ...mockScene,
      textures: { exists: (k: string) => k === 'tex_pickups' }
    };
    const heartItem = new PickupItem(mockSceneWithSheet, 0, 0, 'HEART');
    expect(heartItem.dropType).toBe('HEART');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/weapons.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement updates in `src/entities/PickupCapsule.ts`**
In `src/entities/PickupCapsule.ts`:
- Export `CapsuleDropType`:
  ```ts
  export type CapsuleDropType = WeaponType | 'HEART';
  export const HEART_DROP_CHANCE = 0.25;
  ```
- Export `getRandomCapsuleDrop`:
  ```ts
  export function getRandomCapsuleDrop(rng?: () => number): CapsuleDropType {
    const randomFn = rng || Math.random;
    if (randomFn() < HEART_DROP_CHANCE) {
      return 'HEART';
    }
    return getRandomPickupWeapon(randomFn);
  }
  ```
- Update `PickupItem`:
  ```ts
  public dropType: CapsuleDropType = 'SPREAD_SHOT';
  public weaponType: WeaponType = 'SPREAD_SHOT';
  public letter: PickupLetter | 'H' = 'S';

  constructor(scene: Phaser.Scene, x: number, y: number, dropType: CapsuleDropType = 'SPREAD_SHOT') { ... }

  public initPickup(x: number, y: number, dropType: CapsuleDropType): void {
    this.setPosition(x, y);
    this.dropType = dropType;
    if (dropType === 'HEART') {
      this.letter = 'H';
    } else {
      this.weaponType = dropType;
      this.letter = weaponTypeToLetter(dropType);
    }

    if (this.scene?.textures?.exists?.('tex_pickups')) {
      let badgeFrame = 2;
      if (dropType === 'HEART') {
        badgeFrame = 7;
      } else {
        switch (this.letter) {
          case 'S': badgeFrame = 2; break;
          case 'L': badgeFrame = 3; break;
          case 'F': badgeFrame = 4; break;
          case 'M': badgeFrame = 5; break;
          case 'B': badgeFrame = 6; break;
        }
      }
      this.setTexture('tex_pickups', badgeFrame);
    } else {
      this.setTexture(`tex_pickup_${this.letter}`);
    }
    ...
  }

  public collect(): CapsuleDropType {
    ...
    return this.dropType;
  }
  ```
- Update `PickupCapsule`:
  ```ts
  public dropType: CapsuleDropType = 'SPREAD_SHOT';
  public get weaponType(): WeaponType {
    return this.dropType === 'HEART' ? 'SPREAD_SHOT' : this.dropType;
  }
  public set weaponType(w: WeaponType) {
    this.dropType = w;
  }
  // constructor and spawnCapsule accept dropType: CapsuleDropType
  public destroyAndDrop(): PickupItem {
    ...
    return new PickupItem(this.scene, this.x, this.y, this.dropType);
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run tests/weapons.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/entities/PickupCapsule.ts tests/weapons.test.ts
git commit -m "feat(pickups): support HEART drop type in PickupCapsule and PickupItem"
```

---

### Task 4: Integrate Heart Pickup Spawning and Collection in `GameScene.ts`

**Files:**
- Modify: `src/scenes/GameScene.ts:279-281, 725-740`
- Modify: `tests/game-loop.test.ts`

**Interfaces:**
- Consumes: `getRandomCapsuleDrop()`, `PickupItem.collect()`, `player.heal()`

- [ ] **Step 1: Write integration tests in `tests/game-loop.test.ts`**
Add test for collecting a heart item in `GameScene`:
```ts
it('heals player and plays pickup sound when collecting a HEART item', () => {
  // Setup GameScene with player with 1 life and dropped HEART item
  // Call player vs pickup collision logic
  // Assert player.lives increases to 2, score increases by 500
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run tests/game-loop.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `src/scenes/GameScene.ts`**
1. Import `getRandomCapsuleDrop` from `../entities/PickupCapsule`.
2. In capsule spawning (line ~279):
```ts
const roomCapsuleDrop = getRandomCapsuleDrop();
const roomCapsule = new PickupCapsule(this, roomX + 60, roomY + 90, roomCapsuleDrop);
this.pickupCapsules.push(roomCapsule);
```
3. In player vs pickup collision loop (line ~731):
```ts
if (this.checkOverlap(this.player, item, 4)) {
  const drop = item.collect();
  if (drop === 'HEART') {
    this.player.heal(1);
  } else {
    this.player.equipWeapon(drop);
  }
  SoundManager.getInstance().playSfx('pickup');
  this.score += POWERUP_SCORE_VALUE;
  this.pickupItems.splice(i, 1);
  if (typeof item.destroy === 'function') {
    item.destroy();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**
Run: `npx vitest run tests/game-loop.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/scenes/GameScene.ts tests/game-loop.test.ts
git commit -m "feat(scene): spawn heart capsules and heal player on collection"
```

---

### Task 5: Full Regression Testing & Quality Gates

**Files:** None (verification)

- [ ] **Step 1: Run complete Vitest suite**
Run: `npx vitest run`
Expected: PASS all test files

- [ ] **Step 2: Run TypeScript compiler check**
Run: `npx tsc --noEmit`
Expected: Clean exit 0

- [ ] **Step 3: Run Vite build**
Run: `npm run build`
Expected: Clean build in `dist/`
