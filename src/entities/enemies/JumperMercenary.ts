import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../../weapons/ProjectilePool';

export class JumperMercenary extends EnemyBase {
  public moveSpeed: number = 50;
  public jumpVelocity: number = -250;
  public jumpCooldownMs: number = 1800;
  public jumpTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 1) {
    super(scene, x, y, '', health);
    this.scoreValue = 150;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(16, 24);
    }
  }

  public updateAI(
    _time: number,
    delta: number,
    player?: { x: number; y: number },
    _projectilePool?: ProjectilePool
  ): void {
    if (!this.isAlive) return;

    if (this.jumpTimer > 0) {
      this.jumpTimer -= delta;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    if (player) {
      this.facingLeft = player.x < this.x;
    }

    body.setVelocityX(this.facingLeft ? -this.moveSpeed : this.moveSpeed);

    const isGrounded = body.blocked?.down || body.touching?.down || false;

    if (isGrounded && this.jumpTimer <= 0) {
      body.setVelocityY(this.jumpVelocity);
      this.jumpTimer = this.jumpCooldownMs;
    }
  }
}
