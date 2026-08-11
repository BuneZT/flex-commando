import Phaser from 'phaser';
import { isDevEnvironment } from '../config/Environment';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
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

    if (isDevEnvironment()) {
      this.add.text(width / 2, height / 2 + 30, 'PRESS I FOR INFINITE LIVES', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#00ffff'
      }).setOrigin(0.5);

      this.input.keyboard?.once('keydown-I', () => {
        this.scene.start('GameScene', { infiniteLives: true });
      });
    }

    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start('GameScene', { infiniteLives: false });
    });
  }
}
