# Design Spec: Remove Procedural TextureFactory and Decouple Animations

- **Date:** 2026-10-23
- **Topic:** Complete removal of procedural sprite generation (`TextureFactory.ts`) and introduction of `AnimationFactory.ts`
- **Status:** Approved

---

## 1. Context & Motivation

In previous iterations, Flex Commando transitioned all in-game sprites, backgrounds, tiles, VFX, and audio to preloaded static assets (`public/assets/`). However, [`TextureFactory.ts`](file:///c:/Users/marci/Documents/game_dev/flex-commando/src/core/TextureFactory.ts) remained in the codebase with over 1,100 lines of procedural canvas graphics drawing code (`scene.add.graphics().generateTexture()`) serving purely as a fallback for headless unit tests.

During actual browser gameplay, all 15 static assets exist, making the procedural sprite generation completely dormant. The only active and necessary responsibility residing in `TextureFactory.ts` is the registration of Phaser animations (`createAnimations`).

Keeping 1,100+ lines of procedural sprite generation creates code clutter, maintenance overhead, and confusion about whether procedural generation is active.

---

## 2. Goals & Non-Goals

### Goals
1. **Purge Procedural Texture Code**: Completely delete [`src/core/TextureFactory.ts`](file:///c:/Users/marci/Documents/game_dev/flex-commando/src/core/TextureFactory.ts).
2. **Dedicated Animation Service**: Create [`src/core/AnimationFactory.ts`](file:///c:/Users/marci/Documents/game_dev/flex-commando/src/core/AnimationFactory.ts) that contains only clean, declarative animation registration logic for preloaded static spritesheets.
3. **Decouple BootScene**: Update [`src/scenes/BootScene.ts`](file:///c:/Users/marci/Documents/game_dev/flex-commando/src/scenes/BootScene.ts) to invoke `AnimationFactory.registerAnimations(this)` in `create()`.
4. **Update Test Suites**:
   - Replace [`tests/texture-factory.test.ts`](file:///c:/Users/marci/Documents/game_dev/flex-commando/tests/texture-factory.test.ts) with [`tests/animation-factory.test.ts`](file:///c:/Users/marci/Documents/game_dev/flex-commando/tests/animation-factory.test.ts) verifying that all 24 game animations are registered in Phaser's `AnimationManager`.
   - Update [`tests/menu-scenes.test.ts`](file:///c:/Users/marci/Documents/game_dev/flex-commando/tests/menu-scenes.test.ts) to spy on `AnimationFactory.registerAnimations`.
5. **Update Documentation**: Update [`AGENTS.md`](file:///c:/Users/marci/Documents/game_dev/flex-commando/AGENTS.md) to reflect the removal of `TextureFactory.ts` and document `AnimationFactory.ts`.

### Non-Goals
- Changing any in-game animations, frame counts, or sprite configurations.
- Modifying offline asset generators in `scripts/generate-pixel-assets.mjs`.

---

## 3. Architecture & Detailed Design

### 3.1 `src/core/AnimationFactory.ts`
A static utility class that registers all 24 animations onto `Phaser.Scene.anims` if they do not already exist:

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

### 3.2 `src/scenes/BootScene.ts`
Replace:
```typescript
import { TextureFactory } from '../core/TextureFactory';
...
  create(): void {
    TextureFactory.generateAllTextures(this);
    this.scene?.start('MainMenuScene');
  }
```
With:
```typescript
import { AnimationFactory } from '../core/AnimationFactory';
...
  create(): void {
    AnimationFactory.registerAnimations(this);
    this.scene?.start('MainMenuScene');
  }
```

### 3.3 Deletion of `src/core/TextureFactory.ts`
Permanently remove `src/core/TextureFactory.ts`.

### 3.4 Unit Tests
1. **`tests/animation-factory.test.ts`**:
   - Boot a headless Phaser game.
   - Call `AnimationFactory.registerAnimations(scene)`.
   - Assert all 24 animation keys exist in `scene.anims`.
   - Assert idempotency: calling `registerAnimations(scene)` twice does not throw or duplicate animations.
2. **`tests/menu-scenes.test.ts`**:
   - Update `BootScene.create` test to spy on `AnimationFactory.registerAnimations` instead of `TextureFactory.generateAllTextures`.

---

## 4. Verification Plan

1. **Unit Tests**:
   - Run `npx vitest run` to ensure all 23 test suites pass.
2. **Typecheck**:
   - Run `npx tsc --noEmit` to ensure zero TypeScript compiler errors.
3. **Build**:
   - Run `npm run build` to verify the Vite production bundle builds cleanly.
