import { describe, it, expect, vi } from 'vitest';
import { HUD, formatHUDLives } from '../src/ui/HUD';
import type Phaser from 'phaser';

describe('formatHUDLives', () => {
  it('should return infinity symbol when infiniteLives is true', () => {
    expect(formatHUDLives(3, true)).toBe('∞');
    expect(formatHUDLives(0, true)).toBe('∞');
  });

  it('should return hearts string when infiniteLives is false', () => {
    expect(formatHUDLives(3, false)).toBe('❤❤❤');
    expect(formatHUDLives(0, false)).toBe('DEAD');
  });
});

describe('HUD Memoization and Dirty-State Caching', () => {
  function createMockScene() {
    const mockLivesText = {
      setScrollFactor: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    };
    const mockWeaponText = {
      setScrollFactor: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    };
    const mockBossHpText = {
      setScrollFactor: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    };
    const mockMinimapGraphics = {
      setScrollFactor: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      fillStyle: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeRect: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    };

    let textCallCount = 0;
    const mockScene = {
      add: {
        text: vi.fn().mockImplementation(() => {
          textCallCount++;
          if (textCallCount === 1) return mockLivesText;
          if (textCallCount === 2) return mockWeaponText;
          return mockBossHpText;
        }),
        graphics: vi.fn().mockReturnValue(mockMinimapGraphics),
      },
    } as unknown as Phaser.Scene;

    return { mockScene, mockLivesText, mockWeaponText, mockBossHpText, mockMinimapGraphics };
  }

  const mockGrid = [
    [{ type: 'START' }, { type: 'PATH' }, { type: 'PATH' }, { type: 'BOSS' }],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ] as any;

  it('should only update livesText when lives or infiniteLives state changes', () => {
    const { mockScene, mockLivesText } = createMockScene();
    const hud = new HUD(mockScene);
    const mockPlayer = { lives: 3, currentWeapon: 'PEA_SHOOTER', isBarrierActive: false, barrierHits: 0 } as any;

    // Frame 1: Initial render
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockLivesText.setText).toHaveBeenCalledTimes(1);
    expect(mockLivesText.setText).toHaveBeenCalledWith('LIVES: ❤❤❤');

    // Frame 2: Same state -> NO setText call
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockLivesText.setText).toHaveBeenCalledTimes(1);

    // Frame 3: Lives changed -> setText called
    mockPlayer.lives = 2;
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockLivesText.setText).toHaveBeenCalledTimes(2);
    expect(mockLivesText.setText).toHaveBeenLastCalledWith('LIVES: ❤❤');
  });

  it('should only update weaponText when weapon or shield state changes', () => {
    const { mockScene, mockWeaponText } = createMockScene();
    const hud = new HUD(mockScene);
    const mockPlayer = { lives: 3, currentWeapon: 'PEA_SHOOTER', isBarrierActive: false, barrierHits: 0 } as any;

    // Frame 1: Initial render
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockWeaponText.setText).toHaveBeenCalledTimes(1);
    expect(mockWeaponText.setText).toHaveBeenCalledWith('WEAPON: PEA_SHOOTER');

    // Frame 2: Same state -> NO setText call
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockWeaponText.setText).toHaveBeenCalledTimes(1);

    // Frame 3: Shield activated -> setText called
    mockPlayer.isBarrierActive = true;
    mockPlayer.barrierHits = 3;
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockWeaponText.setText).toHaveBeenCalledTimes(2);
    expect(mockWeaponText.setText).toHaveBeenLastCalledWith('WEAPON: PEA_SHOOTER [SHIELD:3]');

    // Frame 4: Shield hit count changed -> setText called
    mockPlayer.barrierHits = 2;
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockWeaponText.setText).toHaveBeenCalledTimes(3);
    expect(mockWeaponText.setText).toHaveBeenLastCalledWith('WEAPON: PEA_SHOOTER [SHIELD:2]');
  });

  it('should only update bossHpText when boss HP changes or boss becomes active/inactive', () => {
    const { mockScene, mockBossHpText } = createMockScene();
    const hud = new HUD(mockScene);
    const mockPlayer = { lives: 3, currentWeapon: 'PEA_SHOOTER', isBarrierActive: false, barrierHits: 0 } as any;
    const mockBoss = { isAlive: true, health: 100, maxHealth: 100 } as any;

    // Frame 1: No boss -> bossHpText invisible, setText not called
    hud.update(mockPlayer, mockGrid, 0, 0, null);
    expect(mockBossHpText.setText).toHaveBeenCalledTimes(0);

    // Frame 2: Boss appears -> setText and setVisible(true) called
    hud.update(mockPlayer, mockGrid, 0, 0, mockBoss);
    expect(mockBossHpText.setText).toHaveBeenCalledTimes(1);
    expect(mockBossHpText.setVisible).toHaveBeenCalledWith(true);

    // Frame 3: Boss unchanged -> NO calls
    hud.update(mockPlayer, mockGrid, 0, 0, mockBoss);
    expect(mockBossHpText.setText).toHaveBeenCalledTimes(1);

    // Frame 4: Boss hit -> setText called
    mockBoss.health = 80;
    hud.update(mockPlayer, mockGrid, 0, 0, mockBoss);
    expect(mockBossHpText.setText).toHaveBeenCalledTimes(2);

    // Frame 5: Boss dies -> setVisible(false) called
    mockBoss.isAlive = false;
    hud.update(mockPlayer, mockGrid, 0, 0, mockBoss);
    expect(mockBossHpText.setVisible).toHaveBeenLastCalledWith(false);
  });

  it('should dirty-check minimap rendering so graphics clear/render occurs only when room coordinates change', () => {
    const { mockScene, mockMinimapGraphics } = createMockScene();
    const hud = new HUD(mockScene);
    const mockPlayer = { lives: 3, currentWeapon: 'PEA_SHOOTER', isBarrierActive: false, barrierHits: 0 } as any;

    // Frame 1: Initial room (0,0) -> renders minimap
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockMinimapGraphics.clear).toHaveBeenCalledTimes(1);

    // Frame 2: Same room (0,0) -> NO clear/render
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockMinimapGraphics.clear).toHaveBeenCalledTimes(1);

    // Frame 3: Move to room (1,0) -> renders minimap
    hud.update(mockPlayer, mockGrid, 1, 0);
    expect(mockMinimapGraphics.clear).toHaveBeenCalledTimes(2);

    // Frame 4: Same room (1,0) -> NO clear/render
    hud.update(mockPlayer, mockGrid, 1, 0);
    expect(mockMinimapGraphics.clear).toHaveBeenCalledTimes(2);
  });
});
