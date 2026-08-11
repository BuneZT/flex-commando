import { WeaponType } from '../weapons/WeaponTypes';

export class SoundManager {
  private static instance: SoundManager | null = null;
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isBgmPlaying: boolean = false;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;

  private constructor() {
    this.initAudioContext();
    this.setupUnlockListeners();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private initAudioContext(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();

        this.sfxGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
    } catch {
      // AudioContext unavailable in non-browser unit test environments
    }
  }

  private setupUnlockListeners(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (!this.isBgmPlaying && !this.isMuted) {
            this.startBGM();
          }
        });
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  public ensureContext(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- Punchy Sound Effects Synthesis ---
  public playShoot(weaponType: WeaponType | 'ENEMY' = 'PEA_SHOOTER', isPlayerBullet: boolean = true): void {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const t = this.ctx.currentTime;

    if (!isPlayerBullet || weaponType === 'ENEMY') {
      this.playEnemyShootSound(t);
      return;
    }

    switch (weaponType) {
      case 'SPREAD_SHOT':
        this.playSpreadShotSound(t);
        break;
      case 'LASER':
        this.playLaserSound(t);
        break;
      case 'FLAME':
        this.playFlameSound(t);
        break;
      case 'MACHINE_GUN':
        this.playMachineGunSound(t);
        break;
      case 'PEA_SHOOTER':
      default:
        this.playPeaShooterSound(t);
        break;
    }
  }

  /** Transient sub-bass thump layer for punchiness */
  private playPunchKick(t: number, startFreq: number = 180, endFreq: number = 40, duration: number = 0.04): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  /** Transient high-pass click for sharp attack */
  private playAttackClick(t: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(3500, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.008);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.008);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.008);
  }

  private playPeaShooterSound(t: number): void {
    if (!this.ctx || !this.sfxGain) return;
    this.playAttackClick(t);
    this.playPunchKick(t, 200, 45, 0.045);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.06);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  private playSpreadShotSound(t: number): void {
    if (!this.ctx || !this.sfxGain) return;
    this.playAttackClick(t);
    this.playPunchKick(t, 240, 35, 0.06);

    const freqs = [550, 850, 1250];
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t + idx * 0.004);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.075 + idx * 0.004);

      gain.gain.setValueAtTime(0.28, t + idx * 0.004);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.075 + idx * 0.004);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t + idx * 0.004);
      osc.stop(t + 0.075 + idx * 0.004);
    });
  }

  private playLaserSound(t: number): void {
    if (!this.ctx || !this.sfxGain) return;
    this.playAttackClick(t);
    this.playPunchKick(t, 280, 50, 0.07);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(3200, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.11);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  private playFlameSound(t: number): void {
    if (!this.ctx || !this.sfxGain) return;
    this.playPunchKick(t, 160, 30, 0.08);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.linearRampToValueAtTime(300, t + 0.1);
    filter.Q.value = 4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  private playMachineGunSound(t: number): void {
    if (!this.ctx || !this.sfxGain) return;
    this.playAttackClick(t);
    this.playPunchKick(t, 220, 50, 0.035);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1300, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.045);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.045);
  }

  private playEnemyShootSound(t: number): void {
    if (!this.ctx || !this.sfxGain) return;
    this.playPunchKick(t, 140, 35, 0.05);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.09);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // --- Background Music Sequencer (8-Bar Varied Retro Action Symphony) ---
  public startBGM(): void {
    if (this.isBgmPlaying || !this.ctx) return;
    this.ensureContext();
    this.isBgmPlaying = true;
    this.bgmStep = 0;

    const tempoMs = 130; // ~115 BPM 16th-note step rate
    this.bgmTimer = window.setInterval(() => {
      this.tickBGMStep();
    }, tempoMs);
  }

  public stopBGM(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.isBgmPlaying = false;
  }

  private tickBGMStep(): void {
    if (!this.ctx || !this.musicGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const step = this.bgmStep % 128; // 8-bar loop (128 sixteenth notes)
    const currentBar = Math.floor(step / 16);

    // 1. Driving Bassline with Harmonic Progression Across 8 Bars
    // Bars 0-1 (Am), Bars 2-3 (F - G), Bars 4-5 (Am - C), Bars 6-7 (F - E7 Turnaround)
    const basslinePattern: number[] = [
      // Bar 0: Am
      110, 110, 130.81, 110, 146.83, 110, 164.81, 130.81, 110, 110, 130.81, 110, 164.81, 146.83, 130.81, 110,
      // Bar 1: Am variant
      110, 130.81, 110, 146.83, 110, 164.81, 146.83, 130.81, 110, 110, 130.81, 146.83, 164.81, 196.0, 164.81, 130.81,
      // Bar 2: F Major
      87.31, 87.31, 110, 87.31, 130.81, 87.31, 146.83, 110, 87.31, 87.31, 110, 87.31, 130.81, 110, 87.31, 110,
      // Bar 3: G Major
      98.0, 98.0, 123.47, 98.0, 146.83, 98.0, 164.81, 123.47, 98.0, 98.0, 123.47, 146.83, 164.81, 196.0, 164.81, 123.47,
      // Bar 4: Am driving pulse
      110, 110, 220, 110, 196, 110, 164.81, 130.81, 110, 110, 220, 110, 196, 164.81, 146.83, 130.81,
      // Bar 5: C Major
      130.81, 130.81, 164.81, 130.81, 196.0, 130.81, 220.0, 164.81, 130.81, 130.81, 164.81, 196.0, 220.0, 261.63, 220.0, 164.81,
      // Bar 6: F Major high drive
      174.61, 174.61, 220, 174.61, 261.63, 174.61, 293.66, 220, 174.61, 174.61, 220, 261.63, 293.66, 329.63, 293.66, 220,
      // Bar 7: E7 Turnaround (Rising tension into Bar 0)
      164.81, 164.81, 207.65, 164.81, 246.94, 164.81, 293.66, 246.94, 164.81, 196.0, 207.65, 246.94, 293.66, 329.63, 392.0, 440.0
    ];

    const bassFreq = basslinePattern[step];
    if (bassFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = currentBar >= 6 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(bassFreq, t);
      osc.frequency.exponentialRampToValueAtTime(bassFreq * 0.95, t + 0.095);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.095);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.095);
    }

    // 2. Multi-Section Lead Melody & Counterpoint (Section A: Main Theme, Section B: High Synth, Section C: Rapid Arps)
    const leadNotes: { [step: number]: number } = {
      // Section A (Bars 0-1): Classic Action Theme
      0: 440, 2: 523.25, 4: 587.33, 6: 659.25, 8: 783.99, 10: 659.25, 12: 587.33, 14: 523.25,
      16: 880, 18: 783.99, 20: 659.25, 22: 587.33, 24: 659.25, 26: 783.99, 28: 880, 30: 1046.5,

      // Section B (Bars 2-3): Heroic F/G Lift
      32: 698.46, 34: 873.07, 36: 1046.5, 38: 873.07, 40: 698.46, 42: 873.07, 44: 1046.5, 46: 1174.66,
      48: 783.99, 50: 987.77, 52: 1174.66, 54: 987.77, 56: 783.99, 58: 987.77, 60: 1174.66, 62: 1318.51,

      // Section C (Bars 4-5): Rapid 16th Arpeggio Cascade
      64: 880, 65: 1046.5, 66: 1174.66, 67: 1318.51, 68: 1567.98, 69: 1318.51, 70: 1174.66, 71: 1046.5,
      72: 880, 73: 1046.5, 74: 1174.66, 75: 1318.51, 76: 1567.98, 77: 1760.0, 78: 1567.98, 79: 1318.51,
      80: 1046.5, 81: 1318.51, 82: 1567.98, 83: 1760.0, 84: 2093.0, 85: 1760.0, 86: 1567.98, 87: 1318.51,
      88: 1046.5, 89: 1174.66, 90: 1318.51, 91: 1567.98, 92: 1318.51, 93: 1174.66, 94: 1046.5, 95: 880,

      // Section D (Bars 6-7): Climax & High Speed Turnaround
      96: 1396.91, 98: 1746.14, 100: 2093.0, 102: 1746.14, 104: 1396.91, 106: 1746.14, 108: 2093.0, 110: 2349.32,
      112: 1318.51, 114: 1648.14, 116: 1975.53, 118: 2349.32, 120: 2637.02, 122: 2349.32, 124: 1975.53, 126: 1648.14
    };

    const leadFreq = leadNotes[step];
    if (leadFreq) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = currentBar >= 4 && currentBar <= 5 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(leadFreq, t);

      const noteDuration = (currentBar >= 4 && currentBar <= 5) ? 0.08 : 0.16;
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.004, t + noteDuration);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + noteDuration);
    }

    // 3. Dynamic Percussion (Kick, Snare & Hi-Hat rolls with drum fills on bar endings)
    const isBarEnding = (step % 16) >= 12;
    const isStepOnSixteenth = step % 2 === 0 || (isBarEnding && step % 1 === 0);

    if (isStepOnSixteenth) {
      const isKick = step % 8 === 0 || (isBarEnding && step % 4 === 2);
      const isSnare = step % 8 === 4 || (isBarEnding && step % 2 === 1);

      if (isKick) {
        // Synthesized Punchy Bass Drum
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.06);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(t);
        osc.stop(t + 0.06);
      } else {
        // Snare / Hi-Hat Noise
        const duration = isSnare ? 0.07 : 0.02;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isSnare ? 0.14 : 0.035, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noise.connect(gain);
        gain.connect(this.musicGain);

        noise.start(t);
      }
    }

    this.bgmStep++;
  }
}
