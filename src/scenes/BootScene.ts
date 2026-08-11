import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Preload assets for BootScene if needed
  }

  create(): void {
    this.scene.start('MainMenuScene');
  }
}
