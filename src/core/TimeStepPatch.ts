/**
 * Patches Phaser 4.2.1 TimeStep.prototype.stepLimitFPS to eliminate double-counted
 * sub-interval delta remainders that cause the game to run ~20-30% faster than wall-clock time.
 *
 * Root Cause Analysis:
 * In Phaser 3:
 *   if (this.delta >= this._limitRate) {
 *     this.callback(time, this.delta);
 *     this.delta = 0;
 *   }
 *
 * In Phaser 4.2.1:
 *   if (this.delta >= this._limitRate) {
 *     this.callback(time, this.delta);
 *     this.delta %= this._limitRate; // BUG: remainder was passed to callback AND retained for next frame
 *   }
 *
 * Passing accumulated delta to callback and then saving the remainder (`this.delta %= this._limitRate`)
 * counts the remainder twice (once in the current frame and once in the next), artificially inflating
 * the reported delta and game speed by ~20% to ~30% on standard 60-144Hz displays with jitter.
 *
 * This patch restores the correct zero-out behavior (this.delta = 0) whenever the accumulated delta
 * is dispatched to the callback, preserving exact 1.00x real-world speed without runtime GC.
 */

export function patchTimeStepMethod(timeStepProtoOrInstance: any): boolean {
  if (!timeStepProtoOrInstance || typeof timeStepProtoOrInstance.stepLimitFPS !== 'function') {
    return false;
  }

  if (timeStepProtoOrInstance.__limitFpsPatched) {
    return true;
  }

  timeStepProtoOrInstance.stepLimitFPS = function (this: any, time: number): void {
    this.now = time;

    // delta time (time is in ms)
    // Math.max because Chrome will sometimes give negative deltas
    let delta = Math.max(0, time - this.lastTime);

    this.rawDelta = delta;

    // Real-world timer advance
    this.time += this.rawDelta;

    if (this.smoothStep && typeof this.smoothDelta === 'function') {
      delta = this.smoothDelta(delta);
    }

    // Set as the world delta value (after smoothing, if applied)
    this.delta += delta;

    if (time >= this.nextFpsUpdate && typeof this.updateFPS === 'function') {
      this.updateFPS(time);
    }

    this.framesThisSecond++;

    if (this.delta >= this._limitRate) {
      if (typeof this.callback === 'function') {
        this.callback(time, this.delta);
      }

      // Reset accumulated delta now that it has been simulated by the callback.
      // Unlike Phaser 4.2.1's `this.delta %= this._limitRate`, which retains the remainder
      // and counts it again next frame, setting to 0 ensures total simulated delta exactly
      // equals real elapsed time (1.00x speed).
      this.delta = 0;
    }

    // Shift time value over
    this.lastTime = time;

    this.frame++;
  };

  timeStepProtoOrInstance.__limitFpsPatched = true;
  return true;
}

export function installTimeStepPatch(phaserOrGame?: any): boolean {
  const phaser = phaserOrGame || (globalThis as any).Phaser;
  let patched = false;

  const TimeStepClass = phaser?.Core?.TimeStep;
  if (TimeStepClass?.prototype) {
    patched = patchTimeStepMethod(TimeStepClass.prototype) || patched;
  }

  if (phaserOrGame?.loop) {
    patched = patchTimeStepMethod(phaserOrGame.loop) || patched;
  }

  return patched;
}
