# Enemy Hit & Death Visual Effects Design Spec

## 1. Overview
In *Flex Commando: Rogue Beef*, combat currently lacks immediate visual feedback when enemies or damageable objects take damage. Bullets disappear on contact with enemies, and 1-HP enemies vanish abruptly without any hit indication or death animation.

This specification introduces a decoupled, arcade-authentic visual feedback system:
1. **White Flash on Non-Lethal Hit**: When any damageable combat target takes damage without dying, its sprite silhouette flashes solid white (`setTintFill(0xffffff)`) for ~90ms before returning to its normal texture colors.
2. **Retro Animated Death Explosion**: When a target's health reaches 0, a procedural 4-frame retro pixel explosion animation (`tex_explosion` / `enemy_explosion`) spawns at the target's center position before the sprite is deactivated and hidden.
3. **Decoupled `CombatFX` Module**: All visual hit flashing and death explosion spawning are encapsulated in a lightweight `CombatFX` helper, ensuring zero coupling between enemy AI and visual FX, and guaranteeing 100% safety in headless Vitest unit tests.
4. **Purely Visual**: In accordance with user requirements, this feature is strictly visual and introduces no new sound effects or audio manager changes.

---

## 2. Target Scope
The visual feedback applies to all damageable targets in the game:
- **Standard Enemies**: `Trooper`, `Turret`, `FalconDrone`, `JumperMercenary`.
- **Boss**: Flashes white on every bullet hit; spawns an amplified, scaled explosion upon defeat.
- **Pickup Capsules**: `PickupCapsule` flashes white on non-lethal bullet hits; spawns an explosion burst when opened/destroyed before spawning the letter pickup.

---

## 3. Architecture & Components

### 3.1 Procedural Explosion Texture & Animation (`TextureFactory.ts`)
- **Texture Key**: `tex_explosion`
- **Dimensions**: 4 frames of 20x20 pixels (total spritesheet width: 80x20 pixels).
  - **Frame 0 (Ignition / Core Flash)**: Pure white central star/diamond burst (`0xffffff`, radius ~4px).
  - **Frame 1 (Fireball Expansion)**: Intense yellow (`0xffff00`) and white core with jagged pixel edges (radius ~7px).
  - **Frame 2 (Debris & Flame Ring)**: Orange/red fire ring (`0xff4400` / `0xff8800`) with separating pixel shrapnel sparks (radius ~9px).
  - **Frame 3 (Dissipation)**: Fading smoke and embers (`0x666677` and `0x442211`) scattered outward before vanishing.
- **Animation Key**: `enemy_explosion`
  - Frames: 0 to 3 of `tex_explosion`.
  - Frame rate: 16 fps (~250ms duration total).
  - Repeat: 0 (play once, then trigger completion).

### 3.2 `CombatFX` Service (`src/core/CombatFX.ts`)
A dedicated, standalone utility class providing pure visual helper functions:
```ts
export class CombatFX {
  /**
   * Applies a solid white silhouette flash to a target sprite for durationMs.
   * Gracefully degrades in headless / mocked environments.
   */
  public static applyHitFlash(
    target: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite,
    durationMs: number = 90
  ): void;

  /**
   * Spawns an animated retro explosion at (x, y) that self-destructs upon completion.
   */
  public static spawnDeathExplosion(
    scene: Phaser.Scene,
    x: number,
    y: number,
    scale: number = 1.0
  ): Phaser.GameObjects.Sprite | null;
}
```

#### Safe Implementation Details:
- **Hit Flash (`applyHitFlash`)**:
  - Checks if `target.setTintFill` exists and is a function before calling `target.setTintFill(0xffffff)`.
  - If `target.scene?.time?.delayedCall` is available:
    - Schedules `target.clearTint()` after `durationMs`.
    - If `target` is no longer active or scene is shutting down, guarded with `if (target && target.active && typeof target.clearTint === 'function')`.
  - If timers are unavailable (such as during headless Vitest tests), the function executes cleanly without throwing.
- **Explosion Spawning (`spawnDeathExplosion`)**:
  - Checks if `scene.add?.sprite` exists.
  - Spawns sprite at `(x, y)` with key `'tex_explosion'`.
  - Sets depth to `50` (well above tilesets and background entities, below HUD).
  - Sets scale if `scale !== 1.0` (e.g. `2.0` for Boss).
  - If `anims?.play` exists:
    - Plays `'enemy_explosion'`.
    - Listens to `Phaser.Animations.Events.ANIMATION_COMPLETE` (or `'animationcomplete'`) and calls `explosion.destroy()`.
  - If animations do not exist or in headless mode, immediately returns the sprite or destroys it cleanly.

### 3.3 Enemy Integration (`EnemyBase.ts` & Subclasses)
Add an `explosionScale: number = 1.0;` property to `EnemyBase` (with `this.explosionScale = 2.0;` configured in `Boss.ts`), avoiding circular import dependencies:

In [`EnemyBase.ts`](file:///C:/Users/marci/Documents/game_dev/flex-commando/src/entities/enemies/EnemyBase.ts):
```ts
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

  // Non-lethal hit: white flash
  CombatFX.applyHitFlash(this, 90);
  return false;
}
```

### 3.4 Pickup Capsule Integration (`PickupCapsule.ts`)
In [`PickupCapsule.ts`](file:///C:/Users/marci/Documents/game_dev/flex-commando/src/entities/PickupCapsule.ts):
```ts
public hit(): PickupItem | null {
  if (this.hp <= 0) return null;
  this.hp -= 1;

  if (this.hp <= 0) {
    CombatFX.spawnDeathExplosion(this.scene, this.x, this.y, 1.0);
    return this.openCapsule();
  }

  // Non-lethal hit: white flash
  CombatFX.applyHitFlash(this, 90);
  return null;
}
```

---

## 4. Verification & Testing Strategy

1. **Unit Testing `TextureFactory` (`tests/texture-factory.test.ts`)**:
   - Verify `tex_explosion` is created in `Phaser.Textures.TextureManager`.
   - Verify `enemy_explosion` animation is registered in `Phaser.Animations.AnimationManager`.

2. **Unit Testing `CombatFX` (`tests/combat-fx.test.ts`)**:
   - Verify `applyHitFlash` safely calls `setTintFill(0xffffff)` on sprites.
   - Verify `applyHitFlash` schedules `clearTint()` safely via delayedCall.
   - Verify `spawnDeathExplosion` creates a sprite, sets scale and depth, plays `enemy_explosion`, and hooks `destroy()` to animation completion.
   - Verify robustness when scene or sprite methods are omitted / mocked in headless node environments.

3. **Integration Testing Enemy & Capsule Hit Reactions (`tests/enemy.test.ts` & `tests/pickup-capsule.test.ts`)**:
   - Verify non-lethal `takeDamage` on `Trooper`, `Turret`, `Drone`, `Jumper`, `Boss` calls hit flash.
   - Verify lethal `takeDamage` spawns death explosion before `die()`.
   - Verify non-lethal and lethal hits on `PickupCapsule` trigger hit flash and explosion respectively.

4. **Regression & Full Suite**:
   - Execute `npm test` across all 20+ test files (175+ tests).
   - Execute `npx tsc --noEmit` for strict TypeScript verification.
