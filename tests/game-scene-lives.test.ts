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
