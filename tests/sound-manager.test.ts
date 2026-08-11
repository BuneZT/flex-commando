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
});
