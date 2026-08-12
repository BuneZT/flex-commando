import { describe, it, expect } from 'vitest';
import { GameScene } from '../src/scenes/GameScene';

describe('GameScene Level Seed Randomization', () => {
  it('should generate a random seed when no seed is provided in init()', () => {
    const scene1 = new GameScene();
    scene1.init();
    expect(typeof scene1.seed).toBe('number');
    expect(scene1.seed).toBeGreaterThanOrEqual(0);

    const scene2 = new GameScene();
    scene2.init();
    expect(typeof scene2.seed).toBe('number');
  });

  it('should use explicit seed when provided in init()', () => {
    const scene = new GameScene();
    scene.init({ seed: 42 });
    expect(scene.seed).toBe(42);
  });
});
