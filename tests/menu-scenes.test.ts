import { describe, it, expect, vi } from 'vitest';
import { MainMenuScene } from '../src/scenes/MainMenuScene';
import { GameOverScene } from '../src/scenes/GameOverScene';

describe('Menu Scenes', () => {
  it('should instantiate MainMenuScene and GameOverScene correctly', () => {
    const mainMenu = new MainMenuScene();
    const gameOver = new GameOverScene();
    expect(mainMenu.sys.settings.key).toBe('MainMenuScene');
    expect(gameOver.sys.settings.key).toBe('GameOverScene');
  });

  it('MainMenuScene create() registers key listeners that start GameScene with correct payload', () => {
    const mainMenu = new MainMenuScene();
    const listeners: Record<string, Function> = {};
    
    (mainMenu as any).cameras = { main: { width: 320, height: 240 } };
    (mainMenu as any).add = {
      text: () => ({ setOrigin: () => {} })
    };
    (mainMenu as any).input = {
      keyboard: {
        once: (event: string, callback: Function) => {
          listeners[event] = callback;
        },
        on: (event: string, callback: Function) => {
          listeners[event] = callback;
        }
      }
    };
    const startSpy = vi.fn();
    (mainMenu as any).scene = { start: startSpy };

    mainMenu.create();

    expect(listeners['keydown-SPACE']).toBeDefined();
    expect(listeners['keydown-I']).toBeDefined();

    listeners['keydown-SPACE']();
    expect(startSpy).toHaveBeenCalledWith('GameScene', { infiniteLives: false });

    listeners['keydown-I']();
    expect(startSpy).toHaveBeenCalledWith('GameScene', { infiniteLives: true });
  });

  it('GameOverScene create() registers key listeners that start GameScene with correct payload', () => {
    const gameOver = new GameOverScene();
    const listeners: Record<string, Function> = {};
    
    (gameOver as any).cameras = { main: { width: 320, height: 240 } };
    (gameOver as any).add = {
      text: () => ({ setOrigin: () => {} })
    };
    (gameOver as any).input = {
      keyboard: {
        once: (event: string, callback: Function) => {
          listeners[event] = callback;
        },
        on: (event: string, callback: Function) => {
          listeners[event] = callback;
        }
      }
    };
    const startSpy = vi.fn();
    (gameOver as any).scene = { start: startSpy };

    gameOver.create();

    expect(listeners['keydown-SPACE']).toBeDefined();
    expect(listeners['keydown-I']).toBeDefined();

    listeners['keydown-SPACE']();
    expect(startSpy).toHaveBeenCalledWith('GameScene', { infiniteLives: false });

    listeners['keydown-I']();
    expect(startSpy).toHaveBeenCalledWith('GameScene', { infiniteLives: true });
  });
});
