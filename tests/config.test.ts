import { describe, it, expect } from 'vitest';
import { GameConfig } from '../src/config/GameConfig';

describe('GameConfig', () => {
  it('should define 320x240 pixel art arcade settings', () => {
    expect(GameConfig.width).toBe(320);
    expect(GameConfig.height).toBe(240);
    expect(GameConfig.pixelArt).toBe(true);
  });

  it('should enable pixelArt, roundPixels, and disable antialias in render config', () => {
    expect(GameConfig.roundPixels).toBe(true);
    expect(GameConfig.render).toBeDefined();
    expect(GameConfig.render?.pixelArt).toBe(true);
    expect(GameConfig.render?.antialias).toBe(false);
    expect(GameConfig.render?.roundPixels).toBe(true);
  });
});

