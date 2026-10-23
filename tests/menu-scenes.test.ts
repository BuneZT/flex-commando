import { describe, it, expect, vi } from 'vitest';
import { BootScene } from '../src/scenes/BootScene';
import { MainMenuScene } from '../src/scenes/MainMenuScene';
import { GameOverScene } from '../src/scenes/GameOverScene';
import { AnimationFactory } from '../src/core/AnimationFactory';

describe('Menu Scenes', () => {
  it('BootScene preloads assets and ensures all required textures exist before launching MainMenu', () => {
    const boot = new BootScene();
    expect(boot.sys.settings.key).toBe('BootScene');

    const loadedImages: Record<string, string> = {};
    const loadedSpritesheets: Record<string, { path: string; config: any }> = {};
    const loadedAudio: Record<string, string[]> = {};
    (boot as any).load = {
      image: (key: string, path: string) => {
        loadedImages[key] = path;
      },
      spritesheet: (key: string, path: string, config: any) => {
        loadedSpritesheets[key] = { path, config };
      },
      audio: (key: string, paths: string[]) => {
        loadedAudio[key] = paths;
      },
    };

    boot.preload();

    expect(loadedAudio['bgm_stage']).toEqual(['assets/audio/bgm_stage.ogg', 'assets/audio/bgm_stage.mp3']);
    expect(loadedAudio['bgm_boss']).toEqual(['assets/audio/bgm_boss.ogg', 'assets/audio/bgm_boss.mp3']);
    expect(loadedAudio['sfx_shoot_pea']).toBe('assets/audio/sfx_shoot_pea.ogg');
    expect(loadedAudio['sfx_explosion']).toBe('assets/audio/sfx_explosion.ogg');
    expect(loadedAudio['sfx_pickup']).toBe('assets/audio/sfx_pickup.ogg');

    expect(loadedImages['logo']).toBe('assets/ui/logo.png');
    expect(loadedImages['retro_font']).toBe('assets/ui/retro_font.png');
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
    expect(loadedSpritesheets['tex_explosion']).toBeDefined();
    expect(loadedSpritesheets['tex_explosion'].config).toEqual({ frameWidth: 20, frameHeight: 20 });

    const startSpy = vi.fn();
    (boot as any).scene = { start: startSpy };
    const registerSpy = vi.spyOn(AnimationFactory, 'registerAnimations').mockImplementation(() => {});

    boot.create();

    expect(registerSpy).toHaveBeenCalledWith(boot);
    expect(startSpy).toHaveBeenCalledWith('MainMenuScene');
    registerSpy.mockRestore();
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

  it('renders the logo sprite in MainMenuScene when logo texture exists', () => {
    const mainMenu = new MainMenuScene();
    const originSpy = vi.fn();
    const mockImage = { x: 160, y: 75, setOrigin: originSpy };
    const imageSpy = vi.fn().mockReturnValue(mockImage);
    const textSpy = vi.fn().mockReturnValue({ setOrigin: vi.fn() });
    const tweenAddSpy = vi.fn();

    (mainMenu as any).cameras = { main: { width: 320, height: 240 } };
    (mainMenu as any).textures = {
      exists: vi.fn((key: string) => key === 'logo'),
    };
    (mainMenu as any).add = {
      image: imageSpy,
      text: textSpy,
    };
    (mainMenu as any).tweens = {
      add: tweenAddSpy,
    };
    (mainMenu as any).input = {
      keyboard: {
        once: vi.fn(),
        on: vi.fn(),
      },
    };

    mainMenu.create();

    expect(imageSpy).toHaveBeenCalledWith(160, 75, 'logo');
    expect(originSpy).toHaveBeenCalledWith(0.5);
    expect(tweenAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        targets: mockImage,
        y: 72,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    );
    const renderedTexts = textSpy.mock.calls.map((call) => call[2]);
    expect(renderedTexts).not.toContain('FLEX COMMANDO: ROGUE BEEF');
  });

  it('renders fallback text in MainMenuScene when logo texture does not exist', () => {
    const mainMenu = new MainMenuScene();
    const imageSpy = vi.fn();
    const textSpy = vi.fn().mockReturnValue({ setOrigin: vi.fn() });

    (mainMenu as any).cameras = { main: { width: 320, height: 240 } };
    (mainMenu as any).textures = {
      exists: vi.fn(() => false),
    };
    (mainMenu as any).add = {
      image: imageSpy,
      text: textSpy,
    };
    (mainMenu as any).input = {
      keyboard: {
        once: vi.fn(),
        on: vi.fn(),
      },
    };

    mainMenu.create();

    expect(imageSpy).not.toHaveBeenCalled();
    const renderedTexts = textSpy.mock.calls.map((call) => call[2]);
    expect(renderedTexts).toContain('FLEX COMMANDO: ROGUE BEEF');
  });

  it('renders logo sprite in GameOverScene when logo texture exists', () => {
    const gameOver = new GameOverScene();
    const originSpy = vi.fn();
    const mockImage = { x: 160, y: 35, setOrigin: originSpy };
    const imageSpy = vi.fn().mockReturnValue(mockImage);
    const textSpy = vi.fn().mockReturnValue({ setOrigin: vi.fn() });
    const tweenAddSpy = vi.fn();

    (gameOver as any).cameras = { main: { width: 320, height: 240 } };
    (gameOver as any).textures = {
      exists: vi.fn((key: string) => key === 'logo'),
    };
    (gameOver as any).add = {
      image: imageSpy,
      text: textSpy,
    };
    (gameOver as any).tweens = {
      add: tweenAddSpy,
    };
    (gameOver as any).input = {
      keyboard: {
        once: vi.fn(),
        on: vi.fn(),
      },
    };

    gameOver.create();

    expect(imageSpy).toHaveBeenCalledWith(160, 35, 'logo');
    expect(originSpy).toHaveBeenCalledWith(0.5);
    expect(tweenAddSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        targets: mockImage,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    );
    const renderedTexts = textSpy.mock.calls.map((call) => call[2]);
    expect(renderedTexts).toContain('GAME OVER');
  });

  it('does not render logo image in GameOverScene when logo texture does not exist', () => {
    const gameOver = new GameOverScene();
    const imageSpy = vi.fn();
    const textSpy = vi.fn().mockReturnValue({ setOrigin: vi.fn() });

    (gameOver as any).cameras = { main: { width: 320, height: 240 } };
    (gameOver as any).textures = {
      exists: vi.fn(() => false),
    };
    (gameOver as any).add = {
      image: imageSpy,
      text: textSpy,
    };
    (gameOver as any).input = {
      keyboard: {
        once: vi.fn(),
        on: vi.fn(),
      },
    };

    gameOver.create();

    expect(imageSpy).not.toHaveBeenCalled();
    const renderedTexts = textSpy.mock.calls.map((call) => call[2]);
    expect(renderedTexts).toContain('GAME OVER');
  });

  it('renders high score in MainMenuScene', () => {
    const mainMenu = new MainMenuScene();
    const textSpy = vi.fn().mockReturnValue({ setOrigin: vi.fn() });

    (mainMenu as any).cameras = { main: { width: 512, height: 288 } };
    (mainMenu as any).textures = {
      exists: vi.fn(() => false),
    };
    (mainMenu as any).add = {
      image: vi.fn(),
      text: textSpy,
    };
    (mainMenu as any).input = {
      keyboard: { once: vi.fn(), on: vi.fn() },
    };

    mainMenu.create();

    const renderedTexts = textSpy.mock.calls.map((call) => call[2]);
    const highScoreText = renderedTexts.find((t: string) => t.startsWith('HIGH SCORE:'));
    expect(highScoreText).toBeDefined();
    expect(highScoreText).toMatch(/^HIGH SCORE: \d{6}$/);
  });

  it('renders score and high score on GameOverScene', () => {
    const gameOver = new GameOverScene();
    gameOver.init({ victory: false, score: 2500, highScore: 5000, isNewHighScore: false });
    const textSpy = vi.fn().mockReturnValue({ setOrigin: vi.fn() });

    (gameOver as any).cameras = { main: { width: 512, height: 288 } };
    (gameOver as any).textures = { exists: vi.fn(() => false) };
    (gameOver as any).add = {
      image: vi.fn(),
      text: textSpy,
    };
    (gameOver as any).input = {
      keyboard: { once: vi.fn(), on: vi.fn() },
    };

    gameOver.create();

    const renderedTexts = textSpy.mock.calls.map((call) => call[2]);
    expect(renderedTexts).toContain('GAME OVER');
    expect(renderedTexts).toContain('YOU DIED');
    const scoreText = renderedTexts.find((t: string) => t.includes('SCORE:') && t.includes('HIGH:'));
    expect(scoreText).toBeDefined();
    expect(scoreText).toContain('SCORE: 002500');
    expect(scoreText).toContain('HIGH: 005000');
    expect(renderedTexts).not.toContain('★ NEW HIGH SCORE! ★');
  });

  it('renders NEW HIGH SCORE celebration banner on GameOverScene when isNewHighScore is true and victory is true', () => {
    const gameOver = new GameOverScene();
    gameOver.init({ victory: true, score: 8000, highScore: 8000, isNewHighScore: true });
    const textSpy = vi.fn().mockReturnValue({ setOrigin: vi.fn() });

    (gameOver as any).cameras = { main: { width: 512, height: 288 } };
    (gameOver as any).textures = { exists: vi.fn(() => false) };
    (gameOver as any).add = {
      image: vi.fn(),
      text: textSpy,
    };
    (gameOver as any).input = {
      keyboard: { once: vi.fn(), on: vi.fn() },
    };

    gameOver.create();

    const renderedTexts = textSpy.mock.calls.map((call) => call[2]);
    expect(renderedTexts).toContain('VICTORY!');
    expect(renderedTexts).toContain('MISSION ACCOMPLISHED');
    expect(renderedTexts).toContain('★ NEW HIGH SCORE! ★');
    const scoreText = renderedTexts.find((t: string) => t.includes('SCORE:') && t.includes('HIGH:'));
    expect(scoreText).toBeDefined();
    expect(scoreText).toContain('SCORE: 008000');
    expect(scoreText).toContain('HIGH: 008000');
  });

  it('fades in camera and renders tinted cyber_hangar_bg backdrop on GameOverScene', () => {
    const gameOver = new GameOverScene();
    gameOver.init({ victory: false, score: 1200, highScore: 5000, isNewHighScore: false });

    const fadeInSpy = vi.fn();
    const mockBg: any = {
      setOrigin: vi.fn().mockReturnThis(),
      setTint: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
    };
    const tileSpriteSpy = vi.fn().mockReturnValue(mockBg);

    (gameOver as any).cameras = {
      main: {
        width: 512,
        height: 288,
        fadeIn: fadeInSpy,
      },
    };
    (gameOver as any).textures = {
      exists: vi.fn((key: string) => key === 'cyber_hangar_bg'),
    };
    (gameOver as any).add = {
      tileSprite: tileSpriteSpy,
      image: vi.fn(),
      text: vi.fn().mockReturnValue({ setOrigin: vi.fn() }),
    };
    (gameOver as any).input = {
      keyboard: { once: vi.fn(), on: vi.fn() },
    };

    gameOver.create();

    expect(fadeInSpy).toHaveBeenCalledWith(400, 7, 9, 20);
    expect(tileSpriteSpy).toHaveBeenCalledWith(0, 0, 512, 288, 'cyber_hangar_bg');
    expect(mockBg.setOrigin).toHaveBeenCalledWith(0, 0);
    expect(mockBg.setTint).toHaveBeenCalledWith(0x661a22);
    expect(mockBg.setAlpha).toHaveBeenCalledWith(0.45);
  });
});

