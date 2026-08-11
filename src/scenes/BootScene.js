import Phaser from 'phaser';
export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }
    preload() {
        // Preload assets for BootScene if needed
    }
    create() {
        this.scene.start('MainMenuScene');
    }
}
