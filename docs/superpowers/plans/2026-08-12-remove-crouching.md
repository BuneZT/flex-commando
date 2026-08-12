# Remove Crouching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove player crouching functionality completely while updating ground `Down` input to aim straight `DOWN` (90° angle) with normal 24px height, movement, and jumping.

**Architecture:** Update `PlayerAim.ts` state machine to return `DOWN` for grounded `Down` input without horizontal movement and remove `'CROUCH'` from `AimDirection`. Update `Player.ts` to remove `isCrouching`, crouch animation, speed locking, and hitbox resizing. Remove `player_crouch` animation in `TextureFactory.ts`. Update unit tests in `player-aim.test.ts` and `player.test.ts`.

**Tech Stack:** TypeScript, Phaser 3.80+ Arcade Physics, Vitest (`happy-dom`).

## Global Constraints

- Tech Stack: TypeScript (strictly typed, `noEmit: true`), Vite, Phaser 3.80+ Arcade Physics, Vitest (`happy-dom`).
- All tests must pass with `npx vitest run`.
- TypeScript type check must pass with `npx tsc --noEmit`.

---

### Task 1: Update Aim Direction State Machine & Tests

**Files:**
- Modify: `src/entities/PlayerAim.ts`
- Modify: `tests/player-aim.test.ts`

**Interfaces:**
- Consumes: `InputState` interface in `PlayerAim.ts`
- Produces: `AimDirection` union type without `'CROUCH'`, `calculateAimDirection`, `getAimAngleDegrees`

- [ ] **Step 1: Write failing unit test for PlayerAim**

Modify `tests/player-aim.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateAimDirection, getAimAngleDegrees } from '../src/entities/PlayerAim';

describe('calculateAimDirection', () => {
  it('should return UP when holding Up key without left/right', () => {
    const aim = calculateAimDirection({ up: true, down: false, left: false, right: false, isGrounded: true, facingLeft: false });
    expect(aim).toBe('UP');
  });

  it('should return UP_FORWARD when holding Up key with horizontal movement', () => {
    const aimRight = calculateAimDirection({ up: true, down: false, left: false, right: true, isGrounded: true, facingLeft: false });
    expect(aimRight).toBe('UP_FORWARD');

    const aimLeft = calculateAimDirection({ up: true, down: false, left: true, right: false, isGrounded: false, facingLeft: true });
    expect(aimLeft).toBe('UP_FORWARD');
  });

  it('should return DOWN when holding Down key on ground without horizontal movement', () => {
    const aim = calculateAimDirection({ up: false, down: true, left: false, right: false, isGrounded: true, facingLeft: false });
    expect(aim).toBe('DOWN');
  });

  it('should return DOWN_FORWARD when holding Down key with horizontal movement on ground', () => {
    const aim = calculateAimDirection({ up: false, down: true, left: false, right: true, isGrounded: true, facingLeft: false });
    expect(aim).toBe('DOWN_FORWARD');
  });

  it('should return DOWN when holding Down key in air without horizontal movement', () => {
    const aim = calculateAimDirection({ up: false, down: true, left: false, right: false, isGrounded: false, facingLeft: false });
    expect(aim).toBe('DOWN');
  });

  it('should return DOWN_FORWARD when holding Down key in air with horizontal movement', () => {
    const aim = calculateAimDirection({ up: false, down: true, left: true, right: false, isGrounded: false, facingLeft: true });
    expect(aim).toBe('DOWN_FORWARD');
  });

  it('should return FORWARD when no vertical key is pressed', () => {
    const aimGrounded = calculateAimDirection({ up: false, down: false, left: true, right: false, isGrounded: true, facingLeft: true });
    expect(aimGrounded).toBe('FORWARD');

    const aimAir = calculateAimDirection({ up: false, down: false, left: false, right: false, isGrounded: false, facingLeft: false });
    expect(aimAir).toBe('FORWARD');
  });
});

describe('getAimAngleDegrees', () => {
  it('should return correct degrees when facing right', () => {
    expect(getAimAngleDegrees('FORWARD', false)).toBe(0);
    expect(getAimAngleDegrees('UP_FORWARD', false)).toBe(-45);
    expect(getAimAngleDegrees('UP', false)).toBe(-90);
    expect(getAimAngleDegrees('DOWN_FORWARD', false)).toBe(45);
    expect(getAimAngleDegrees('DOWN', false)).toBe(90);
  });

  it('should return correct degrees when facing left', () => {
    expect(getAimAngleDegrees('FORWARD', true)).toBe(180);
    expect(getAimAngleDegrees('UP_FORWARD', true)).toBe(-135);
    expect(getAimAngleDegrees('UP', true)).toBe(-90);
    expect(getAimAngleDegrees('DOWN_FORWARD', true)).toBe(135);
    expect(getAimAngleDegrees('DOWN', true)).toBe(90);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/player-aim.test.ts`
Expected: FAIL (assertion expected 'DOWN', got 'CROUCH').

- [ ] **Step 3: Implement PlayerAim changes**

Modify `src/entities/PlayerAim.ts`:

```typescript
export type AimDirection = 'FORWARD' | 'UP' | 'UP_FORWARD' | 'DOWN_FORWARD' | 'DOWN';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  isGrounded: boolean;
  facingLeft: boolean;
}

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

export function getAimAngleDegrees(aim: AimDirection, facingLeft: boolean): number {
  if (facingLeft) {
    switch (aim) {
      case 'FORWARD':
        return 180;
      case 'UP_FORWARD':
        return -135;
      case 'UP':
        return -90;
      case 'DOWN_FORWARD':
        return 135;
      case 'DOWN':
        return 90;
    }
  } else {
    switch (aim) {
      case 'FORWARD':
        return 0;
      case 'UP_FORWARD':
        return -45;
      case 'UP':
        return -90;
      case 'DOWN_FORWARD':
        return 45;
      case 'DOWN':
        return 90;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/player-aim.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/entities/PlayerAim.ts tests/player-aim.test.ts
git commit -m "refactor: remove CROUCH aim direction and return DOWN for grounded down aim"
```

---

### Task 2: Remove Crouching from Player Entity, TextureFactory, & Update Tests

**Files:**
- Modify: `src/entities/Player.ts`
- Modify: `src/core/TextureFactory.ts`
- Modify: `tests/player.test.ts`

**Interfaces:**
- Consumes: `AimDirection`, `calculateAimDirection`, `getAimAngleDegrees` from `PlayerAim.ts`
- Produces: Updated `Player` entity without `isCrouching` or crouch animation/hitbox, updated `TextureFactory` without `player_crouch` animation.

- [ ] **Step 1: Write failing test in tests/player.test.ts**

Modify `tests/player.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { Player } from '../src/entities/Player';
import { RawInputState } from '../src/config/Controls';

function createMockScene(): Phaser.Scene {
  return {
    sys: {
      queueDepthSort: () => {},
      displayList: { add: () => {} },
      updateList: { add: () => {} },
      anims: { get: () => null, exists: () => false, on: () => {}, once: () => {}, off: () => {} },
      textures: { get: (key?: string) => ({ key: key || '', get: () => ({}) }) },
    },
    add: { existing: () => {} },
    physics: { add: { existing: () => {} } },
  } as unknown as Phaser.Scene;
}

function createMockBody(): Phaser.Physics.Arcade.Body {
  let width = 16;
  let height = 24;
  let offsetX = 0;
  let offsetY = 0;
  let velX = 0;
  let velY = 0;

  return {
    get width() { return width; },
    get height() { return height; },
    get offsetX() { return offsetX; },
    get offsetY() { return offsetY; },
    get velocityX() { return velX; },
    get velocityY() { return velY; },
    setCollideWorldBounds: () => {},
    setSize: (w: number, h: number) => { width = w; height = h; },
    setOffset: (x: number, y: number) => { offsetX = x; offsetY = y; },
    setVelocityX: (vx: number) => { velX = vx; },
    setVelocityY: (vy: number) => { velY = vy; },
    blocked: { down: true },
    touching: { down: true },
    checkCollision: { down: true },
  } as unknown as Phaser.Physics.Arcade.Body;
}

describe('Player entity', () => {
  it('should initialize with default properties and default texture key', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    expect(player.lives).toBe(3);
    expect(player.aimDirection).toBe('FORWARD');
    expect(player.facingLeft).toBe(false);
    expect(player.texture.key).toBe('tex_player');
  });

  it('should update aiming and facing direction when moving left', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    player.body = createMockBody();

    const input: RawInputState = {
      up: true,
      down: false,
      left: true,
      right: false,
      jump: false,
      jumpJustPressed: false,
      shoot: false,
      shootJustPressed: false,
    };
    player.updatePlayer(input);
    expect(player.facingLeft).toBe(true);
    expect(player.aimDirection).toBe('UP_FORWARD');
    expect(player.getAimAngle()).toBe(-135);
  });

  it('should handle grounded down aim without shrinking hitbox', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    const body = createMockBody();
    player.body = body;

    const input: RawInputState = {
      up: false,
      down: true,
      left: false,
      right: false,
      jump: false,
      jumpJustPressed: false,
      shoot: false,
      shootJustPressed: false,
    };
    player.updatePlayer(input);
    expect(player.aimDirection).toBe('DOWN');
    expect(body.height).toBe(24);
  });

  it('should calculate muzzle position correctly', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    player.facingLeft = false;
    player.aimDirection = 'FORWARD';

    const pos = player.getMuzzlePosition();
    expect(pos.x).toBeGreaterThan(100);
    expect(pos.y).toBe(96);
  });

  it('should have sufficient jump velocity to reach 80px high platform ledges', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    expect(Math.abs(player.jumpVelocity)).toBeGreaterThanOrEqual(340);
  });
});
```

- [ ] **Step 2: Run test to verify status**

Run: `npx vitest run tests/player.test.ts`
Expected: FAIL (because `Player.ts` still references `isCrouching` and returns `CROUCH`).

- [ ] **Step 3: Implement Player.ts and TextureFactory.ts updates**

Modify `src/entities/Player.ts`:

```typescript
import Phaser from 'phaser';
import { AimDirection, calculateAimDirection, getAimAngleDegrees } from './PlayerAim';
import { RawInputState } from '../config/Controls';
import { WeaponType, getSpreadShotAngles, WEAPON_CONFIGS } from '../weapons/WeaponTypes';
import { ProjectilePool } from '../weapons/ProjectilePool';
import { SoundManager } from '../core/SoundManager';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public aimDirection: AimDirection = 'FORWARD';
  public facingLeft: boolean = false;
  public lives: number = 3;
  public moveSpeed: number = 120;
  public jumpVelocity: number = -340;
  public isDroppingThrough: boolean = false;
  private dropThroughTimer: number = 0;

  // Weapon System & Barrier
  public currentWeapon: WeaponType = 'PEA_SHOOTER';
  public shootTimer: number = 0;
  public barrierHits: number = 0;
  public isBarrierActive: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'tex_player') {
    super(scene, x, y, texture);
    if (scene.add && typeof scene.add.existing === 'function') {
      scene.add.existing(this);
    }
    if (scene.physics && scene.physics.add && typeof scene.physics.add.existing === 'function') {
      scene.physics.add.existing(this);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(true);
      body.setSize(16, 24);
      body.setOffset(0, 0);
    }
  }

  public equipWeapon(weaponType: WeaponType): void {
    if (weaponType === 'BARRIER') {
      this.isBarrierActive = true;
      this.barrierHits = 3;
    } else {
      this.currentWeapon = weaponType;
    }
  }

  public hitBarrier(): boolean {
    if (this.isBarrierActive && this.barrierHits > 0) {
      this.barrierHits -= 1;
      if (this.barrierHits <= 0) {
        this.isBarrierActive = false;
      }
      return true; // Hit absorbed
    }
    return false; // No barrier to absorb hit
  }

  public updatePlayer(input: RawInputState, delta: number = 16, projectilePool?: ProjectilePool): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    const isGrounded = body.blocked?.down || body.touching?.down || false;

    // Update Facing Direction
    if (input.left && !input.right) {
      this.facingLeft = true;
    } else if (input.right && !input.left) {
      this.facingLeft = false;
    }

    if (typeof this.setFlipX === 'function') {
      this.setFlipX(this.facingLeft);
    }

    // Calculate Aim Direction
    this.aimDirection = calculateAimDirection({
      up: input.up,
      down: input.down,
      left: input.left,
      right: input.right,
      isGrounded,
      facingLeft: this.facingLeft,
    });

    if (this.anims && typeof this.anims.play === 'function') {
      if (!isGrounded) {
        this.anims.play('player_jump', true);
      } else if (input.left || input.right) {
        this.anims.play('player_run', true);
      } else {
        this.anims.play('player_idle', true);
      }
    }

    // Handle Drop-Through Platform Timer
    if (this.isDroppingThrough) {
      this.dropThroughTimer -= delta;
      if (this.dropThroughTimer <= 0) {
        this.isDroppingThrough = false;
        if (body.checkCollision) {
          body.checkCollision.down = true;
        }
      }
    }

    // Handle Drop-Through platform trigger
    if (isGrounded && input.down && input.jumpJustPressed) {
      this.isDroppingThrough = true;
      this.dropThroughTimer = 250; // ms to pass through one-way platform
      if (body.checkCollision) {
        body.checkCollision.down = false;
      }
    } else if (isGrounded && input.jumpJustPressed) {
      // Regular Jump
      body.setVelocityY(this.jumpVelocity);
    }

    // Horizontal Movement
    body.setSize(16, 24);
    body.setOffset(0, 0);

    if (input.left) {
      body.setVelocityX(-this.moveSpeed);
    } else if (input.right) {
      body.setVelocityX(this.moveSpeed);
    } else {
      body.setVelocityX(0);
    }

    // Shooting System
    if (this.shootTimer > 0) {
      this.shootTimer -= delta;
    }

    const wantsToShoot = this.currentWeapon === 'MACHINE_GUN'
      ? input.shoot
      : (input.shootJustPressed || input.shoot);

    if (wantsToShoot && this.shootTimer <= 0 && projectilePool) {
      this.shoot(projectilePool);
    }
  }

  public shoot(projectilePool: ProjectilePool): void {
    const muzzle = this.getMuzzlePosition();
    const aimAngle = this.getAimAngle();
    const stats = WEAPON_CONFIGS[this.currentWeapon] || WEAPON_CONFIGS.PEA_SHOOTER;

    if (this.currentWeapon === 'SPREAD_SHOT') {
      const angles = getSpreadShotAngles(aimAngle);
      for (const angle of angles) {
        projectilePool.spawn(muzzle.x, muzzle.y, angle, 'SPREAD_SHOT', true);
      }
      SoundManager.getInstance().playShoot('SPREAD_SHOT', true);
    } else {
      projectilePool.spawn(muzzle.x, muzzle.y, aimAngle, this.currentWeapon, true);
      SoundManager.getInstance().playShoot(this.currentWeapon, true);
    }

    this.shootTimer = stats.fireRateMs;
  }

  public getAimAngle(): number {
    return getAimAngleDegrees(this.aimDirection, this.facingLeft);
  }

  public getMuzzlePosition(): { x: number; y: number } {
    const angleDeg = this.getAimAngle();
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const offsetX = Math.cos(angleRad) * 12;
    const offsetY = Math.sin(angleRad) * 12;
    const spawnY = this.y - 4;
    return {
      x: this.x + offsetX,
      y: spawnY + offsetY,
    };
  }
}
```

In `src/core/TextureFactory.ts`: Remove the `player_crouch` animation registration block (lines 304-310).

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run`
Expected: ALL PASS

Run: `npx tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 5: Commit**

```bash
git add src/entities/Player.ts src/core/TextureFactory.ts tests/player.test.ts
git commit -m "feat: remove player crouching logic, animation, and hitbox resizing"
```
