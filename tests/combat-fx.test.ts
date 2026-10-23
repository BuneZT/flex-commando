import { describe, it, expect, vi } from 'vitest';
import { CombatFX } from '../src/core/CombatFX';

describe('CombatFX', () => {
  it('applies solid white hit flash and schedules tint clearing', () => {
    let timerCallback: (() => void) | null = null;
    const delayedCallMock = vi.fn((_ms: number, cb: () => void) => {
      timerCallback = cb;
    });

    const spriteMock: any = {
      active: true,
      setTintFill: vi.fn(),
      clearTint: vi.fn(),
      scene: {
        time: {
          delayedCall: delayedCallMock,
        },
      },
    };

    CombatFX.applyHitFlash(spriteMock, 90);

    expect(spriteMock.setTintFill).toHaveBeenCalledWith(0xffffff);
    expect(delayedCallMock).toHaveBeenCalledWith(90, expect.any(Function));

    // Simulate timer firing
    if (timerCallback) {
      (timerCallback as Function)();
    }
    expect(spriteMock.clearTint).toHaveBeenCalled();
  });

  it('safely handles sprites in headless/mocked environments without throwing', () => {
    expect(() => {
      CombatFX.applyHitFlash({} as any);
    }).not.toThrow();

    expect(() => {
      CombatFX.applyHitFlash(null as any);
    }).not.toThrow();
  });

  it('spawns death explosion sprite and binds animationcomplete destroy handler', () => {
    let animCompleteCb: (() => void) | null = null;
    const spriteMock: any = {
      setDepth: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      anims: {
        play: vi.fn(),
      },
      once: vi.fn((event: string, cb: () => void) => {
        if (event === 'animationcomplete') animCompleteCb = cb;
      }),
      destroy: vi.fn(),
    };

    const sceneMock: any = {
      add: {
        sprite: vi.fn().mockReturnValue(spriteMock),
      },
    };

    const result = CombatFX.spawnDeathExplosion(sceneMock, 150, 200, 1.5);

    expect(sceneMock.add.sprite).toHaveBeenCalledWith(150, 200, 'tex_explosion');
    expect(spriteMock.setDepth).toHaveBeenCalledWith(50);
    expect(spriteMock.setScale).toHaveBeenCalledWith(1.5);
    expect(spriteMock.anims.play).toHaveBeenCalledWith('enemy_explosion');
    expect(spriteMock.once).toHaveBeenCalledWith('animationcomplete', expect.any(Function));

    if (animCompleteCb) {
      (animCompleteCb as Function)();
    }
    expect(spriteMock.destroy).toHaveBeenCalled();
    expect(result).toBe(spriteMock);
  });

  it('safely handles headless / null scenes without throwing when spawning explosions', () => {
    const result = CombatFX.spawnDeathExplosion({} as any, 100, 100);
    expect(result).toBeNull();
  });

  it('triggers camera screen shake safely when cameras.main.shake is available', () => {
    const shakeSpy = vi.fn();
    const sceneMock: any = {
      cameras: {
        main: {
          shake: shakeSpy,
        },
      },
    };

    CombatFX.triggerScreenShake(sceneMock, 150, 0.008);
    expect(shakeSpy).toHaveBeenCalledWith(150, 0.008);

    // Should not throw when cameras or shake is missing
    expect(() => CombatFX.triggerScreenShake({} as any, 150, 0.008)).not.toThrow();
    expect(() => CombatFX.triggerScreenShake(null as any, 150, 0.008)).not.toThrow();
  });

  it('spawns staggered player death explosions and shakes camera in spawnPlayerDeathSequence', () => {
    const scheduledCallbacks: Array<{ delay: number; cb: () => void }> = [];
    const shakeSpy = vi.fn();
    const spriteMock: any = {
      setDepth: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      anims: { play: vi.fn() },
      once: vi.fn(),
      destroy: vi.fn(),
    };

    const sceneMock: any = {
      cameras: {
        main: {
          shake: shakeSpy,
        },
      },
      add: {
        sprite: vi.fn().mockReturnValue(spriteMock),
      },
      time: {
        delayedCall: vi.fn((delay: number, cb: () => void) => {
          scheduledCallbacks.push({ delay, cb });
        }),
      },
    };

    const playerMock = { x: 200, y: 180 };

    CombatFX.spawnPlayerDeathSequence(sceneMock, playerMock);

    // Immediate shake + first explosion
    expect(shakeSpy).toHaveBeenCalledWith(250, 0.012);
    expect(sceneMock.add.sprite).toHaveBeenCalledTimes(1);
    expect(sceneMock.add.sprite).toHaveBeenCalledWith(200, 180, 'tex_explosion');

    // Follow-up explosions scheduled
    expect(scheduledCallbacks.length).toBe(2);
    expect(scheduledCallbacks[0].delay).toBe(250);
    expect(scheduledCallbacks[1].delay).toBe(500);

    // Execute scheduled callbacks as player moves along knockback arc
    playerMock.x = 180;
    playerMock.y = 160;
    scheduledCallbacks[0].cb();
    expect(sceneMock.add.sprite).toHaveBeenCalledTimes(2);

    playerMock.x = 160;
    playerMock.y = 200;
    scheduledCallbacks[1].cb();
    expect(sceneMock.add.sprite).toHaveBeenCalledTimes(3);
  });
});
