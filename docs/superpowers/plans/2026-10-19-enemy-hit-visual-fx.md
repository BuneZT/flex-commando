# Enemy Hit & Death Visual Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add solid white hit flash feedback on non-lethal damage and a retro pixel explosion burst animation on lethal hits for all damageable entities (enemies, Boss, and Pickup Capsules).

**Architecture:** A standalone `CombatFX` helper manages `applyHitFlash` and `spawnDeathExplosion`. Procedural 4-frame explosion texture and animation (`tex_explosion` / `enemy_explosion`) are generated in `TextureFactory`. `EnemyBase` and `PickupCapsule` trigger these effects on damage and destruction while remaining fully decoupled from presentation mechanics and testable in headless Vitest.

**Tech Stack:** TypeScript (strictly typed), Phaser 3.80+ (Arcade Physics), Vitest (`happy-dom`).

## Global Constraints
- Decoupled pure logic: safe guards for all Phaser methods (`target.setTintFill`, `target.clearTint`, `scene.anims`, `scene.time.delayedCall`) so code never crashes in headless/mocked testing.
- No new audio: Strictly visual effects; no changes to sound or BGM.
- Projectile recycling: Projectiles and pool mechanisms remain strictly unchanged.
- Typecheck: Zero TypeScript errors under `npx tsc --noEmit`.
- Vitest: All existing 175 tests and new tests must pass (`npm test`).

---

### Task 1: Procedural Explosion Texture & Animation (`TextureFactory.ts`)

**Files:**
- Modify: `src/core/TextureFactory.ts`
- Test: `tests/texture-factory.test.ts`

**Interfaces:**
- Produces:
  - Texture: `'tex_explosion'` (4 frames of 20x20px, total 80x20px)
  - Animation: `'enemy_explosion'` (frames 0..3 of `'tex_explosion'`, 16 fps, repeat 0)

- [ ] **Step 1: Write failing test in `tests/texture-factory.test.ts`**

Add tests checking that `'tex_explosion'` texture and `'enemy_explosion'` animation are registered:
```ts
it('registers tex_explosion and enemy_explosion animation in TextureFactory', () => {
  const scene = new Phaser.Scene({ key: 'TestScene' });
  (scene as any).textures = {
    exists: vi.fn().mockReturnValue(false),
    get: vi.fn().mockReturnValue({ add: vi.fn() }),
  };
  (scene as any).add = {
    graphics: vi.fn().mockReturnValue({
      fillStyle: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      generateTexture: vi.fn(),
      destroy: vi.fn(),
    }),
  };
  (scene as any).anims = {
    exists: vi.fn().mockReturnValue(false),
    create: vi.fn(),
    generateFrameNumbers: vi.fn().mockReturnValue([{ key: 'tex_explosion', frame: 0 }]),
  };

  TextureFactory.generateAllTextures(scene);

  expect((scene.add.graphics().generateTexture)).toHaveBeenCalledWith(
    'tex_explosion',
    80,
    20
  );
  expect(scene.anims.create).toHaveBeenCalledWith(
    expect.objectContaining({
      key: 'enemy_explosion',
      frameRate: 16,
      repeat: 0,
    })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/texture-factory.test.ts`
Expected: FAIL (`tex_explosion` not generated)

- [ ] **Step 3: Implement procedural explosion in `TextureFactory.ts`**

In `src/core/TextureFactory.ts`:
1. Add `this.createExplosionTexture(scene);` inside `generateAllTextures()`.
2. Add `createExplosionTexture(scene: Phaser.Scene): void`:
```ts
  private static createExplosionTexture(scene: Phaser.Scene): void {
    if (!scene.textures || scene.textures.exists('tex_explosion')) return;
    const g = scene.add.graphics();
    // 4 frames of 20x20 = 80x20
    for (let f = 0; f < 4; f++) {
      const ox = f * 20;
      if (f === 0) {
        // Frame 0: White core flash star
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 8, 8, 4, 4);
        g.fillRect(ox + 6, 9, 8, 2);
        g.fillRect(ox + 9, 6, 2, 8);
      } else if (f === 1) {
        // Frame 1: Expanding yellow & white burst
        g.fillStyle(0xffff00, 1);
        g.fillCircle(ox + 10, 10, 7);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ox + 10, 10, 4);
      } else if (f === 2) {
        // Frame 2: Orange/red fire ring & debris sparks
        g.fillStyle(0xff4400, 1);
        g.fillCircle(ox + 10, 10, 8);
        g.fillStyle(0xffbb00, 1);
        g.fillCircle(ox + 10, 10, 5);
        // Sparks
        g.fillStyle(0xffffff, 1);
        g.fillRect(ox + 2, 3, 2, 2);
        g.fillRect(ox + 16, 4, 2, 2);
        g.fillRect(ox + 3, 15, 2, 2);
        g.fillRect(ox + 15, 14, 2, 2);
      } else {
        // Frame 3: Dissipating dark smoke & embers
        g.fillStyle(0x555566, 0.7);
        g.fillCircle(ox + 10, 10, 6);
        g.fillStyle(0xff6600, 0.8);
        g.fillRect(ox + 5, 6, 2, 2);
        g.fillRect(ox + 13, 7, 2, 2);
        g.fillRect(ox + 8, 13, 2, 2);
      }
    }
    g.generateTexture('tex_explosion', 80, 20);
    g.destroy();

    const tex = scene.textures.get('tex_explosion');
    if (tex && typeof tex.add === 'function') {
      for (let f = 0; f < 4; f++) {
        tex.add(f, 0, f * 20, 0, 20, 20);
      }
    }
  }
```
3. In `createAnimations(scene: Phaser.Scene): void`, register `enemy_explosion`:
```ts
    if (!scene.anims.exists('enemy_explosion')) {
      scene.anims.create({
        key: 'enemy_explosion',
        frames: scene.anims.generateFrameNumbers('tex_explosion', { start: 0, end: 3 }),
        frameRate: 16,
        repeat: 0,
      });
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/texture-factory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/TextureFactory.ts tests/texture-factory.test.ts
git commit -m "feat: add procedural explosion texture and animation"
```

---

### Task 2: Create `CombatFX` Service (`src/core/CombatFX.ts`)

**Files:**
- Create: `src/core/CombatFX.ts`
- Create: `tests/combat-fx.test.ts`

**Interfaces:**
- Consumes:
  - `Phaser.GameObjects.Sprite`, `Phaser.Scene`
  - Texture `'tex_explosion'`, Animation `'enemy_explosion'`
- Produces:
  - `CombatFX.applyHitFlash(target: any, durationMs?: number): void`
  - `CombatFX.spawnDeathExplosion(scene: Phaser.Scene, x: number, y: number, scale?: number): any`

- [ ] **Step 1: Write failing unit test in `tests/combat-fx.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { CombatFX } from '../src/core/CombatFX';

describe('CombatFX', () => {
  it('applies solid white hit flash and schedules tint clearing', () => {
    let timerCallback: (() => void) | null = null;
    const delayedCallMock = vi.fn((_ms: number, cb: () => void) => {
      timerCallback = cb;
    });

    const spriteMock: any = {
      active: true,
      setTintFill: vi.fn(),
      clearTint: vi.fn(),
      scene: {
        time: {
          delayedCall: delayedCallMock,
        },
      },
    };

    CombatFX.applyHitFlash(spriteMock, 90);

    expect(spriteMock.setTintFill).toHaveBeenCalledWith(0xffffff);
    expect(delayedCallMock).toHaveBeenCalledWith(90, expect.any(Function));

    // Simulate timer firing
    timerCallback?.();
    expect(spriteMock.clearTint).toHaveBeenCalled();
  });

  it('safely handles sprites in headless/mocked environments without throwing', () => {
    expect(() => {
      CombatFX.applyHitFlash({} as any);
    }).not.toThrow();
  });

  it('spawns death explosion sprite and binds animationcomplete destroy handler', () => {
    let animCompleteCb: (() => void) | null = null;
    const spriteMock: any = {
      setDepth: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      anims: {
        play: vi.fn(),
      },
      once: vi.fn((event: string, cb: () => void) => {
        if (event === 'animationcomplete') animCompleteCb = cb;
      }),
      destroy: vi.fn(),
    };

    const sceneMock: any = {
      add: {
        sprite: vi.fn().mockReturnValue(spriteMock),
      },
    };

    const result = CombatFX.spawnDeathExplosion(sceneMock, 150, 200, 1.5);

    expect(sceneMock.add.sprite).toHaveBeenCalledWith(150, 200, 'tex_explosion');
    expect(spriteMock.setDepth).toHaveBeenCalledWith(50);
    expect(spriteMock.setScale).toHaveBeenCalledWith(1.5);
    expect(spriteMock.anims.play).toHaveBeenCalledWith('enemy_explosion');
    expect(spriteMock.once).toHaveBeenCalledWith('animationcomplete', expect.any(Function));

    animCompleteCb?.();
    expect(spriteMock.destroy).toHaveBeenCalled();
    expect(result).toBe(spriteMock);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/combat-fx.test.ts`
Expected: FAIL (Cannot find module `CombatFX`)

- [ ] **Step 3: Implement `src/core/CombatFX.ts`**

```ts
import Phaser from 'phaser';

export class CombatFX {
  /**
   * Applies a solid white silhouette flash to a target sprite for durationMs.
   */
  public static applyHitFlash(
    target: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite | any,
    durationMs: number = 90
  ): void {
    if (!target) return;

    if (typeof target.setTintFill === 'function') {
      target.setTintFill(0xffffff);
    }

    const scene = target.scene;
    if (scene?.time && typeof scene.time.delayedCall === 'function') {
      scene.time.delayedCall(durationMs, () => {
        if (target && target.active && typeof target.clearTint === 'function') {
          target.clearTint();
        }
      });
    }
  }

  /**
   * Spawns an animated retro explosion at (x, y) that destroys itself when finished.
   */
  public static spawnDeathExplosion(
    scene: Phaser.Scene | any,
    x: number,
    y: number,
    scale: number = 1.0
  ): Phaser.GameObjects.Sprite | null {
    if (!scene || !scene.add || typeof scene.add.sprite !== 'function') {
      return null;
    }

    const explosion = scene.add.sprite(x, y, 'tex_explosion');
    if (!explosion) return null;

    if (typeof explosion.setDepth === 'function') {
      explosion.setDepth(50);
    }

    if (scale !== 1.0 && typeof explosion.setScale === 'function') {
      explosion.setScale(scale);
    }

    if (explosion.anims && typeof explosion.anims.play === 'function') {
      explosion.anims.play('enemy_explosion');
      if (typeof explosion.once === 'function') {
        explosion.once('animationcomplete', () => {
          if (typeof explosion.destroy === 'function') {
            explosion.destroy();
          }
        });
      }
    } else if (typeof explosion.destroy === 'function') {
      explosion.destroy();
    }

    return explosion;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/combat-fx.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/CombatFX.ts tests/combat-fx.test.ts
git commit -m "feat: add CombatFX service for hit flash and explosion spawning"
```

---

### Task 3: Enemy Hit & Death Reaction Integration (`EnemyBase.ts` & `Boss.ts`)

**Files:**
- Modify: `src/entities/enemies/EnemyBase.ts`
- Modify: `src/entities/enemies/Boss.ts`
- Test: `tests/enemy.test.ts`

**Interfaces:**
- Consumes: `CombatFX.applyHitFlash`, `CombatFX.spawnDeathExplosion`
- Modifies: `takeDamage(amount: number): boolean` in `EnemyBase`

- [ ] **Step 1: Write failing tests in `tests/enemy.test.ts`**

Add tests checking that non-lethal damage triggers hit flash, and lethal damage spawns explosion before `die()`:
```ts
it('triggers CombatFX.applyHitFlash on non-lethal damage', () => {
  const flashSpy = vi.spyOn(CombatFX, 'applyHitFlash');
  const enemy = new Trooper(sceneMock, 100, 100);
  enemy.health = 5;
  enemy.maxHealth = 5;

  const killed = enemy.takeDamage(1);

  expect(killed).toBe(false);
  expect(flashSpy).toHaveBeenCalledWith(enemy, 90);
  flashSpy.mockRestore();
});

it('triggers CombatFX.spawnDeathExplosion with explosionScale on lethal damage', () => {
  const explosionSpy = vi.spyOn(CombatFX, 'spawnDeathExplosion');
  const enemy = new Trooper(sceneMock, 100, 100);
  enemy.health = 1;

  const killed = enemy.takeDamage(1);

  expect(killed).toBe(true);
  expect(enemy.isAlive).toBe(false);
  expect(explosionSpy).toHaveBeenCalledWith(enemy.scene, enemy.x, enemy.y, 1.0);
  explosionSpy.mockRestore();
});

it('Boss uses explosionScale 2.0 upon lethal damage', () => {
  const explosionSpy = vi.spyOn(CombatFX, 'spawnDeathExplosion');
  const boss = new Boss(sceneMock, 200, 200, 1);

  boss.takeDamage(1);

  expect(explosionSpy).toHaveBeenCalledWith(boss.scene, boss.x, boss.y, 2.0);
  explosionSpy.mockRestore();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/enemy.test.ts`
Expected: FAIL (`applyHitFlash` / `spawnDeathExplosion` not called in `takeDamage`)

- [ ] **Step 3: Update `EnemyBase.ts` and `Boss.ts`**

In `src/entities/enemies/EnemyBase.ts`:
```ts
import { CombatFX } from '../../core/CombatFX';

export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  // Existing properties...
  public explosionScale: number = 1.0;

  public takeDamage(amount: number): boolean {
    if (!this.isAlive) return true;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      CombatFX.spawnDeathExplosion(this.scene, this.x, this.y, this.explosionScale);
      this.die();
      return true;
    }

    CombatFX.applyHitFlash(this, 90);
    return false;
  }
}
```

In `src/entities/enemies/Boss.ts`:
Set `this.explosionScale = 2.0;` inside the constructor:
```ts
  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 50, texture: string = 'tex_enemy_boss') {
    super(scene, x, y, texture, health);
    this.scoreValue = 5000;
    this.damageOnContact = 2;
    this.explosionScale = 2.0;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/enemy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/entities/enemies/EnemyBase.ts src/entities/enemies/Boss.ts tests/enemy.test.ts
git commit -m "feat: integrate hit flash and death explosion in EnemyBase and Boss"
```

---

### Task 4: Pickup Capsule Hit Reaction Integration (`PickupCapsule.ts`)

**Files:**
- Modify: `src/entities/PickupCapsule.ts`
- Test: `tests/pickup-capsule.test.ts` (or add to existing test file)

**Interfaces:**
- Consumes: `CombatFX.applyHitFlash`, `CombatFX.spawnDeathExplosion`
- Modifies: `hit(): PickupItem | null` in `PickupCapsule`

- [ ] **Step 1: Write failing test in `tests/pickup-capsule.test.ts`**

Verify that non-lethal capsule hit triggers `applyHitFlash`, and opening hit triggers `spawnDeathExplosion`:
```ts
it('triggers CombatFX.applyHitFlash on non-lethal capsule hit', () => {
  const flashSpy = vi.spyOn(CombatFX, 'applyHitFlash');
  const capsule = new PickupCapsule(sceneMock, 100, 100, 'SPREAD_SHOT');
  capsule.hp = 3;

  const item = capsule.hit();

  expect(item).toBeNull();
  expect(capsule.hp).toBe(2);
  expect(flashSpy).toHaveBeenCalledWith(capsule, 90);
  flashSpy.mockRestore();
});

it('triggers CombatFX.spawnDeathExplosion when capsule is destroyed', () => {
  const explosionSpy = vi.spyOn(CombatFX, 'spawnDeathExplosion');
  const capsule = new PickupCapsule(sceneMock, 100, 100, 'SPREAD_SHOT');
  capsule.hp = 1;

  const item = capsule.hit();

  expect(item).not.toBeNull();
  expect(capsule.hp).toBe(0);
  expect(explosionSpy).toHaveBeenCalledWith(capsule.scene, capsule.x, capsule.y, 1.0);
  explosionSpy.mockRestore();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pickup-capsule.test.ts`
Expected: FAIL (`applyHitFlash` / `spawnDeathExplosion` not called on capsule hit)

- [ ] **Step 3: Update `PickupCapsule.ts`**

In `src/entities/PickupCapsule.ts`:
```ts
import { CombatFX } from '../core/CombatFX';

  public hit(): PickupItem | null {
    if (this.hp <= 0) return null;
    this.hp -= 1;

    if (this.hp <= 0) {
      CombatFX.spawnDeathExplosion(this.scene, this.x, this.y, 1.0);
      return this.openCapsule();
    }

    CombatFX.applyHitFlash(this, 90);
    return null;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pickup-capsule.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/entities/PickupCapsule.ts tests/pickup-capsule.test.ts
git commit -m "feat: integrate hit flash and explosion on PickupCapsule damage and destruction"
```

---

### Task 5: Full Suite Verification & Build

**Files:**
- All modified files

- [ ] **Step 1: Run full Vitest suite**

Run: `npm test`
Expected: PASS (all test files, 180+ tests)

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds without warnings or errors

- [ ] **Step 4: Final commit & git status verification**

Ensure clean git status on branch.
