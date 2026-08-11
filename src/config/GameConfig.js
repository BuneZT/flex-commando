import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { GameOverScene } from '../scenes/GameOverScene';
export const GameConfig = {
    type: 0, // Phaser.AUTO
    parent: 'game-container',
    width: 320,
    height: 240,
    pixelArt: true,
    scale: {
        mode: 3, // Phaser.Scale.FIT
        autoCenter: 1 // Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 600 },
            debug: false
        }
    },
    scene: [BootScene, MainMenuScene, GameScene, GameOverScene]
};
