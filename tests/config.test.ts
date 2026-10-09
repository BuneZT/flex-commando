import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { GameConfig } from '../src/config/GameConfig';
import { Controls } from '../src/config/Controls';

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

describe('Controls input handling', () => {
  function createMockControlsScene(keyStates: Record<number, { isDown: boolean }>) {
    const keyboard = {
      addKey: (code: number) => {
        return keyStates[code] || { isDown: false };
      },
    };
    return {
      input: {
        keyboard,
        activePointer: { isDown: false, worldX: 0, worldY: 0 },
      },
    } as unknown as Phaser.Scene;
  }

  it('should register jump when W key is pressed', () => {
    const keyStates: Record<number, { isDown: boolean }> = {
      [Phaser.Input.Keyboard.KeyCodes.W]: { isDown: true },
    };
    const scene = createMockControlsScene(keyStates);
    const controls = new Controls(scene);
    const state = controls.getInputState();
    expect(state.jump).toBe(true);
  });

  it('should register jump when Space key is pressed', () => {
    const keyStates: Record<number, { isDown: boolean }> = {
      [Phaser.Input.Keyboard.KeyCodes.SPACE]: { isDown: true },
    };
    const scene = createMockControlsScene(keyStates);
    const controls = new Controls(scene);
    const state = controls.getInputState();
    expect(state.jump).toBe(true);
  });
});


