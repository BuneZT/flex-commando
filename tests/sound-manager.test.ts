import { describe, it, expect } from 'vitest';
import { SoundManager } from '../src/core/SoundManager';

describe('SoundManager', () => {
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

  it('should start and stop BGM without errors', () => {
    const sm = SoundManager.getInstance();
    expect(() => {
      sm.startBGM();
      sm.stopBGM();
    }).not.toThrow();
  });

  it('should throttle rapid duplicate playShoot triggers within 25ms window', () => {
    const sm = SoundManager.getInstance();
    let playCount = 0;
    const mockGain = {
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
    };
    const mockCtx = {
      currentTime: 1.0,
      createOscillator: () => ({
        type: 'square',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => { playCount++; },
        stop: () => {},
      }),
      createGain: () => mockGain,
      createBuffer: () => ({
        getChannelData: () => new Float32Array(100),
      }),
      createBufferSource: () => ({
        buffer: null,
        connect: () => {},
        start: () => {},
      }),
      destination: {},
      sampleRate: 44100,
      state: 'running',
      resume: async () => {},
    };

    (sm as unknown as { ctx: unknown; sfxGain: unknown }).ctx = mockCtx;
    (sm as unknown as { ctx: unknown; sfxGain: unknown }).sfxGain = mockGain;

    mockCtx.currentTime = 1.0;
    sm.playShoot('PEA_SHOOTER', true);
    const initialPlayCount = playCount;
    expect(initialPlayCount).toBeGreaterThan(0);

    // Call again within 25ms (1.010 - 1.0 = 10ms < 25ms) -> should be throttled
    mockCtx.currentTime = 1.010;
    sm.playShoot('PEA_SHOOTER', true);
    expect(playCount).toBe(initialPlayCount);

    // Call again after 25ms (1.030 - 1.0 = 30ms > 25ms) -> should trigger sound
    mockCtx.currentTime = 1.030;
    sm.playShoot('PEA_SHOOTER', true);
    expect(playCount).toBeGreaterThan(initialPlayCount);
  });
});

