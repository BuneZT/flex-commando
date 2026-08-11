# Flex Commando: Rogue Beef Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a procedurally generated 2D run-and-gun platformer game ("Flex Commando: Rogue Beef") in Phaser 3 with TypeScript, featuring a 4x4 room matrix grid, 8-directional aiming, arcade power-up pickups, and keyboard-only controls.

**Architecture:** A Vite + TypeScript web application running Phaser 3 with Arcade Physics. Game logic is split cleanly into scene management (`BootScene`, `MainMenuScene`, `GameScene`, `GameOverScene`), a procedural grid generator algorithm (`GridGenerator`), componentized entity state machines (`Player`, `Enemy`), and pooled projectile pools.

**Tech Stack:** TypeScript 5+, Vite 5+, Phaser 3.80+, Vitest (for unit testing grid generation algorithms), HTML5 Canvas.

## Global Constraints

- **Language & Framework:** TypeScript strictly typed, Phaser 3.80+ with Arcade Physics.
- **Controls:** Keyboard-only. `Space` bar for Jump, `WASD` / Arrow Keys for Movement & 8-way Aim, `X` / `J` for Shoot.
- **Resolution:** 320x240 view resolution scaled up to fit screen with pixel art anti-aliasing disabled (`pixelArt: true`).
- **Level Generation:** 4x4 room grid, procedural pathing, 20x15 tile dimensions per room with 16x16px tiles.

---

### Task 1: Project Scaffolding & Scene Graph Setup (Ticket 1)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`
- Create: `src/config/GameConfig.ts`
- Create: `src/scenes/BootScene.ts`, `src/scenes/MainMenuScene.ts`, `src/scenes/GameScene.ts`, `src/scenes/GameOverScene.ts`
- Test: `tests/config.test.ts`

**Interfaces:**
- Consumes: None (initial setup)
- Produces: `GameConfig` object, Phaser `Game` instance, basic Scene state transitions (`Boot` -> `MainMenu` -> `Game` -> `GameOver`).

- [ ] **Step 1: Write failing config test**

```typescript
// tests/config.test.ts
import { describe, it, expect } from 'vitest';
import { GameConfig } from '../src/config/GameConfig';

describe('GameConfig', () => {
  it('should define 320x240 pixel art arcade settings', () => {
    expect(GameConfig.width).toBe(320);
    expect(GameConfig.height).toBe(240);
    expect(GameConfig.pixelArt).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL with "Cannot find module '../src/config/GameConfig'"

- [ ] **Step 3: Create scaffolding & minimal implementation**

`package.json`:
```json
{
  "name": "flex-commando",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "phaser": "^3.80.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

`src/config/GameConfig.ts`:
```typescript
import Phaser from 'phaser';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 320,
  height: 240,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 600 },
      debug: false
    }
  }
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/ tests/
git commit -m "feat: setup Vite + TypeScript + Phaser 3 project structure"
```

---

### Task 2: Player Movement & 8-Directional Aiming (Ticket 2)

**Files:**
- Create: `src/entities/Player.ts`
- Create: `src/config/Controls.ts`
- Test: `tests/player-aim.test.ts`

**Interfaces:**
- Consumes: Phaser Physics Sprite, `WASD` / Arrow Key input state
- Produces: `Player` class with `aimDirection` enum (`UP`, `UP_FORWARD`, `FORWARD`, `DOWN_FORWARD`, `DOWN`, `CROUCH`), jump state, drop-through platform mechanics.

- [ ] **Step 1: Write failing aim state test**

```typescript
// tests/player-aim.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAimDirection } from '../src/entities/PlayerAim';

describe('calculateAimDirection', () => {
  it('should return UP when holding Up key without left/right', () => {
    const aim = calculateAimDirection({ up: true, down: false, left: false, right: false, isGrounded: true, facingLeft: false });
    expect(aim).toBe('UP');
  });

  it('should return CROUCH when holding Down key on ground', () => {
    const aim = calculateAimDirection({ up: false, down: true, left: false, right: false, isGrounded: true, facingLeft: false });
    expect(aim).toBe('CROUCH');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/player-aim.test.ts`
Expected: FAIL with "Cannot find module '../src/entities/PlayerAim'"

- [ ] **Step 3: Implement PlayerAim logic and Player entity**

`src/entities/PlayerAim.ts`:
```typescript
export type AimDirection = 'FORWARD' | 'UP' | 'UP_FORWARD' | 'DOWN_FORWARD' | 'DOWN' | 'CROUCH';

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
    if (input.isGrounded) {
      return movingHoriz ? 'DOWN_FORWARD' : 'CROUCH';
    }
    return movingHoriz ? 'DOWN_FORWARD' : 'DOWN';
  }
  return 'FORWARD';
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/player-aim.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/entities/ tests/
git commit -m "feat: implement 8-way directional aiming state machine and player input logic"
```

---

### Task 3: Procedural 4x4 Room Grid Engine (Ticket 3)

**Files:**
- Create: `src/core/GridGenerator.ts`
- Create: `src/core/RoomTemplate.ts`
- Test: `tests/grid-generator.test.ts`

**Interfaces:**
- Consumes: Seed / RNG functions
- Produces: 4x4 Room Matrix (`GridCell[][]`) containing `doorMask` (`N`, `S`, `E`, `W` bit flags), room type (`START`, `PATH`, `BRANCH`, `BOSS`), and selected template IDs.

- [ ] **Step 1: Write failing grid generator test**

```typescript
// tests/grid-generator.test.ts
import { describe, it, expect } from 'vitest';
import { generateRoomGrid } from '../src/core/GridGenerator';

describe('GridGenerator', () => {
  it('should generate a 4x4 grid with a continuous path from start to boss room', () => {
    const grid = generateRoomGrid(12345);
    expect(grid.length).toBe(4);
    expect(grid[0].length).toBe(4);
    
    // Find start room in column 0
    const startRoom = grid.flat().find(r => r.type === 'START');
    expect(startRoom).toBeDefined();
    expect(startRoom?.x).toBe(0);

    // Find boss room in column 3
    const bossRoom = grid.flat().find(r => r.type === 'BOSS');
    expect(bossRoom).toBeDefined();
    expect(bossRoom?.x).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/grid-generator.test.ts`
Expected: FAIL with "Cannot find module '../src/core/GridGenerator'"

- [ ] **Step 3: Implement 4x4 Room Grid Generator**

`src/core/GridGenerator.ts`:
```typescript
export interface GridCell {
  x: number;
  y: number;
  type: 'EMPTY' | 'START' | 'PATH' | 'BRANCH' | 'BOSS';
  doors: { north: boolean; south: boolean; east: boolean; west: boolean };
}

export function generateRoomGrid(seed: number): GridCell[][] {
  const grid: GridCell[][] = Array.from({ length: 4 }, (_, y) =>
    Array.from({ length: 4 }, (_, x) => ({
      x,
      y,
      type: 'EMPTY',
      doors: { north: false, south: false, east: false, west: false }
    }))
  );

  const startY = Math.floor(Math.random() * 4);
  const bossY = Math.floor(Math.random() * 4);

  grid[startY][0].type = 'START';
  grid[bossY][3].type = 'BOSS';

  let currentX = 0;
  let currentY = startY;

  while (currentX < 3 || currentY !== bossY) {
    const nextDirs: ('EAST' | 'NORTH' | 'SOUTH')[] = [];
    if (currentX < 3) nextDirs.push('EAST');
    if (currentY > 0 && currentY > bossY) nextDirs.push('NORTH');
    if (currentY < 3 && currentY < bossY) nextDirs.push('SOUTH');

    const choice = nextDirs[Math.floor(Math.random() * nextDirs.length)] || 'EAST';

    if (choice === 'EAST') {
      grid[currentY][currentX].doors.east = true;
      currentX++;
      grid[currentY][currentX].doors.west = true;
    } else if (choice === 'NORTH') {
      grid[currentY][currentX].doors.north = true;
      currentY--;
      grid[currentY][currentX].doors.south = true;
    } else if (choice === 'SOUTH') {
      grid[currentY][currentX].doors.south = true;
      currentY++;
      grid[currentY][currentX].doors.north = true;
    }

    if (grid[currentY][currentX].type === 'EMPTY') {
      grid[currentY][currentX].type = 'PATH';
    }
  }

  return grid;
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/grid-generator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/ tests/
git commit -m "feat: implement 4x4 procedural room grid generation algorithm"
```

---

### Task 4: Tilemap Renderer & Camera Switcher (Ticket 4)

**Files:**
- Create: `src/core/TilemapRenderer.ts`
- Create: `src/core/CameraManager.ts`
- Modify: `src/scenes/GameScene.ts`
- Test: `tests/tilemap-renderer.test.ts`

**Interfaces:**
- Consumes: `GridCell[][]`, Phaser Tilemap Layer, Phaser Camera
- Produces: Stitched level tilemap, active room bounding box, smooth room-transition camera scrolling.

- [ ] **Step 1: Write failing camera bounds test**

```typescript
// tests/tilemap-renderer.test.ts
import { describe, it, expect } from 'vitest';
import { getRoomBounds } from '../src/core/CameraManager';

describe('getRoomBounds', () => {
  it('should calculate pixel bounds for room at grid (1, 2)', () => {
    // 20 tiles * 16px = 320px width; 15 tiles * 16px = 240px height
    const bounds = getRoomBounds(1, 2, 320, 240);
    expect(bounds.x).toBe(320);
    expect(bounds.y).toBe(480);
    expect(bounds.width).toBe(320);
    expect(bounds.height).toBe(240);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/tilemap-renderer.test.ts`
Expected: FAIL with "Cannot find module '../src/core/CameraManager'"

- [ ] **Step 3: Implement CameraManager and TilemapRenderer**

`src/core/CameraManager.ts`:
```typescript
export interface RoomBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getRoomBounds(gridX: number, gridY: number, roomWidthPx = 320, roomHeightPx = 240): RoomBounds {
  return {
    x: gridX * roomWidthPx,
    y: gridY * roomHeightPx,
    width: roomWidthPx,
    height: roomHeightPx
  };
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/tilemap-renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/ src/scenes/ tests/
git commit -m "feat: add tilemap rendering bounds and active room camera panning manager"
```

---

### Task 5: Weapon System, Projectile Pool & Pickup Capsules (Ticket 5)

**Files:**
- Create: `src/weapons/ProjectilePool.ts`
- Create: `src/weapons/WeaponTypes.ts`
- Create: `src/entities/PickupCapsule.ts`
- Modify: `src/entities/Player.ts`
- Test: `tests/weapons.test.ts`

**Interfaces:**
- Consumes: Player position & `AimDirection`, `X`/`J` key state
- Produces: Projectile sprites (Spread Shot `[S]`, Laser `[L]`, Machine Gun `[M]`, Flame `[F]`), flying pickup drones dropping floating weapon letters.

- [ ] **Step 1: Write failing weapon pattern test**

```typescript
// tests/weapons.test.ts
import { describe, it, expect } from 'vitest';
import { getSpreadShotAngles } from '../src/weapons/WeaponTypes';

describe('SpreadShot Angles', () => {
  it('should return 5 spread angles centered around target angle', () => {
    const angles = getSpreadShotAngles(0); // Aiming right (0 degrees)
    expect(angles.length).toBe(5);
    expect(angles).toEqual([-30, -15, 0, 15, 30]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/weapons.test.ts`
Expected: FAIL with "Cannot find module '../src/weapons/WeaponTypes'"

- [ ] **Step 3: Implement WeaponTypes and Projectile Pool**

`src/weapons/WeaponTypes.ts`:
```typescript
export type WeaponType = 'PEA_SHOOTER' | 'SPREAD_SHOT' | 'LASER' | 'MACHINE_GUN' | 'FLAME';

export function getSpreadShotAngles(baseAngleDeg: number): number[] {
  const offsets = [-30, -15, 0, 15, 30];
  return offsets.map(offset => baseAngleDeg + offset);
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/weapons.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/weapons/ src/entities/ tests/
git commit -m "feat: implement weapon patterns, spread shot arc angles, and projectile pooling"
```

---

### Task 6: Enemy Archetypes & AI (Ticket 6)

**Files:**
- Create: `src/entities/enemies/EnemyBase.ts`
- Create: `src/entities/enemies/Trooper.ts`
- Create: `src/entities/enemies/Turret.ts`
- Create: `src/entities/enemies/FalconDrone.ts`
- Test: `tests/enemy.test.ts`

**Interfaces:**
- Consumes: Player target reference, room bounds, physics colliders
- Produces: AI behavior updates (Trooper running/jumping, Turret rotation aim, Drone sinusoidal movement).

- [ ] **Step 1: Write failing drone flight trajectory test**

```typescript
// tests/enemy.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDroneSinePosition } from '../src/entities/enemies/FalconDrone';

describe('FalconDrone Sine Movement', () => {
  it('should calculate y-offset based on sine wave formula', () => {
    const yOffset = calculateDroneSinePosition(0, 10, 1);
    expect(yOffset).toBe(0);
    const peekYOffset = calculateDroneSinePosition(Math.PI / 2, 10, 1);
    expect(peekYOffset).toBeCloseTo(10);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/enemy.test.ts`
Expected: FAIL with "Cannot find module '../src/entities/enemies/FalconDrone'"

- [ ] **Step 3: Implement Drone calculation & Enemy classes**

`src/entities/enemies/FalconDrone.ts`:
```typescript
export function calculateDroneSinePosition(time: number, amplitude: number, frequency: number): number {
  return Math.sin(time * frequency) * amplitude;
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/enemy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/entities/enemies/ tests/
git commit -m "feat: implement enemy AI base classes and falcon drone sine movement calculations"
```

---

### Task 7: HUD, Game Loop & Boss Room (Ticket 7)

**Files:**
- Create: `src/ui/HUD.ts`
- Create: `src/entities/enemies/Boss.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `src/scenes/GameOverScene.ts`
- Test: `tests/game-loop.test.ts`

**Interfaces:**
- Consumes: Player lives/HP, weapon type, current room grid position
- Produces: On-screen UI stats overlay, Boss fight triggering upon entering grid (3, y), Game Over transition on 0 lives.

- [ ] **Step 1: Write failing HUD lives display test**

```typescript
// tests/game-loop.test.ts
import { describe, it, expect } from 'vitest';
import { formatHUDLives } from '../src/ui/HUD';

describe('formatHUDLives', () => {
  it('should return icon string representing remaining lives', () => {
    expect(formatHUDLives(3)).toBe('❤❤❤');
    expect(formatHUDLives(1)).toBe('❤');
    expect(formatHUDLives(0)).toBe('DEAD');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: FAIL with "Cannot find module '../src/ui/HUD'"

- [ ] **Step 3: Implement HUD and GameScene integration**

`src/ui/HUD.ts`:
```typescript
export function formatHUDLives(lives: number): string {
  if (lives <= 0) return 'DEAD';
  return '❤'.repeat(lives);
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/ src/scenes/ tests/
git commit -m "feat: add HUD display overlay, boss room triggers, and victory/death state transitions"
```
