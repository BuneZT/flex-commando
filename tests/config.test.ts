import { describe, it, expect } from 'vitest';
import { GameConfig } from '../src/config/GameConfig';

describe('GameConfig', () => {
  it('should define 320x240 pixel art arcade settings', () => {
    expect(GameConfig.width).toBe(320);
    expect(GameConfig.height).toBe(240);
    expect(GameConfig.pixelArt).toBe(true);
  });

  it('should lock frame rate to 60 FPS with smoothStep enabled', () => {
    expect(GameConfig.fps).toBeDefined();
    expect(GameConfig.fps?.target).toBe(60);
    expect(GameConfig.fps?.smoothStep).toBe(true);
  });
});

