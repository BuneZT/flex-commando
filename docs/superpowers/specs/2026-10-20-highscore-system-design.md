# High Score System Design Spec

**Date:** 2026-10-20  
**Status:** Approved  
**Topic:** Arcade scoring, high score persistence in browser `localStorage`, HUD score display, and end-of-game victory evaluation.

---

## 1. Overview & Objectives

In `flex-commando`, players engage in fast-paced arcade combat against cybernetic troopers, turrets, aerial drones, jumper mercenaries, and a 2-phase level boss, while discovering rare weapon power-ups across a 4x4 matrix grid. Currently, enemies have defined `scoreValue` properties and `GameOverData` has an optional `score?: number` field, but score is not tracked during gameplay, power-up collections do not reward points, and high scores are not preserved.

This specification defines a complete, arcade-style high score system:
1. **Real-time Combat & Pickup Scoring:**
   - Enemy kills award points matching their established values: Trooper (100 pts), Falcon Drone (150 pts), Jumper Mercenary (150 pts), Wall Turret (200 pts), and Boss Mech (5000 pts).
   - Collecting a curated weapon power-up badge awards **500 points** (rewarding exploration without eclipsing combat).
2. **Strict Victory-Only High Score Persistence:**
   - Persistent high scores are saved to browser `localStorage` under the key `'flex_commando_high_score'` **only upon achieving victory** (defeating the Boss and stepping through the unlocked Exit Portal).
   - Runs ending in death (Game Over) display the player's run score and the existing high score, but do **not** record a new high score.
   - Dev runs with Infinite Lives (`PRESS I`) are permitted to save high scores.
3. **Full Arcade Display Integration:**
   - **In-Game HUD:** Displays `SCORE: 000000` at `(8, 32)` below weapon and lives indicators, cached to avoid runtime string allocations.
   - **Main Menu Screen:** Displays all-time `HIGH SCORE: 000000` beneath the logo.
   - **Game Over & Victory Screen:** Displays `FINAL SCORE: <score>` and `HIGH SCORE: <score>`, with an accented `★ NEW HIGH SCORE! ★` celebration when a new record is achieved on victory.
4. **Zero-GC & Decoupled Architecture (`AGENTS.md`):**
   - High score storage logic is isolated in a pure, headless-compatible `ScoreManager` utility.
   - Resilient against `localStorage` being disabled, quota errors, or headless testing environments.

---

## 2. Architecture & Data Model

### 2.1 Decoupled `ScoreManager` (`src/core/ScoreManager.ts`)

A standalone module with zero Phaser dependencies, allowing 100% test coverage in Vitest without mocking canvas or DOM hierarchies.

```typescript
export const HIGH_SCORE_STORAGE_KEY = 'flex_commando_high_score';
export const POWERUP_SCORE_VALUE = 500;

export interface SaveScoreResult {
  isNewRecord: boolean;
  highScore: number;
}

export class ScoreManager {
  /**
   * Safely retrieves the current high score from localStorage.
   * Returns 0 if storage is unavailable, empty, or unparseable.
   */
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

  /**
   * Evaluates and conditionally persists a new high score.
   * Returns whether a new high score was set and the current high score value.
   */
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
        // Storage disabled or quota exceeded
        return { isNewRecord: true, highScore: validScore };
      }
    }

    return { isNewRecord: false, highScore: currentHigh };
  }

  /**
   * Formats a numeric score with leading zeroes (default: 6 digits, e.g. 000500).
   */
  public static formatScore(score: number, digits: number = 6): string {
    const safe = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
    return safe.toString().padStart(digits, '0');
  }
}
```

---

## 3. Gameplay & Scene Integration

### 3.1 `GameScene` Scoring Logic
* **State:** `public score: number = 0;` reset to `0` in `create()`.
* **Enemy Kill:** In bullet-versus-enemy collision loop, when `killed === true`:
  ```typescript
  this.score += enemy.scoreValue;
  ```
* **Power-up Collection:** In player-versus-pickup item collision loop, when item is collected:
  ```typescript
  this.score += POWERUP_SCORE_VALUE; // 500 points
  ```
* **HUD Feed:** Passed into `this.hud.update(...)` every frame.
* **Victory Handling (`triggerVictory()`):**
  ```typescript
  const result = ScoreManager.saveHighScore(this.score);
  this.scene.start('GameOverScene', {
    victory: true,
    score: this.score,
    highScore: result.highScore,
    isNewHighScore: result.isNewRecord,
  });
  ```
* **Death Handling (`handlePlayerDamage()` when lives reach 0):**
  ```typescript
  const currentHigh = ScoreManager.getHighScore();
  this.scene.start('GameOverScene', {
    victory: false,
    score: this.score,
    highScore: currentHigh,
    isNewHighScore: false,
  });
  ```

### 3.2 In-Game `HUD` (`src/ui/HUD.ts`)
* Add `scoreText: Phaser.GameObjects.Text;`
* Positioned at `(8, 32)` with `#ffcc00` retro styling (`fontSize: '9px'`).
* **Zero-GC Guard:** Tracks `private lastScore: number = -1;`. Only executes `.setText()` if `score !== this.lastScore`.

### 3.3 `MainMenuScene` (`src/scenes/MainMenuScene.ts`)
* Retrieves `highScore = ScoreManager.getHighScore()`.
* Renders `HIGH SCORE: <formattedScore>` at `(width / 2, height / 2 - 12)` in `#ffcc00` (retro 10px font).

### 3.4 `GameOverScene` (`src/scenes/GameOverScene.ts`)
* Accepts extended `GameOverData`:
  ```typescript
  export interface GameOverData {
    victory?: boolean;
    score?: number;
    highScore?: number;
    isNewHighScore?: boolean;
  }
  ```
* Displays:
  * Title: `VICTORY!` (`#00ff66`) or `GAME OVER` (`#ff2222`)
  * Subtitle: `MISSION ACCOMPLISHED` or `YOU DIED`
  * If `isNewHighScore`: `★ NEW HIGH SCORE! ★` in `#00ffff`
  * Score lines:
    * `FINAL SCORE: <score>` in `#ffffff`
    * `HIGH SCORE: <highScore>` in `#ffcc00`
  * Action prompts: `PRESS SPACE TO RESTART`

---

## 4. Error Handling & Edge Cases

1. **LocalStorage Blocked / Private Browsing:** `ScoreManager.getHighScore` and `saveHighScore` wrap storage access in `try / catch` and fall back to in-memory evaluation without crashing the game.
2. **Corrupted or Malformed Storage Data:** If storage contains negative numbers, non-numeric strings, or JSON, `parseInt` with `Number.isFinite(parsed) && parsed > 0` sanitizes it to `0`.
3. **Headless Vitest Environment:** Vitest / happy-dom runs without a full browser storage backend. Injectable optional `storage?: Storage` parameter enables clean mock injection in unit tests.
4. **Score Overflow:** Scores cleanly scale beyond 6 digits without truncating (e.g. `1250000`).

---

## 5. Verification & Testing Strategy

1. **`tests/score-manager.test.ts` (Unit Tests):**
   - Verify `getHighScore()` defaults to 0 on empty, null, or corrupted storage.
   - Verify `saveHighScore()` persists only when score is strictly greater than existing high score.
   - Verify `formatScore()` zero-pads numbers accurately.
   - Verify resilience against thrown storage exceptions.
2. **`tests/hud.test.ts` (HUD Tests):**
   - Verify `HUD` renders `SCORE: 000000` text element.
   - Verify `scoreText.setText` is only called when score changes.
3. **`tests/game-loop.test.ts` (Game Loop Integration):**
   - Verify enemy death increases player score by `enemy.scoreValue`.
   - Verify weapon pickup increases player score by `POWERUP_SCORE_VALUE` (500).
   - Verify victory calls `ScoreManager.saveHighScore`.
   - Verify player death passes score without saving high score.
4. **`tests/menu-scenes.test.ts` (Menu Scenes Integration):**
   - Verify `MainMenuScene` renders persistent high score.
   - Verify `GameOverScene` renders final score, high score, and `NEW HIGH SCORE` callout when earned on victory.
5. **Full Suite & Type Check:**
   - Run `npx vitest run` to ensure all 22+ test files pass.
   - Run `npx tsc --noEmit` to verify strict TypeScript adherence.
