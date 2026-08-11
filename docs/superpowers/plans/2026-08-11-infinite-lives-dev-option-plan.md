# Infinite Lives Dev Option Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a developer-only option to start the game with Infinite Lives (via key 'I') on Main Menu and Game Over screens when running under the Vite dev server.

**Architecture:** Environment detection via `import.meta.env.DEV` enables the `PRESS I FOR INFINITE LIVES` text and key listener on `MainMenuScene` and `GameOverScene`. `GameScene` receives `infiniteLives: true` parameter, bypassing life deduction on player damage, and `HUD` displays `LIVES: ∞`.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest

## Global Constraints

- Option visible/enabled ONLY when `import.meta.env.DEV` is `true`.
- Key `I` starts/restarts game with infinite lives.
- Key `SPACE` starts/restarts game with normal lives.
- `LIVES: ∞` rendered in HUD when infinite lives is active.

---

### Task 1: Environment Detection Utility

**Files:**
- Create: `src/config/Environment.ts`
- Test: `tests/environment.test.ts`

**Interfaces:**
- Produces: `isDevEnvironment(): boolean`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/environment.test.ts
import { describe, it, expect } from 'vitest';
import { isDevEnvironment } from '../src/config/Environment';

describe('Environment utility', () => {
  it('should return boolean for isDevEnvironment', () => {
    const isDev = isDevEnvironment();
    expect(typeof isDev).toBe('boolean');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/environment.test.ts`
Expected: FAIL with module non-existent error.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/config/Environment.ts
export function isDevEnvironment(): boolean {
  return Boolean(import.meta.env?.DEV);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/environment.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/Environment.ts tests/environment.test.ts
git commit -m "feat: add isDevEnvironment utility"
```

---

### Task 2: HUD Infinite Lives Display

**Files:**
- Modify: `src/ui/HUD.ts:6-9`
- Modify: `src/ui/HUD.ts:46-55`
- Test: `tests/hud.test.ts`

**Interfaces:**
- Consumes: `formatHUDLives(lives: number, infiniteLives?: boolean)`
- Produces: Updated `formatHUDLives` returning `'∞'` when `infiniteLives` is true.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/hud.test.ts
import { describe, it, expect } from 'vitest';
import { formatHUDLives } from '../src/ui/HUD';

describe('formatHUDLives', () => {
  it('should return infinity symbol when infiniteLives is true', () => {
    expect(formatHUDLives(3, true)).toBe('∞');
    expect(formatHUDLives(0, true)).toBe('∞');
  });

  it('should return hearts string when infiniteLives is false', () => {
    expect(formatHUDLives(3, false)).toBe('❤❤❤');
    expect(formatHUDLives(0, false)).toBe('DEAD');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hud.test.ts`
Expected: FAIL due to `formatHUDLives` not accepting second parameter or returning `❤❤❤` instead of `∞`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/ui/HUD.ts
export function formatHUDLives(lives: number, infiniteLives?: boolean): string {
  if (infiniteLives) return '∞';
  if (lives <= 0) return 'DEAD';
  return '❤'.repeat(lives);
}
```

In `HUD.update`:
```typescript
  public update(
    player: Player,
    grid: GridCell[][],
    currentGridX: number,
    currentGridY: number,
    boss?: Boss | null,
    infiniteLives?: boolean
  ): void {
    // 1. Update Lives
    this.livesText.setText(`LIVES: ${formatHUDLives(player.lives, infiniteLives)}`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hud.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/HUD.ts tests/hud.test.ts
git commit -m "feat: support infinite lives in HUD display"
```

---

### Task 3: GameScene Infinite Lives State and Damage Logic

**Files:**
- Modify: `src/scenes/GameScene.ts:17-40`
- Modify: `src/scenes/GameScene.ts:172-190`
- Modify: `src/scenes/GameScene.ts:257-260`
- Test: `tests/game-scene-lives.test.ts`

**Interfaces:**
- Produces: `GameSceneInitData { infiniteLives?: boolean }`
- Consumes: `formatHUDLives` from `HUD.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/game-scene-lives.test.ts
import { describe, it, expect } from 'vitest';
import { GameScene } from '../src/scenes/GameScene';
import { Player } from '../src/entities/Player';

describe('GameScene Infinite Lives', () => {
  it('should initialize infiniteLives property from scene init data', () => {
    const scene = new GameScene();
    scene.init({ infiniteLives: true });
    expect(scene.infiniteLives).toBe(true);
  });

  it('should not decrement player lives when handlePlayerDamage is called in infinite lives mode', () => {
    const scene = new GameScene();
    scene.init({ infiniteLives: true });
    scene.player = { lives: 3, hitBarrier: () => false } as unknown as Player;
    scene.invulnerableTimer = 0;
    scene.isGameOver = false;

    scene.handlePlayerDamage();
    expect(scene.player.lives).toBe(3);
    expect(scene.isGameOver).toBe(false);
    expect(scene.invulnerableTimer).toBe(1500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game-scene-lives.test.ts`
Expected: FAIL with property or method undefined errors.

- [ ] **Step 3: Write minimal implementation**

In `src/scenes/GameScene.ts`:

```typescript
export interface GameSceneInitData {
  infiniteLives?: boolean;
}

export class GameScene extends Phaser.Scene {
  public infiniteLives: boolean = false;
  // ... existing fields

  init(data?: GameSceneInitData): void {
    this.infiniteLives = !!data?.infiniteLives;
  }
```

In `handlePlayerDamage()`:
```typescript
  public handlePlayerDamage(): void {
    if (!this.player || this.invulnerableTimer > 0 || this.isGameOver) return;

    // Check barrier shield first
    const absorbed = this.player.hitBarrier();
    if (absorbed) {
      this.invulnerableTimer = 500; // Brief invincibility when barrier hit
      return;
    }

    // Direct damage to player lives
    if (!this.infiniteLives) {
      this.player.lives -= 1;
    }
    this.invulnerableTimer = 1500; // 1.5s invulnerability frames

    if (this.player.lives <= 0) {
      this.isGameOver = true;
      this.scene.start('GameOverScene', { victory: false });
    }
  }
```

In `update()` where HUD is updated:
```typescript
    // 9. Update HUD
    if (this.hud && this.player && this.grid) {
      this.hud.update(this.player, this.grid, currentGridX, currentGridY, this.boss, this.infiniteLives);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game-scene-lives.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts tests/game-scene-lives.test.ts
git commit -m "feat: handle infinite lives in GameScene damage and HUD update"
```

---

### Task 4: MainMenuScene and GameOverScene UI & Key Bindings

**Files:**
- Modify: `src/scenes/MainMenuScene.ts:8-26`
- Modify: `src/scenes/GameOverScene.ts:19-47`
- Test: `tests/menu-scenes.test.ts`

**Interfaces:**
- Consumes: `isDevEnvironment()` from `src/config/Environment.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/menu-scenes.test.ts
import { describe, it, expect } from 'vitest';
import { MainMenuScene } from '../src/scenes/MainMenuScene';
import { GameOverScene } from '../src/scenes/GameOverScene';

describe('Menu Scenes', () => {
  it('should instantiate MainMenuScene and GameOverScene correctly', () => {
    const mainMenu = new MainMenuScene();
    const gameOver = new GameOverScene();
    expect(mainMenu.sys.settings.key).toBe('MainMenuScene');
    expect(gameOver.sys.settings.key).toBe('GameOverScene');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/menu-scenes.test.ts`
Expected: FAIL if imports or constructor fail.

- [ ] **Step 3: Write minimal implementation**

In `src/scenes/MainMenuScene.ts`:

```typescript
import Phaser from 'phaser';
import { isDevEnvironment } from '../config/Environment';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.add.text(width / 2, height / 2 - 30, 'FLEX COMMANDO: ROGUE BEEF', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, 'PRESS SPACE TO START', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffcc00'
    }).setOrigin(0.5);

    if (isDevEnvironment()) {
      this.add.text(width / 2, height / 2 + 30, 'PRESS I FOR INFINITE LIVES', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#00ffff'
      }).setOrigin(0.5);

      this.input.keyboard?.once('keydown-I', () => {
        this.scene.start('GameScene', { infiniteLives: true });
      });
    }

    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start('GameScene', { infiniteLives: false });
    });
  }
}
```

In `src/scenes/GameOverScene.ts`:

```typescript
import Phaser from 'phaser';
import { isDevEnvironment } from '../config/Environment';

export interface GameOverData {
  victory?: boolean;
  score?: number;
}

export class GameOverScene extends Phaser.Scene {
  private victory: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data?: GameOverData): void {
    this.victory = data?.victory || false;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    const titleText = this.victory ? 'VICTORY!' : 'GAME OVER';
    const titleColor = this.victory ? '#00ff66' : '#ff0000';
    const subText = this.victory ? 'MISSION ACCOMPLISHED' : 'YOU DIED';

    this.add.text(width / 2, height / 2 - 40, titleText, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: titleColor,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 10, subText, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 25, 'PRESS SPACE TO RESTART', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    if (isDevEnvironment()) {
      this.add.text(width / 2, height / 2 + 45, 'PRESS I FOR INFINITE LIVES', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#00ffff',
      }).setOrigin(0.5);

      this.input.keyboard?.once('keydown-I', () => {
        this.scene.start('GameScene', { infiniteLives: true });
      });
    }

    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start('GameScene', { infiniteLives: false });
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/menu-scenes.test.ts`
Expected: PASS

- [ ] **Step 5: Run all test suites to verify system integrity**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/MainMenuScene.ts src/scenes/GameOverScene.ts tests/menu-scenes.test.ts
git commit -m "feat: add press I for infinite lives option on main menu and game over screen"
```
