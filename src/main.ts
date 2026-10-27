import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { installPixelTextRenderer } from './ui/TextStyle';
import { installTimeStepPatch } from './core/TimeStepPatch';

installPixelTextRenderer(Phaser);
installTimeStepPatch(Phaser);

window.addEventListener('load', () => {
  new Phaser.Game(GameConfig);
});
