# High Score System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an arcade high score system in `flex-commando` that awards points for enemy kills and weapon power-up collections, updates high scores in browser `localStorage` upon victory, displays real-time score on the HUD, and displays high score records on Main Menu and Game Over screens.

**Architecture:** Pure, decoupled `ScoreManager` utility module handles `localStorage` reading, writing, zero-padding formatting, and error handling with zero Phaser dependencies. `GameScene` aggregates score on combat kills and item pickups, feeding `HUD` (cached against unnecessary GC string allocations) and evaluating persistence strictly upon victory. `MainMenuScene` and `GameOverScene` render high score statistics using retro typography.

**Tech Stack:** TypeScript (strictly typed, `noEmit: true`), Phaser 3.90+ with Arcade Physics, Vitest (`happy-dom`), Browser `localStorage`.

## Global Constraints

- **Strict Decoupled Architecture:** Keep `ScoreManager` pure with optional `storage?: Storage` dependency injection so it runs headlessly in Vitest without mocking Phaser.
- **Zero GC During Gameplay:** `HUD.ts` must cache `lastScore` to avoid unnecessary text generation and GC allocations on 60 FPS update loops.
- **Victory-Only High Score Persistence:** High scores are written to `localStorage` strictly when the player enters the unlocked Exit Portal after destroying the boss (`triggerVictory()`). Permadeath Game Over passes run score to `GameOverScene` but does NOT overwrite the saved record.
- **Storage Resilience:** `localStorage` calls must be wrapped in `try/catch` and sanitize non-finite / corrupted data to `0`.
- **Power-up Points:** Weapon badges collected from flying capsules award exactly 500 points (`POWERUP_SCORE_VALUE = 500`).

---

### Task 1: Create `ScoreManager` with Pure Storage & Formatting Logic

**Files:**
- Create: `src/core/ScoreManager.ts`
- Test: `tests/score-manager.test.ts`

**Interfaces:**
- Produces:
  - `HIGH_SCORE_STORAGE_KEY: 'flex_commando_high_score'`
  - `POWERUP_SCORE_VALUE: 500`
  - `SaveScoreResult: { isNewRecord: boolean; highScore: number }`
  - `ScoreManager.getHighScore(storage?: Storage): number`
  - `ScoreManager.saveHighScore(score: number, storage?: Storage): SaveScoreResult`
  - `ScoreManager.formatScore(score: number, digits?: number): string`

- [ ] **Step 1: Write the failing tests for `ScoreManager`**

```typescript
// tests/score-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScoreManager,
  HIGH_SCORE_STORAGE_KEY,
  POWERUP_SCORE_VALUE,
} from '../src/core/ScoreManager';

describe('ScoreManager', () => {
  let mockStore: Record<string, string>;
  let mockStorage: Storage;

  beforeEach(() => {
    mockStore = {};
    mockStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStore[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
      key: (i: number) => Object.keys(mockStore)[i] ?? null,
      length: 0,
    };
  });

  it('POWERUP_SCORE_VALUE is 500 and storage key matches', () => {
    expect(POWERUP_SCORE_VALUE).toBe(500);
    expect(HIGH_SCORE_STORAGE_KEY).toBe('flex_commando_high_score');
  });

  describe('getHighScore', () => {
    it('returns 0 when storage is empty or key not set', () => {
      expect(ScoreManager.getHighScore(mockStorage)).toBe(0);
    });

    it('returns parsed integer when valid positive integer stored', () => {
      mockStore[HIGH_SCORE_STORAGE_KEY] = '3500';
      expect(ScoreManager.getHighScore(mockStorage)).toBe(3500);
    });

    it('returns 0 for corrupted or negative values', () => {
      mockStore[HIGH_SCORE_STORAGE_KEY] = 'not_a_number';
      expect(ScoreManager.getHighScore(mockStorage)).toBe(0);

      mockStore[HIGH_SCORE_STORAGE_KEY] = '-100';
      expect(ScoreManager.getHighScore(mockStorage)).toBe(0);
    });

    it('handles thrown storage exceptions gracefully', () => {
      const throwingStorage = {
        getItem: () => {
          throw new Error('SecurityError: Access Denied');
        },
      } as unknown as Storage;
      expect(ScoreManager.getHighScore(throwingStorage)).toBe(0);
    });
  });

  describe('saveHighScore', () => {
    it('saves and returns isNewRecord true when score strictly exceeds current high score', () => {
      mockStore[HIGH_SCORE_STORAGE_KEY] = '2000';
      const result = ScoreManager.saveHighScore(3500, mockStorage);
      expect(result).toEqual({ isNewRecord: true, highScore: 3500 });
      expect(mockStore[HIGH_SCORE_STORAGE_KEY]).toBe('3500');
    });

    it('does not save and returns isNewRecord false when score is less than or equal to high score', () => {
      mockStore[HIGH_SCORE_STORAGE_KEY] = '5000';
      const lowerResult = ScoreManager.saveHighScore(3000, mockStorage);
      expect(lowerResult).toEqual({ isNewRecord: false, highScore: 5000 });
      expect(mockStore[HIGH_SCORE_STORAGE_KEY]).toBe('5000');

      const equalResult = ScoreManager.saveHighScore(5000, mockStorage);
      expect(equalResult).toEqual({ isNewRecord: false, highScore: 5000 });
      expect(mockStore[HIGH_SCORE_STORAGE_KEY]).toBe('5000');
    });

    it('handles storage setItem exceptions gracefully', () => {
      const throwingStorage = {
        getItem: () => '1000',
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      } as unknown as Storage;

      const result = ScoreManager.saveHighScore(2500, throwingStorage);
      expect(result).toEqual({ isNewRecord: true, highScore: 2500 });
    });
  });

  describe('formatScore', () => {
    it('formats score with leading zeroes to 6 digits by default', () => {
      expect(ScoreManager.formatScore(0)).toBe('000000');
      expect(ScoreManager.formatScore(500)).toBe('000500');
      expect(ScoreManager.formatScore(12500)).toBe('012500');
    });

    it('scales beyond 6 digits without truncating', () => {
      expect(ScoreManager.formatScore(1234567)).toBe('1234567');
    });

    it('sanitizes negative numbers or NaN', () => {
      expect(ScoreManager.formatScore(-50)).toBe('000000');
      expect(ScoreManager.formatScore(NaN)).toBe('000000');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/score-manager.test.ts`
Expected: FAIL ("Cannot find module '../src/core/ScoreManager'")

- [ ] **Step 3: Implement `src/core/ScoreManager.ts`**

```typescript
export const HIGH_SCORE_STORAGE_KEY = 'flex_commando_high_score';
export const POWERUP_SCORE_VALUE = 500;

export interface SaveScoreResult {
  isNewRecord: boolean;
  highScore: number;
}

export class ScoreManager {
  public static getHighScore(storage?: Storage): number {
    try {
      const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
      if (!store) return 0;
      const raw = store.getItem(HIGH_SCORE_STORAGE_KEY);
      if (raw === null || raw === undefined) return 0;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  public static saveHighScore(score: number, storage?: Storage): SaveScoreResult {
    const validScore = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
    const currentHigh = ScoreManager.getHighScore(storage);

    if (validScore > currentHigh) {
      try {
        const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
        if (store) {
          store.setItem(HIGH_SCORE_STORAGE_KEY, validScore.toString());
        }
        return { isNewRecord: true, highScore: validScore };
      } catch {
        return { isNewRecord: true, highScore: validScore };
      }
    }

    return { isNewRecord: false, highScore: currentHigh };
  }

  public static formatScore(score: number, digits: number = 6): string {
    const safe = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
    return safe.toString().padStart(digits, '0');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/score-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/ScoreManager.ts tests/score-manager.test.ts
git commit -m "feat(score): add ScoreManager with localStorage persistence and formatting"
```

---

### Task 2: Integrate Score Display into `HUD` with Zero-GC Caching

**Files:**
- Modify: `src/ui/HUD.ts`
- Modify: `tests/hud.test.ts`

**Interfaces:**
- Consumes:
  - `ScoreManager.formatScore`
- Produces:
  - `HUD.scoreText: Phaser.GameObjects.Text`
  - `HUD.update(player, grid, currentGridX, currentGridY, boss?, infiniteLives?, score?: number): void`

- [ ] **Step 1: Write test for HUD score rendering and caching in `tests/hud.test.ts`**

Add unit tests in `tests/hud.test.ts` verifying:
1. `scoreText` is initialized at `x: 8, y: 32` with text `'SCORE: 000000'`.
2. `hud.update(..., score)` updates `scoreText` to `'SCORE: 000500'`.
3. Calling `hud.update` repeatedly with the same score does NOT invoke `scoreText.setText` again (caching test).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hud.test.ts`
Expected: FAIL (HUD.update does not receive/render score)

- [ ] **Step 3: Update `src/ui/HUD.ts`**

1. Import `ScoreManager` from `'../core/ScoreManager'`.
2. Add `private scoreText: Phaser.GameObjects.Text;` and `private lastScore: number = -1;`.
3. In `constructor(scene: Phaser.Scene)`:
   ```typescript
   this.scoreText = this.scene.add.text(
     8,
     32,
     `SCORE: ${ScoreManager.formatScore(0)}`,
     createRetroTextStyle({
       fontSize: '9px',
       color: '#ffcc00',
       strokeThickness: 2,
     })
   ).setScrollFactor(0).setDepth(100);
   ```
4. Update `public update(...)` signature:
   ```typescript
   public update(
     player: Player,
     grid: GridCell[][],
     currentGridX: number,
     currentGridY: number,
     boss?: Boss | null,
     infiniteLives?: boolean,
     score: number = 0
   ): void
   ```
5. Inside `update`:
   ```typescript
   // 5. Update Score
   if (score !== this.lastScore) {
     this.scoreText.setText(`SCORE: ${ScoreManager.formatScore(score)}`);
     this.lastScore = score;
   }
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hud.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/HUD.ts tests/hud.test.ts
git commit -m "feat(hud): add cached score text display to in-game HUD"
```

---

### Task 3: Integrate Score Accumulation & Victory Persistence into `GameScene`

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/game-loop.test.ts`

**Interfaces:**
- Consumes:
  - `ScoreManager.saveHighScore`
  - `ScoreManager.getHighScore`
  - `POWERUP_SCORE_VALUE`
- Produces:
  - `GameScene.score: number`
  - `GameOverData: { victory?: boolean; score?: number; highScore?: number; isNewHighScore?: boolean }`

- [ ] **Step 1: Write integration tests in `tests/game-loop.test.ts`**

Add tests to `tests/game-loop.test.ts`:
1. Enemy kill adds `enemy.scoreValue` to `gameScene.score`.
2. Collecting `PickupItem` adds `500` (`POWERUP_SCORE_VALUE`) to `gameScene.score`.
3. `triggerVictory()` calls `ScoreManager.saveHighScore` and launches `'GameOverScene'` with `{ victory: true, score, highScore, isNewHighScore }`.
4. Permadeath (`player.lives <= 0`) launches `'GameOverScene'` with `{ victory: false, score, highScore, isNewHighScore: false }` and does NOT call `ScoreManager.saveHighScore`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `src/scenes/GameScene.ts`**

1. Import `ScoreManager` and `POWERUP_SCORE_VALUE` from `'../core/ScoreManager'`.
2. Add `public score: number = 0;` on `GameScene`.
3. In `create()`: reset `this.score = 0;`.
4. In `update()` around line 418:
   ```typescript
   this.hud.update(this.player, this.grid, currentGridX, currentGridY, this.boss, this.infiniteLives, this.score);
   ```
5. In bullet vs enemy collision (around line 559):
   ```typescript
   if (killed) {
     this.score += enemy.scoreValue;
     if (enemy === this.boss) {
       this.unlockExitPortal();
     }
   }
   ```
6. In player vs pickup item collision (around line 623):
   ```typescript
   const weapon = item.collect();
   this.player.equipWeapon(weapon);
   this.score += POWERUP_SCORE_VALUE;
   ```
7. In `triggerVictory()`:
   ```typescript
   const result = ScoreManager.saveHighScore(this.score);
   const payload = {
     victory: true,
     score: this.score,
     highScore: result.highScore,
     isNewHighScore: result.isNewRecord,
   };
   if (this.time && typeof this.time.delayedCall === 'function') {
     this.time.delayedCall(500, () => {
       this.scene.start('GameOverScene', payload);
     });
   } else {
     this.scene.start('GameOverScene', payload);
   }
   ```
8. In `handlePlayerDamage()` when `this.player.lives <= 0`:
   ```typescript
   const currentHigh = ScoreManager.getHighScore();
   this.scene.start('GameOverScene', {
     victory: false,
     score: this.score,
     highScore: currentHigh,
     isNewHighScore: false,
   });
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts tests/game-loop.test.ts
git commit -m "feat(gameplay): accumulate combat and pickup score and evaluate victory high score"
```

---

### Task 4: Integrate High Score into `MainMenuScene` & `GameOverScene`

**Files:**
- Modify: `src/scenes/GameOverScene.ts`
- Modify: `src/scenes/MainMenuScene.ts`
- Modify: `tests/menu-scenes.test.ts`

**Interfaces:**
- Consumes:
  - `ScoreManager.getHighScore`
  - `ScoreManager.formatScore`
  - `GameOverData`

- [ ] **Step 1: Write menu tests in `tests/menu-scenes.test.ts`**

1. `MainMenuScene` renders `HIGH SCORE: 000000` text.
2. `GameOverScene` renders `FINAL SCORE: <formattedScore>` and `HIGH SCORE: <formattedHighScore>`.
3. When `isNewHighScore` is true on victory, `GameOverScene` renders `★ NEW HIGH SCORE! ★`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/menu-scenes.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `src/scenes/MainMenuScene.ts`**

1. Import `ScoreManager` from `'../core/ScoreManager'`.
2. In `create()`:
   ```typescript
   const highScore = ScoreManager.getHighScore();
   this.add.text(
     Math.round(width / 2),
     Math.round(height / 2 - 14),
     `HIGH SCORE: ${ScoreManager.formatScore(highScore)}`,
     createRetroTextStyle({
       fontSize: '10px',
       color: '#ffcc00',
       strokeThickness: 2,
     })
   ).setOrigin(0.5);
   ```

- [ ] **Step 4: Update `src/scenes/GameOverScene.ts`**

1. Extend `GameOverData`:
   ```typescript
   export interface GameOverData {
     victory?: boolean;
     score?: number;
     highScore?: number;
     isNewHighScore?: boolean;
   }
   ```
2. In `GameOverScene` properties:
   ```typescript
   private score: number = 0;
   private highScore: number = 0;
   private isNewHighScore: boolean = false;
   ```
3. In `init(data?: GameOverData)`:
   ```typescript
   this.victory = data?.victory || false;
   this.score = data?.score || 0;
   this.highScore = data?.highScore ?? ScoreManager.getHighScore();
   this.isNewHighScore = data?.isNewHighScore || false;
   ```
4. In `create()`:
   Render score stats below subtitle:
   ```typescript
   if (this.isNewHighScore && this.victory) {
     this.add.text(
       Math.round(width / 2),
       Math.round(height / 2 + 6),
       '★ NEW HIGH SCORE! ★',
       createRetroTextStyle({
         fontSize: '11px',
         color: '#00ffff',
         strokeThickness: 2,
       })
     ).setOrigin(0.5);
   }

   this.add.text(
     Math.round(width / 2),
     Math.round(height / 2 + (this.isNewHighScore && this.victory ? 22 : 10)),
     `SCORE: ${ScoreManager.formatScore(this.score)}  HIGH: ${ScoreManager.formatScore(this.highScore)}`,
     createRetroTextStyle({
       fontSize: '10px',
       color: '#ffcc00',
       strokeThickness: 2,
     })
   ).setOrigin(0.5);
   ```
   Adjust position of `PRESS SPACE TO RESTART` to `Math.round(height / 2 + 38)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/menu-scenes.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameOverScene.ts src/scenes/MainMenuScene.ts tests/menu-scenes.test.ts
git commit -m "feat(ui): display high score on main menu and score statistics on game over screen"
```

---

### Task 5: Documentation Update & End-to-End Suite Verification

**Files:**
- Modify: `docs/GAME_MANUAL.md`

- [ ] **Step 1: Update `docs/GAME_MANUAL.md`**
Add a dedicated scoring subsection detailing:
- Enemy kill score table (Trooper: 100, Turret: 200, Drone: 150, Jumper: 150, Boss: 5000)
- Curated Weapon Badge pickup score (500 pts)
- LocalStorage persistence key (`flex_commando_high_score`)
- Victory requirement for high score recording

- [ ] **Step 2: Run full test suite and TypeScript type check**

Run: `npx vitest run`
Expected: 23 passed files, 0 failures.

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add docs/GAME_MANUAL.md
git commit -m "docs: document scoring system and high score persistence in game manual"
```
