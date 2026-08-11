import Phaser from 'phaser';
export class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }
    create() {
        const { width, height } = this.cameras.main;
        this.add.text(width / 2, height / 2 - 20, 'GAME OVER', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ff0000'
        }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 20, 'PRESS SPACE TO RESTART', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.input.keyboard?.once('keydown-SPACE', () => {
            this.scene.start('MainMenuScene');
        });
    }
}
