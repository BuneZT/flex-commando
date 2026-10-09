import Phaser from 'phaser';
import { isDevEnvironment } from '../config/Environment';
import { SoundManager } from '../core/SoundManager';
import { createRetroTextStyle } from '../ui/TextStyle';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    if (this.input && typeof this.input.setDefaultCursor === 'function') {
      this.input.setDefaultCursor('default');
    }
    if (this.cameras?.main && typeof this.cameras.main.setRoundPixels === 'function') {
      this.cameras.main.setRoundPixels(true);
    }
    SoundManager.getInstance().startBGM();

    const { width, height } = this.cameras.main;

    if (this.textures?.exists('logo')) {
      const logo = this.add.image(Math.round(width / 2), Math.round(height / 2 - 45), 'logo');
      if (logo && typeof logo.setOrigin === 'function') {
        logo.setOrigin(0.5);
      }
      if (this.tweens && typeof this.tweens.add === 'function') {
        this.tweens.add({
          targets: logo,
          y: (logo.y || Math.round(height / 2 - 45)) - 3,
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      this.add.text(
        Math.round(width / 2),
        Math.round(height / 2 - 35),
        'FLEX COMMANDO: ROGUE BEEF',
        createRetroTextStyle({
          fontSize: '14px',
          color: '#ffffff',
          strokeThickness: 2,
        })
      ).setOrigin(0.5);
    }

    this.add.text(
      Math.round(width / 2),
      Math.round(height / 2 + 8),
      'PRESS SPACE TO START',
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
        Math.round(height / 2 + 28),
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
