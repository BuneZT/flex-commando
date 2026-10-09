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

  it('should configure scale manager with game-container, FIT mode, and CENTER_BOTH', () => {
    expect(GameConfig.parent).toBe('game-container');
    expect(GameConfig.scale).toBeDefined();
    expect(GameConfig.scale?.mode).toBe(Phaser.Scale.FIT);
    expect(GameConfig.scale?.autoCenter).toBe(Phaser.Scale.CENTER_BOTH);
  });

  it('should configure fps settings with target 60 and limit 60', () => {
    expect(GameConfig.fps).toBeDefined();
    expect(GameConfig.fps?.target).toBe(60);
    expect(GameConfig.fps?.limit).toBe(60);
    expect(GameConfig.fps?.smoothStep).toBe(true);
  });
});

describe('index.html layout and container styling', () => {
  it('should not apply flexbox centering to game-container or body to avoid conflicting with Phaser autoCenter', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');

    // Confirm game-container exists
    expect(html).toContain('id="game-container"');

    // body must not use flex centering
    const bodyMatch = html.match(/(?:html,\s*)?body\s*\{([^}]+)\}/);
    expect(bodyMatch).not.toBeNull();
    const bodyCss = bodyMatch![1];
    expect(bodyCss).not.toMatch(/display\s*:\s*flex/);

    // #game-container must not use flex centering which shifts Phaser autoCenter margins
    const containerMatch = html.match(/#game-container\s*\{([^}]+)\}/);
    expect(containerMatch).not.toBeNull();
    const containerCss = containerMatch![1];
    expect(containerCss).not.toMatch(/display\s*:\s*flex/);
    expect(containerCss).not.toMatch(/justify-content\s*:\s*center/);

    // canvas should have display: block to prevent inline whitespace issues
    const canvasMatch = html.match(/canvas\s*\{([^}]+)\}/);
    expect(canvasMatch).not.toBeNull();
    const canvasCss = canvasMatch![1];
    expect(canvasCss).toMatch(/display\s*:\s*block/);
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


