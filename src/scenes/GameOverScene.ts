import Phaser from 'phaser';
import { isDevEnvironment } from '../config/Environment';

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
    const { width, height } = this.cameras.main;

    const titleText = this.victory ? 'VICTORY!' : 'GAME OVER';
    const titleColor = this.victory ? '#00ff66' : '#ff0000';
    const subText = this.victory ? 'MISSION ACCOMPLISHED' : 'YOU DIED';

    this.add.text(width / 2, height / 2 - 40, titleText, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: titleColor,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 10, subText, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 25, 'PRESS SPACE TO RESTART', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    if (isDevEnvironment()) {
      this.add.text(width / 2, height / 2 + 45, 'PRESS I FOR INFINITE LIVES', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#00ffff',
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
