import { WeaponType } from '../weapons/WeaponTypes';

export class SoundManager {
  private static instance: SoundManager | null = null;
  private ctx: { currentTime?: number; state?: string; resume?: () => Promise<void> } | null = null;
  private isMuted: boolean = false;

  private isBgmPlaying: boolean = false;
  private currentSoundTrack: any = null;
  private currentTrackKey: 'STAGE' | 'BOSS' | null = null;
  private activeScene: any = null;

  private lastSfxTimes: Map<string, number> = new Map();

  private constructor() {
    this.setupUnlockListeners();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private setupUnlockListeners(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.ensureContext();
      if (!this.isBgmPlaying && !this.isMuted && this.activeScene) {
        this.startBGM(this.currentTrackKey || 'STAGE', this.activeScene);
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  public ensureContext(): void {
    const soundCtx = this.ctx || this.activeScene?.sound?.context;
    if (soundCtx && soundCtx.state === 'suspended' && typeof soundCtx.resume === 'function') {
      soundCtx.resume();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.currentSoundTrack && typeof this.currentSoundTrack.setMute === 'function') {
      this.currentSoundTrack.setMute(this.isMuted);
    }
    if (this.activeScene?.sound) {
      this.activeScene.sound.mute = this.isMuted;
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setScene(scene: any): void {
    this.activeScene = scene;
  }

  public getScene(): any {
    return this.activeScene;
  }

  public resetThrottle(): void {
    this.lastSfxTimes.clear();
  }

  private getCurrentTime(): number {
    if (this.ctx && typeof this.ctx.currentTime === 'number') {
      return this.ctx.currentTime;
    }
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now() / 1000;
    }
    return Date.now() / 1000;
  }

  public playAudioKey(key: string, volume: number = 0.35): void {
    if (this.isMuted) return;
    if (this.activeScene?.sound && typeof this.activeScene.sound.play === 'function') {
      try {
        this.activeScene.sound.play(key, { volume });
      } catch {
        // Fallback for mock environments
      }
    }
  }

  // --- Preloaded Sound Effects (Zero GC Allocation) ---
  public playShoot(weaponType: WeaponType | 'ENEMY' = 'PEA_SHOOTER', isPlayerBullet: boolean = true): void {
    if (this.isMuted) return;
    this.ensureContext();

    const t = this.getCurrentTime();
    const key = !isPlayerBullet || weaponType === 'ENEMY' ? 'ENEMY' : weaponType;
    const lastTime = this.lastSfxTimes.get(key) ?? -1;
    if (t - lastTime < 0.025) {
      return;
    }
    this.lastSfxTimes.set(key, t);

    if (!isPlayerBullet || weaponType === 'ENEMY') {
      this.playAudioKey('sfx_shoot_enemy', 0.25);
      return;
    }

    switch (weaponType) {
      case 'SPREAD_SHOT':
        this.playAudioKey('sfx_shoot_spread', 0.35);
        break;
      case 'LASER':
        this.playAudioKey('sfx_shoot_laser', 0.30);
        break;
      case 'FLAME':
        this.playAudioKey('sfx_shoot_flame', 0.35);
        break;
      case 'MACHINE_GUN':
        this.playAudioKey('sfx_shoot_machinegun', 0.30);
        break;
      case 'PEA_SHOOTER':
      default:
        this.playAudioKey('sfx_shoot_pea', 0.30);
        break;
    }
  }

  public playSfx(sfx: 'pickup' | 'explosion' | string = 'pickup'): void {
    if (this.isMuted) return;
    this.ensureContext();

    const t = this.getCurrentTime();
    const lastTime = this.lastSfxTimes.get(sfx) ?? -1;
    if (t - lastTime < 0.025) {
      return;
    }
    this.lastSfxTimes.set(sfx, t);

    if (sfx === 'explosion') {
      this.playAudioKey('sfx_explosion', 0.40);
    } else if (sfx === 'pickup') {
      this.playAudioKey('sfx_pickup', 0.35);
    } else {
      this.playAudioKey(`sfx_${sfx}`, 0.35);
    }
  }

  // --- Background Music: Preloaded Static Audio Player (Zero GC Allocation) ---
  public startBGM(track: 'STAGE' | 'BOSS' = 'STAGE', scene?: any): void {
    if (scene) {
      this.activeScene = scene;
    }
    const audioKey = track === 'BOSS' ? 'bgm_boss' : 'bgm_stage';
    const s = scene || this.activeScene;

    if (this.isBgmPlaying && this.currentTrackKey === track) {
      return;
    }

    this.stopBGM();
    this.isBgmPlaying = true;
    this.currentTrackKey = track;

    if (s?.sound && typeof s.sound.add === 'function') {
      try {
        const soundObj = s.sound.add(audioKey, { loop: true, volume: 0.35 });
        if (soundObj) {
          this.currentSoundTrack = soundObj;
          if (typeof soundObj.play === 'function') {
            soundObj.play();
            if (this.isMuted && typeof soundObj.setMute === 'function') {
              soundObj.setMute(true);
            }
          }
        }
      } catch {
        // Ignore playback errors in headless unit test environments
      }
    }
  }

  public stopBGM(): void {
    if (this.currentSoundTrack) {
      try {
        if (typeof this.currentSoundTrack.stop === 'function') {
          this.currentSoundTrack.stop();
        }
        if (typeof this.currentSoundTrack.destroy === 'function') {
          this.currentSoundTrack.destroy();
        }
      } catch {}
      this.currentSoundTrack = null;
    }
    this.isBgmPlaying = false;
    this.currentTrackKey = null;
  }
}
