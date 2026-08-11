import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.add.text(width / 2, height / 2, 'GAME SCENE ACTIVE', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#00ff00'
    }).setOrigin(0.5);
  }
}
