# Remove Procedural TextureFactory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely eliminate `TextureFactory.ts` (1,100+ lines of procedural canvas drawing code) by extracting animation registration into `AnimationFactory.ts`, updating `BootScene.ts`, and cleaning up tests and docs.

**Architecture:** Create a focused `AnimationFactory` service that defines animation frame mappings for preloaded static spritesheets. BootScene delegates animation registration to this service. All procedural canvas fallback code is deleted.

**Tech Stack:** TypeScript, Phaser 3.80+ (Headless & WebGL), Vitest (`happy-dom`).

## Global Constraints

- Never execute procedural canvas drawing (`scene.add.graphics().generateTexture()`) at runtime.
- Maintain documentation integrity: update `AGENTS.md` to document `AnimationFactory.ts` and remove `TextureFactory.ts`.
- All tests in `npm test` must pass (23 test suites).
- TypeScript compile check (`npx tsc --noEmit`) must succeed with 0 errors.

---

### Task 1: Create `src/core/AnimationFactory.ts` and `tests/animation-factory.test.ts`

**Files:**
- Create: `src/core/AnimationFactory.ts`
- Test: `tests/animation-factory.test.ts`

**Interfaces:**
- Produces: `AnimationFactory.registerAnimations(scene: Phaser.Scene): void`

- [ ] **Step 1: Write the failing test**

Create `tests/animation-factory.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { AnimationFactory } from '../src/core/AnimationFactory';

describe('AnimationFactory', () => {
  let game: Phaser.Game;
  let scene: Phaser.Scene;

  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      game = new Phaser.Game({
        type: Phaser.HEADLESS,
        scene: {
          create() {
            scene = this;
            resolve();
          },
        },
      });
    });
  });

  it('registers all 24 required animations in Phaser.Animations.AnimationManager', () => {
    AnimationFactory.registerAnimations(scene);

    const animKeys = [
      'player_idle',
      'player_run',
      'player_run_shoot',
      'player_run_up',
      'player_run_shoot_up',
      'player_run_down',
      'player_run_shoot_down',
      'player_jump',
      'player_crouch',
      'player_crouch_shoot',
      'player_aim_up',
      'player_shoot_up',
      'player_aim_up_forward',
      'player_shoot_up_forward',
      'player_aim_down_forward',
      'player_shoot_down_forward',
      'player_shoot_forward',
      'trooper_run',
      'drone_fly',
      'jumper_jump',
      'boss_drive',
      'capsule_spin',
      'enemy_explosion',
      'bullet_impact_spark',
    ];

    expect(animKeys).toHaveLength(24);
    animKeys.forEach((key) => {
      expect(scene.anims.exists(key), `Expected animation '${key}' to exist`).toBe(true);
    });
  });

  it('is idempotent when registerAnimations is called multiple times', () => {
    expect(() => {
      AnimationFactory.registerAnimations(scene);
      AnimationFactory.registerAnimations(scene);
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/animation-factory.test.ts`
Expected: FAIL with "Cannot find module '../src/core/AnimationFactory'"

- [ ] **Step 3: Write minimal implementation**

Create `src/core/AnimationFactory.ts`:
```typescript
import Phaser from 'phaser';

export class AnimationFactory {
  public static registerAnimations(scene: Phaser.Scene): void {
    if (!scene || !scene.anims) return;

    // Player Animations (tex_player: 24x24 frames)
    this.createAnimIfNotExists(scene, 'player_idle', 'tex_player', [0], 1, 0);
    this.createAnimFrameRangeIfNotExists(scene, 'player_run', 'tex_player', 1, 2, 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_shoot', 'tex_player', [13, 14], 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_up', 'tex_player', [15, 16], 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_shoot_up', 'tex_player', [17, 18], 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_down', 'tex_player', [19, 20], 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_shoot_down', 'tex_player', [21, 22], 8, -1);
    this.createAnimIfNotExists(scene, 'player_jump', 'tex_player', [3], 1, 0);
    this.createAnimIfNotExists(scene, 'player_crouch', 'tex_player', [4], 1, 0);
    this.createAnimIfNotExists(scene, 'player_crouch_shoot', 'tex_player', [5], 1, 0);
    this.createAnimIfNotExists(scene, 'player_aim_up', 'tex_player', [6], 1, 0);
    this.createAnimIfNotExists(scene, 'player_shoot_up', 'tex_player', [7], 1, 0);
    this.createAnimIfNotExists(scene, 'player_aim_up_forward', 'tex_player', [8], 1, 0);
    this.createAnimIfNotExists(scene, 'player_shoot_up_forward', 'tex_player', [9], 1, 0);
    this.createAnimIfNotExists(scene, 'player_aim_down_forward', 'tex_player', [10], 1, 0);
    this.createAnimIfNotExists(scene, 'player_shoot_down_forward', 'tex_player', [11], 1, 0);
    this.createAnimIfNotExists(scene, 'player_shoot_forward', 'tex_player', [12], 1, 0);

    // Enemy Animations
    this.createAnimFrameRangeIfNotExists(scene, 'trooper_run', 'tex_enemy_trooper', 0, 1, 6, -1);
    this.createAnimFrameRangeIfNotExists(scene, 'drone_fly', 'tex_enemy_drone', 0, 1, 10, -1);
    this.createAnimFrameRangeIfNotExists(scene, 'jumper_jump', 'tex_enemy_jumper', 0, 1, 6, -1);
    this.createAnimFrameRangeIfNotExists(scene, 'boss_drive', 'tex_enemy_boss', 0, 1, 4, -1);

    // Pickup & VFX Animations
    const capsuleKey = scene.textures?.exists('tex_pickups') ? 'tex_pickups' : 'tex_capsule_flying';
    this.createAnimFrameRangeIfNotExists(scene, 'capsule_spin', capsuleKey, 0, 1, 6, -1);
    this.createAnimFrameRangeIfNotExists(scene, 'enemy_explosion', 'tex_explosion', 0, 3, 16, 0);
    this.createAnimFrameRangeIfNotExists(scene, 'bullet_impact_spark', 'tex_bullet_impact', 0, 3, 24, 0);
  }

  private static createAnimIfNotExists(
    scene: Phaser.Scene,
    key: string,
    textureKey: string,
    frames: number[],
    frameRate: number,
    repeat: number
  ): void {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map((frame) => ({ key: textureKey, frame })),
      frameRate,
      repeat,
    });
  }

  private static createAnimFrameRangeIfNotExists(
    scene: Phaser.Scene,
    key: string,
    textureKey: string,
    start: number,
    end: number,
    frameRate: number,
    repeat: number
  ): void {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(textureKey, { start, end }),
      frameRate,
      repeat,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/animation-factory.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit**

```bash
git add src/core/AnimationFactory.ts tests/animation-factory.test.ts
git commit -m "feat(core): add AnimationFactory for declarative sprite animation registration"
```

---

### Task 2: Update `BootScene.ts` and `tests/menu-scenes.test.ts`

**Files:**
- Modify: `src/scenes/BootScene.ts`
- Modify: `tests/menu-scenes.test.ts`

**Interfaces:**
- Consumes: `AnimationFactory.registerAnimations(scene: Phaser.Scene)`

- [ ] **Step 1: Update `src/scenes/BootScene.ts`**

Replace `import { TextureFactory } from '../core/TextureFactory';` with `import { AnimationFactory } from '../core/AnimationFactory';`.
In `create()`, replace `TextureFactory.generateAllTextures(this);` with `AnimationFactory.registerAnimations(this);`.

- [ ] **Step 2: Update `tests/menu-scenes.test.ts`**

Replace `import { TextureFactory } from '../src/core/TextureFactory';` with `import { AnimationFactory } from '../src/core/AnimationFactory';`.
Update test spy:
```typescript
const registerSpy = vi.spyOn(AnimationFactory, 'registerAnimations').mockImplementation(() => {});
boot.create();
expect(registerSpy).toHaveBeenCalledWith(boot);
registerSpy.mockRestore();
```

- [ ] **Step 3: Run menu scenes tests**

Run: `npx vitest run tests/menu-scenes.test.ts`
Expected: PASS (12 tests passed)

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BootScene.ts tests/menu-scenes.test.ts
git commit -m "refactor(scene): delegate animation registration in BootScene to AnimationFactory"
```

---

### Task 3: Delete `TextureFactory.ts`, Remove `tests/texture-factory.test.ts`, and Update `AGENTS.md`

**Files:**
- Delete: `src/core/TextureFactory.ts`
- Delete: `tests/texture-factory.test.ts`
- Modify: `AGENTS.md`

- [ ] **Step 1: Delete `src/core/TextureFactory.ts` and `tests/texture-factory.test.ts`**

Remove the files from disk and git.

- [ ] **Step 2: Update `AGENTS.md`**

Replace `TextureFactory.ts` references with `AnimationFactory.ts`:
- In directory structure: `│   ├── AnimationFactory.ts   # Declarative sprite animation registration`
- In core rules: Remove mentions of procedural runtime generation in `TextureFactory.ts` and note that all sprites are preloaded static files.

- [ ] **Step 3: Run full verification**

Run:
1. `npm test` -> All test suites pass
2. `npx tsc --noEmit` -> 0 TypeScript compiler errors
3. `npm run build` -> Vite build completes cleanly

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(core): purge procedural TextureFactory and update AGENTS.md"
```
