import Phaser from 'phaser';
import { isDevEnvironment } from '../config/Environment';
import { SoundManager } from '../core/SoundManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    SoundManager.getInstance().startBGM();

    const { width, height } = this.cameras.main;
    this.add.text(width / 2, height / 2 - 30, 'FLEX COMMANDO: ROGUE BEEF', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, 'PRESS SPACE TO START', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffcc00'
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 12, 'PRESS M TO TOGGLE MUTE', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#888888'
    }).setOrigin(0.5);

    if (typeof this.input.keyboard?.on === 'function') {
      this.input.keyboard.on('keydown-M', () => {
        SoundManager.getInstance().toggleMute();
      });
    }

    if (isDevEnvironment()) {
      this.add.text(width / 2, height / 2 + 30, 'PRESS I FOR INFINITE LIVES', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#00ffff'
      }).setOrigin(0.5);

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
