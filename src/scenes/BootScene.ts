import Phaser from 'phaser';
import { TextureFactory } from '../core/TextureFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Preload assets for BootScene if needed
  }

  create(): void {
    TextureFactory.generateAllTextures(this);
    this.scene.start('MainMenuScene');
  }
}
