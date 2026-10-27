import { describe, it, expect, vi } from 'vitest';
import Phaser from 'phaser';
import { installTimeStepPatch, patchTimeStepMethod } from '../src/core/TimeStepPatch';

describe('TimeStepPatch', () => {
  it('should patch Phaser.Core.TimeStep.prototype successfully and idempotently', () => {
    const patchedFirst = installTimeStepPatch(Phaser);
    expect(patchedFirst).toBe(true);

    const proto = (Phaser.Core as any).TimeStep.prototype;
    expect(proto.__limitFpsPatched).toBe(true);

    // Second call should return true (already patched) without errors
    const patchedSecond = installTimeStepPatch(Phaser);
    expect(patchedSecond).toBe(true);
  });

  it('should eliminate 20-30% speedup and maintain exact 1.00x real-time speed', () => {
    // 1. Create an unpatched mock TimeStep with the original Phaser 4.2.1 buggy behavior:
    // (passes this.delta to callback, then does this.delta %= this._limitRate)
    const buggyTimeStep = {
      now: 0,
      lastTime: 0,
      time: 0,
      rawDelta: 0,
      delta: 0,
      _limitRate: 1000 / 60, // 16.666667ms
      smoothStep: false,
      framesThisSecond: 0,
      frame: 0,
      nextFpsUpdate: 1000,
      callback: vi.fn(),
      stepLimitFPS: function (time: number) {
        this.now = time;
        const delta = Math.max(0, time - this.lastTime);
        this.rawDelta = delta;
        this.time += this.rawDelta;
        this.delta += delta;
        if (time >= this.nextFpsUpdate) {
          this.nextFpsUpdate = time + 1000;
        }
        this.framesThisSecond++;
        if (this.delta >= this._limitRate) {
          this.callback(time, this.delta);
          this.delta %= this._limitRate; // Phaser 4.2.1 bug
        }
        this.lastTime = time;
        this.frame++;
      },
    };

    // 2. Create a patched TimeStep
    const patchedTimeStep = {
      ...buggyTimeStep,
      callback: vi.fn(),
    };
    patchTimeStepMethod(patchedTimeStep);

    // Simulate 300 frames (~5 seconds) on 60Hz with typical 1.5ms OS timer jitter
    let buggyTotalDelta = 0;
    buggyTimeStep.callback = vi.fn((_time: number, delta: number) => {
      buggyTotalDelta += delta;
    });

    let patchedTotalDelta = 0;
    patchedTimeStep.callback = vi.fn((_time: number, delta: number) => {
      patchedTotalDelta += delta;
    });

    const frameInterval = 1000 / 60;
    let time = 0;
    const numFrames = 300;

    for (let i = 0; i < numFrames; i++) {
      const jitter = Math.sin(i * 1.5) * 1.5;
      time += frameInterval + jitter;

      buggyTimeStep.stepLimitFPS(time);
      patchedTimeStep.stepLimitFPS(time);
    }

    // Buggy version accelerates delta accumulation (speedup > 1.05x to 1.30x)
    const buggyRatio = buggyTotalDelta / time;
    expect(buggyRatio).toBeGreaterThan(1.04);

    // Patched version precisely matches real elapsed time (exact 1.00x)
    const patchedRatio = patchedTotalDelta / time;
    expect(patchedRatio).toBeCloseTo(1.0, 3);
    expect(Math.abs(patchedTotalDelta - time)).toBeLessThan(frameInterval);
  });

  it('should maintain 1.00x speed on high-refresh 144Hz monitors', () => {
    const patchedTimeStep = {
      now: 0,
      lastTime: 0,
      time: 0,
      rawDelta: 0,
      delta: 0,
      _limitRate: 1000 / 60, // 16.666667ms
      smoothStep: false,
      framesThisSecond: 0,
      frame: 0,
      nextFpsUpdate: 1000,
      callback: vi.fn(),
      stepLimitFPS: (_time?: number) => {},
    };
    patchTimeStepMethod(patchedTimeStep);

    let totalDelta = 0;
    patchedTimeStep.callback = vi.fn((_time: number, delta: number) => {
      totalDelta += delta;
    });

    // 144Hz = ~6.944ms per tick
    const tickInterval = 1000 / 144;
    let time = 0;
    const numTicks = 720; // 5 seconds at 144Hz

    for (let i = 0; i < numTicks; i++) {
      time += tickInterval;
      patchedTimeStep.stepLimitFPS(time);
    }

    const ratio = totalDelta / time;
    expect(ratio).toBeCloseTo(1.0, 2);
    expect(Math.abs(totalDelta - time)).toBeLessThan(1000 / 60);
  });

  it('should not fire callback when accumulated delta is below limit rate', () => {
    const callback = vi.fn();
    const timeStep = {
      now: 0,
      lastTime: 0,
      time: 0,
      rawDelta: 0,
      delta: 0,
      _limitRate: 16.666667,
      smoothStep: false,
      framesThisSecond: 0,
      frame: 0,
      nextFpsUpdate: 1000,
      callback,
      stepLimitFPS: (_time?: number) => {},
    };
    patchTimeStepMethod(timeStep);

    // 8ms elapsed (below 16.667ms)
    timeStep.stepLimitFPS(8);
    expect(callback).not.toHaveBeenCalled();
    expect(timeStep.delta).toBe(8);

    // another 10ms elapsed (total 18ms >= 16.667ms)
    timeStep.stepLimitFPS(18);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(18, 18);
    // delta should be reset to 0
    expect(timeStep.delta).toBe(0);
  });
});
