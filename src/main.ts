import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { installPixelTextRenderer } from './ui/TextStyle';

installPixelTextRenderer(Phaser);

window.addEventListener('load', () => {
  new Phaser.Game(GameConfig);
});
