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
