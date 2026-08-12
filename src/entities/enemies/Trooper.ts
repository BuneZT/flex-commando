import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../../weapons/ProjectilePool';

export class Trooper extends EnemyBase {
  public moveSpeed: number = 60;
  public jumpVelocity: number = -220;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 1, texture: string = 'tex_enemy_trooper') {
    super(scene, x, y, texture, health);
    this.scoreValue = 100;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(16, 24);
    }
  }

  public updateAI(
    _time: number,
    _delta: number,
    player?: { x: number; y: number },
    _projectilePool?: ProjectilePool
  ): void {
    if (!this.isAlive) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

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
      if (this.anims.currentAnim?.key !== 'trooper_run') {
        this.anims.play('trooper_run', true);
      }
    }

    body.setVelocityX(this.facingLeft ? -this.moveSpeed : this.moveSpeed);

    const isGrounded = body.blocked?.down || body.touching?.down || false;
    const isBlockedSide = (this.facingLeft && (body.blocked?.left || body.touching?.left)) ||
                          (!this.facingLeft && (body.blocked?.right || body.touching?.right));

    if (isGrounded && isBlockedSide) {
      body.setVelocityY(this.jumpVelocity);
    }
  }
}
