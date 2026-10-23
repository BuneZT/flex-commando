import { describe, it, expect, beforeEach } from 'vitest';
import { SoundManager } from '../src/core/SoundManager';

describe('SoundManager', () => {
  beforeEach(() => {
    SoundManager.getInstance().setMuted(false);
    SoundManager.getInstance().resetThrottle();
  });

  it('should return singleton instance', () => {
    const s1 = SoundManager.getInstance();
    const s2 = SoundManager.getInstance();
    expect(s1).toBe(s2);
  });

  it('should toggle and set mute state correctly', () => {
    const sm = SoundManager.getInstance();
    sm.setMuted(false);
    expect(sm.getIsMuted()).toBe(false);

    const mutedState = sm.toggleMute();
    expect(mutedState).toBe(true);
    expect(sm.getIsMuted()).toBe(true);

    sm.setMuted(false);
    expect(sm.getIsMuted()).toBe(false);
  });

  it('should safely invoke playShoot for various weapon types without errors', () => {
    const sm = SoundManager.getInstance();
    expect(() => {
      sm.playShoot('PEA_SHOOTER', true);
      sm.playShoot('SPREAD_SHOT', true);
      sm.playShoot('LASER', true);
      sm.playShoot('FLAME', true);
      sm.playShoot('MACHINE_GUN', true);
      sm.playShoot('ENEMY', false);
    }).not.toThrow();
  });

  it('should safely invoke playSfx without errors', () => {
    const sm = SoundManager.getInstance();
    expect(() => {
      sm.playSfx('pickup');
    }).not.toThrow();
  });

  it('should start and stop BGM without errors', () => {
    const sm = SoundManager.getInstance();
    expect(() => {
      sm.startBGM();
      sm.stopBGM();
    }).not.toThrow();
  });

  it('should play BGM using scene.sound when available and handle track switching', () => {
    const sm = SoundManager.getInstance();
    let playedTrack = '';
    let stoppedTrack = '';
    const mockSoundObj = {
      play: () => {},
      stop: () => { stoppedTrack = playedTrack; },
      destroy: () => {},
      setMute: () => {},
    };
    const mockScene = {
      sound: {
        add: (key: string) => {
          playedTrack = key;
          return mockSoundObj;
        },
        mute: false,
      },
    } as any;

    sm.startBGM('STAGE', mockScene);
    expect(playedTrack).toBe('bgm_stage');

    sm.startBGM('BOSS', mockScene);
    expect(stoppedTrack).toBe('bgm_stage');
    expect(playedTrack).toBe('bgm_boss');

    sm.stopBGM();
  });

  it('should play preloaded SFX audio keys on activeScene.sound', () => {
    const sm = SoundManager.getInstance();
    const playedSounds: { key: string; config: any }[] = [];
    const mockScene = {
      sound: {
        play: (key: string, config: any) => {
          playedSounds.push({ key, config });
        },
      },
    };
    sm.setScene(mockScene);

    sm.playShoot('PEA_SHOOTER', true);
    expect(playedSounds.some((s) => s.key === 'sfx_shoot_pea')).toBe(true);

    sm.playShoot('ENEMY', false);
    expect(playedSounds.some((s) => s.key === 'sfx_shoot_enemy')).toBe(true);

    sm.playSfx('pickup');
    expect(playedSounds.some((s) => s.key === 'sfx_pickup')).toBe(true);

    sm.playSfx('explosion');
    expect(playedSounds.some((s) => s.key === 'sfx_explosion')).toBe(true);
  });

  it('should throttle rapid duplicate playShoot triggers within 25ms window', () => {
    const sm = SoundManager.getInstance();
    let playCount = 0;
    const mockScene = {
      sound: {
        play: () => {
          playCount++;
        },
      },
    };
    sm.setScene(mockScene);

    const mockCtx = {
      currentTime: 1.0,
      state: 'running',
      resume: async () => {},
    };
    (sm as unknown as { ctx: unknown }).ctx = mockCtx;

    mockCtx.currentTime = 1.0;
    sm.playShoot('SPREAD_SHOT', true);
    const initialPlayCount = playCount;
    expect(initialPlayCount).toBe(1);

    // Call again within 25ms (1.010 - 1.0 = 10ms < 25ms) -> should be throttled
    mockCtx.currentTime = 1.010;
    sm.playShoot('SPREAD_SHOT', true);
    expect(playCount).toBe(initialPlayCount);

    // Call again after 25ms (1.030 - 1.0 = 30ms > 25ms) -> should trigger sound
    mockCtx.currentTime = 1.030;
    sm.playShoot('SPREAD_SHOT', true);
    expect(playCount).toBe(initialPlayCount + 1);
  });

  it('does not contain runtime Web Audio synthesis methods or procedural BGM timers', () => {
    const sm = SoundManager.getInstance() as any;
    expect(sm.tickBGMStep).toBeUndefined();
    expect(sm.getNoiseBuffer).toBeUndefined();
    expect(sm.noiseBuffer).toBeUndefined();
    expect(sm.bgmTimer).toBeUndefined();
  });
});
