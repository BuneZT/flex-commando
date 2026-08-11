import Phaser from 'phaser';
export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }
    create() {
        const { width, height } = this.cameras.main;
        this.add.text(width / 2, height / 2 - 20, 'FLEX COMMANDO: ROGUE BEEF', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 20, 'PRESS SPACE TO START', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#ffcc00'
        }).setOrigin(0.5);
        this.input.keyboard?.once('keydown-SPACE', () => {
            this.scene.start('GameScene');
        });
    }
}
