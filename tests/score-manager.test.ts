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
