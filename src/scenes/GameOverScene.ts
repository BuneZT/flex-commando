import Phaser from 'phaser';
import { isDevEnvironment } from '../config/Environment';
import { SoundManager } from '../core/SoundManager';
import { createRetroTextStyle } from '../ui/TextStyle';

export interface GameOverData {
  victory?: boolean;
  score?: number;
}

export class GameOverScene extends Phaser.Scene {
  private victory: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data?: GameOverData): void {
    this.victory = data?.victory || false;
  }

  create(): void {
    if (this.input && typeof this.input.setDefaultCursor === 'function') {
      this.input.setDefaultCursor('default');
    }
    if (this.cameras?.main && typeof this.cameras.main.setRoundPixels === 'function') {
      this.cameras.main.setRoundPixels(true);
    }
    const { width, height } = this.cameras.main;

    if (this.textures?.exists('logo')) {
      const logo = this.add.image(Math.round(width / 2), 35, 'logo');
      if (logo && typeof logo.setOrigin === 'function') {
        logo.setOrigin(0.5);
      }
      if (this.tweens && typeof this.tweens.add === 'function') {
        this.tweens.add({
          targets: logo,
          y: (logo.y || 35) - 3,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    const titleText = this.victory ? 'VICTORY!' : 'GAME OVER';
    const titleColor = this.victory ? '#00ff66' : '#ff2222';
    const subText = this.victory ? 'MISSION ACCOMPLISHED' : 'YOU DIED';

    this.add.text(
      Math.round(width / 2),
      Math.round(height / 2 - 45),
      titleText,
      createRetroTextStyle({
        fontSize: '22px',
        color: titleColor,
        strokeThickness: 3,
      })
    ).setOrigin(0.5);

    this.add.text(
      Math.round(width / 2),
      Math.round(height / 2 - 12),
      subText,
      createRetroTextStyle({
        fontSize: '13px',
        color: '#ffffff',
        strokeThickness: 2,
      })
    ).setOrigin(0.5);

    this.add.text(
      Math.round(width / 2),
      Math.round(height / 2 + 18),
      'PRESS SPACE TO RESTART',
      createRetroTextStyle({
        fontSize: '11px',
        color: '#ffcc00',
        strokeThickness: 2,
      })
    ).setOrigin(0.5);

    this.add.text(
      Math.round(width / 2),
      Math.round(height - 14),
      'PRESS M TO TOGGLE MUTE',
      createRetroTextStyle({
        fontSize: '9px',
        color: '#aaaaaa',
        strokeThickness: 2,
      })
    ).setOrigin(0.5);

    if (typeof this.input.keyboard?.on === 'function') {
      this.input.keyboard.on('keydown-M', () => {
        SoundManager.getInstance().toggleMute();
      });
    }

    if (isDevEnvironment()) {
      this.add.text(
        Math.round(width / 2),
        Math.round(height / 2 + 38),
        'PRESS I FOR INFINITE LIVES',
        createRetroTextStyle({
          fontSize: '10px',
          color: '#00ffff',
          strokeThickness: 2,
        })
      ).setOrigin(0.5);

      this.input.keyboard?.once('keydown-I', () => {
        SoundManager.getInstance().ensureContext();
        this.scene.start('GameScene', { infiniteLives: true });
      });
    }

    this.input.keyboard?.once('keydown-SPACE', () => {
      SoundManager.getInstance().ensureContext();
      this.scene.start('GameScene', { infiniteLives: false });
    });
  }
}
