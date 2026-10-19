import Phaser from 'phaser';
import { TextureFactory } from '../core/TextureFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    if (!this.load) return;

    // Standard Phaser loaders for browser execution
    this.load.image('logo', 'assets/ui/logo.png');
    this.load.image('cyber_hangar_bg', 'assets/bg/cyber_hangar_bg.png');
    this.load.spritesheet('tileset', 'assets/tiles/tileset.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tex_player', 'assets/sprites/player.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('tex_enemy_trooper', 'assets/sprites/trooper.png', { frameWidth: 24, frameHeight: 24 });
    this.load.spritesheet('tex_enemy_turret', 'assets/sprites/turret.png', { frameWidth: 32, frameHeight: 24 });
    this.load.spritesheet('tex_enemy_drone', 'assets/sprites/drone.png', { frameWidth: 32, frameHeight: 20 });
    this.load.spritesheet('tex_enemy_jumper', 'assets/sprites/jumper.png', { frameWidth: 24, frameHeight: 28 });
    this.load.spritesheet('tex_enemy_boss', 'assets/sprites/boss.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('tex_crosshair', 'assets/vfx/crosshair.png');
    this.load.spritesheet('tex_projectiles', 'assets/vfx/projectiles.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tex_pickups', 'assets/vfx/pickups.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('tex_explosion', 'assets/vfx/explosion.png', { frameWidth: 20, frameHeight: 20 });
    this.load.spritesheet('tex_bullet_impact', 'assets/vfx/bullet_impact.png', { frameWidth: 16, frameHeight: 16 });
    if (typeof this.load.audio === 'function') {
      this.load.audio('bgm_stage', ['assets/audio/bgm_stage.ogg', 'assets/audio/bgm_stage.mp3']);
      this.load.audio('bgm_boss', ['assets/audio/bgm_boss.ogg', 'assets/audio/bgm_boss.mp3']);
      this.load.audio('sfx_shoot_pea', 'assets/audio/sfx_shoot_pea.ogg');
      this.load.audio('sfx_shoot_spread', 'assets/audio/sfx_shoot_spread.ogg');
      this.load.audio('sfx_shoot_laser', 'assets/audio/sfx_shoot_laser.ogg');
      this.load.audio('sfx_shoot_flame', 'assets/audio/sfx_shoot_flame.ogg');
      this.load.audio('sfx_shoot_machinegun', 'assets/audio/sfx_shoot_machinegun.ogg');
      this.load.audio('sfx_shoot_enemy', 'assets/audio/sfx_shoot_enemy.ogg');
      this.load.audio('sfx_pickup', 'assets/audio/sfx_pickup.ogg');
      this.load.audio('sfx_explosion', 'assets/audio/sfx_explosion.ogg');
    }
  }

  create(): void {
    // Generate any fallback textures if running headless or missing
    TextureFactory.generateAllTextures(this);
    this.scene?.start('MainMenuScene');
  }
}
