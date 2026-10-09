import { describe, it, expect, vi } from 'vitest';
import { BootScene } from '../src/scenes/BootScene';
import { MainMenuScene } from '../src/scenes/MainMenuScene';
import { GameOverScene } from '../src/scenes/GameOverScene';
import { TextureFactory } from '../src/core/TextureFactory';

describe('Menu Scenes', () => {
  it('BootScene preloads assets and ensures all required textures exist before launching MainMenu', () => {
    const boot = new BootScene();
    expect(boot.sys.settings.key).toBe('BootScene');

    const loadedImages: Record<string, string> = {};
    const loadedSpritesheets: Record<string, { path: string; config: any }> = {};
    (boot as any).load = {
      image: (key: string, path: string) => {
        loadedImages[key] = path;
      },
      spritesheet: (key: string, path: string, config: any) => {
        loadedSpritesheets[key] = { path, config };
      },
    };

    boot.preload();

    expect(loadedImages['logo']).toBe('assets/ui/logo.png');
    expect(loadedImages['cyber_hangar_bg']).toBe('assets/bg/cyber_hangar_bg.png');
    expect(loadedImages['tex_crosshair']).toBe('assets/vfx/crosshair.png');

    expect(loadedSpritesheets['tileset']).toBeDefined();
    expect(loadedSpritesheets['tileset'].config).toEqual({ frameWidth: 16, frameHeight: 16 });
    expect(loadedSpritesheets['tex_player']).toBeDefined();
    expect(loadedSpritesheets['tex_player'].config).toEqual({ frameWidth: 24, frameHeight: 24 });
    expect(loadedSpritesheets['tex_enemy_trooper']).toBeDefined();
    expect(loadedSpritesheets['tex_enemy_trooper'].config).toEqual({ frameWidth: 24, frameHeight: 24 });
    expect(loadedSpritesheets['tex_enemy_turret']).toBeDefined();
    expect(loadedSpritesheets['tex_enemy_turret'].config).toEqual({ frameWidth: 32, frameHeight: 24 });
    expect(loadedSpritesheets['tex_enemy_drone']).toBeDefined();
    expect(loadedSpritesheets['tex_enemy_drone'].config).toEqual({ frameWidth: 32, frameHeight: 20 });
    expect(loadedSpritesheets['tex_enemy_jumper']).toBeDefined();
    expect(loadedSpritesheets['tex_enemy_jumper'].config).toEqual({ frameWidth: 24, frameHeight: 28 });
    expect(loadedSpritesheets['tex_enemy_boss']).toBeDefined();
    expect(loadedSpritesheets['tex_enemy_boss'].config).toEqual({ frameWidth: 64, frameHeight: 64 });
    expect(loadedSpritesheets['tex_projectiles']).toBeDefined();
    expect(loadedSpritesheets['tex_projectiles'].config).toEqual({ frameWidth: 16, frameHeight: 16 });
    expect(loadedSpritesheets['tex_pickups']).toBeDefined();
    expect(loadedSpritesheets['tex_pickups'].config).toEqual({ frameWidth: 16, frameHeight: 16 });

    const startSpy = vi.fn();
    (boot as any).scene = { start: startSpy };
    const generateSpy = vi.spyOn(TextureFactory, 'generateAllTextures').mockImplementation(() => {});

    boot.create();

    expect(generateSpy).toHaveBeenCalledWith(boot);
    expect(startSpy).toHaveBeenCalledWith('MainMenuScene');
    generateSpy.mockRestore();
  });

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
