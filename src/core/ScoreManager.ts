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
