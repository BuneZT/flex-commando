import type Phaser from 'phaser';
import { GAME_CONSTANTS } from './GameConstants';
import { BootScene } from '../scenes/BootScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { GameScene } from '../scenes/GameScene';
import { GameOverScene } from '../scenes/GameOverScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: 0, // Phaser.AUTO
  parent: 'game-container',
  width: GAME_CONSTANTS.VIEW_WIDTH_PX,
  height: GAME_CONSTANTS.VIEW_HEIGHT_PX,
  pixelArt: true,
  roundPixels: true,
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
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
  fps: {
    target: 60,
    limit: 60,
    smoothStep: true
  },
  scene: [BootScene, MainMenuScene, GameScene, GameOverScene]
};

