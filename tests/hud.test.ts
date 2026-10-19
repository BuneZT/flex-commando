import { describe, it, expect, vi } from 'vitest';
import {
  HUD,
  formatHUDLives,
  formatHUDWeaponName,
  getRoomBitIndex,
  markRoomVisited,
  isRoomVisited,
  getMinimapCellColor,
} from '../src/ui/HUD';
import { GAME_CONSTANTS } from '../src/config/GameConstants';
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

describe('formatHUDWeaponName', () => {
  it('should replace underscores with spaces in weapon display names', () => {
    expect(formatHUDWeaponName('SPREAD_SHOT')).toBe('SPREAD SHOT');
    expect(formatHUDWeaponName('PEA_SHOOTER')).toBe('PEA SHOOTER');
    expect(formatHUDWeaponName('MACHINE_GUN')).toBe('MACHINE GUN');
    expect(formatHUDWeaponName('LASER')).toBe('LASER');
    expect(formatHUDWeaponName('FLAME')).toBe('FLAME');
    expect(formatHUDWeaponName('BARRIER')).toBe('BARRIER');
  });
});

describe('Minimap Bitmask Room Tracking', () => {
  it('getRoomBitIndex should map 4x4 room coordinates to bit positions 0-15', () => {
    expect(getRoomBitIndex(0, 0)).toBe(0);
    expect(getRoomBitIndex(3, 0)).toBe(3);
    expect(getRoomBitIndex(0, 1)).toBe(4);
    expect(getRoomBitIndex(3, 3)).toBe(15);
  });

  it('markRoomVisited should set the corresponding bit in the bitmask', () => {
    let mask = 0;
    mask = markRoomVisited(mask, 0, 0); // bit 0 (1)
    expect(mask).toBe(1);

    mask = markRoomVisited(mask, 3, 0); // bit 3 (8) -> 9
    expect(mask).toBe(9);

    // Out of bounds coordinate should return original mask unchanged
    expect(markRoomVisited(mask, -1, 0)).toBe(9);
    expect(markRoomVisited(mask, 4, 0)).toBe(9);
    expect(markRoomVisited(mask, 0, 4)).toBe(9);
  });

  it('isRoomVisited should correctly report true only for marked rooms', () => {
    const mask = markRoomVisited(0, 2, 1); // bit 6

    expect(isRoomVisited(mask, 2, 1)).toBe(true);
    expect(isRoomVisited(mask, 0, 0)).toBe(false);
    expect(isRoomVisited(mask, 3, 3)).toBe(false);

    // Out of bounds checks
    expect(isRoomVisited(mask, -1, 0)).toBe(false);
    expect(isRoomVisited(mask, 4, 1)).toBe(false);
  });
});

describe('getMinimapCellColor (Fog of War color resolution)', () => {
  it('should return null for any unvisited cell (blank darkness)', () => {
    expect(getMinimapCellColor({ type: 'START' } as any, false, false)).toBeNull();
    expect(getMinimapCellColor({ type: 'BOSS' } as any, false, false)).toBeNull();
    expect(getMinimapCellColor({ type: 'PATH' } as any, false, false)).toBeNull();
    expect(getMinimapCellColor({ type: 'BRANCH' } as any, false, false)).toBeNull();
  });

  it('should return null for null, undefined, or EMPTY cells even if visited flag is passed', () => {
    expect(getMinimapCellColor(null, true, false)).toBeNull();
    expect(getMinimapCellColor(undefined, true, false)).toBeNull();
    expect(getMinimapCellColor({ type: 'EMPTY' } as any, true, false)).toBeNull();
  });

  it('should return 0x00ff00 (green) for current active player room when visited', () => {
    expect(getMinimapCellColor({ type: 'START' } as any, true, true)).toBe(0x00ff00);
    expect(getMinimapCellColor({ type: 'PATH' } as any, true, true)).toBe(0x00ff00);
    expect(getMinimapCellColor({ type: 'BOSS' } as any, true, true)).toBe(0x00ff00);
  });

  it('should return 0x0088ff (blue) for visited START room when not current', () => {
    expect(getMinimapCellColor({ type: 'START' } as any, true, false)).toBe(0x0088ff);
  });

  it('should return 0xff0044 (red) for visited BOSS room when not current', () => {
    expect(getMinimapCellColor({ type: 'BOSS' } as any, true, false)).toBe(0xff0044);
  });

  it('should return 0x666666 (gray) for visited PATH or BRANCH room when not current', () => {
    expect(getMinimapCellColor({ type: 'PATH' } as any, true, false)).toBe(0x666666);
    expect(getMinimapCellColor({ type: 'BRANCH' } as any, true, false)).toBe(0x666666);
  });
});

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

describe('HUD Positioning for 512px Viewport', () => {
  it('should place bossHpText centered at X = 256 (half of 512)', () => {
    const { mockScene } = createMockScene();
    new HUD(mockScene);

    expect(mockScene.add.text).toHaveBeenNthCalledWith(
      3,
      Math.round(GAME_CONSTANTS.VIEW_WIDTH_PX / 2),
      6,
      '',
      expect.anything()
    );
  });

  it('should anchor minimapGraphics with startX = 440 (VIEW_WIDTH_PX - 72)', () => {
    const { mockScene, mockMinimapGraphics } = createMockScene();
    const hud = new HUD(mockScene);
    const mockPlayer = { lives: 3, currentWeapon: 'PEA_SHOOTER', isBarrierActive: false, barrierHits: 0 } as any;

    hud.update(mockPlayer, mockGrid, 0, 0);

    const expectedStartX = GAME_CONSTANTS.VIEW_WIDTH_PX - 72; // 440
    // Minimap background is drawn at startX - 2 (438)
    expect(mockMinimapGraphics.fillRect).toHaveBeenCalledWith(
      expectedStartX - 2,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
    // First cell (c=0, r=0) is drawn at startX (440)
    expect(mockMinimapGraphics.fillRect).toHaveBeenCalledWith(
      expectedStartX,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
  });
});

describe('HUD Memoization and Dirty-State Caching', () => {

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
    expect(mockWeaponText.setText).toHaveBeenCalledWith('WEAPON: PEA SHOOTER');

    // Frame 2: Same state -> NO setText call
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockWeaponText.setText).toHaveBeenCalledTimes(1);

    // Frame 3: Shield activated -> setText called
    mockPlayer.isBarrierActive = true;
    mockPlayer.barrierHits = 3;
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockWeaponText.setText).toHaveBeenCalledTimes(2);
    expect(mockWeaponText.setText).toHaveBeenLastCalledWith('WEAPON: PEA SHOOTER [SHIELD:3]');

    // Frame 4: Shield hit count changed -> setText called
    mockPlayer.barrierHits = 2;
    hud.update(mockPlayer, mockGrid, 0, 0);
    expect(mockWeaponText.setText).toHaveBeenCalledTimes(3);
    expect(mockWeaponText.setText).toHaveBeenLastCalledWith('WEAPON: PEA SHOOTER [SHIELD:2]');
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
