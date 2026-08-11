import { describe, it, expect } from 'vitest';
import { isDevEnvironment } from '../src/config/Environment';

describe('Environment utility', () => {
  it('should return boolean for isDevEnvironment', () => {
    const isDev = isDevEnvironment();
    expect(typeof isDev).toBe('boolean');
  });
});
