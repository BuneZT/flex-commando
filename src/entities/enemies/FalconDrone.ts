import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../../weapons/ProjectilePool';

export function calculateDroneSinePosition(time: number, amplitude: number, frequency: number): number {
  return Math.sin(time * frequency) * amplitude;
}

export class FalconDrone extends EnemyBase {
  public baseY: number;
  public amplitude: number;
  public frequency: number;
  public moveSpeed: number = 40;
  public elapsedTime: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    amplitude: number = 15,
    frequency: number = 0.003,
    health: number = 1,
    texture: string = 'tex_enemy_drone'
  ) {
    super(scene, x, y, texture, health);
    this.baseY = y;
    this.amplitude = amplitude;
    this.frequency = frequency;
    this.scoreValue = 150;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setAllowGravity(false);
      body.setSize(16, 16);
    }
  }

  public updateAI(
    _time: number,
    delta: number,
    player?: { x: number; y: number },
    _projectilePool?: ProjectilePool
  ): void {
    if (!this.isAlive) return;

    this.elapsedTime += delta;

    if (player) {
      if (player.x < this.x) {
        this.facingLeft = true;
      } else {
        this.facingLeft = false;
      }
    }

    if (typeof this.setFlipX === 'function') {
      this.setFlipX(this.facingLeft);
    }

    if (this.anims && typeof this.anims.play === 'function') {
      this.anims.play('drone_fly', true);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocityX(this.facingLeft ? -this.moveSpeed : this.moveSpeed);
    }

    const yOffset = calculateDroneSinePosition(this.elapsedTime, this.amplitude, this.frequency);
    this.y = this.baseY + yOffset;
  }
}
