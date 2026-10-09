import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../../weapons/ProjectilePool';

export class JumperMercenary extends EnemyBase {
  public moveSpeed: number = 50;
  public jumpVelocity: number = -250;
  public jumpCooldownMs: number = 1800;
  public jumpTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 1, texture: string = 'tex_enemy_jumper') {
    super(scene, x, y, texture, health);
    this.scoreValue = 150;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      if (typeof body.setSize === 'function') {
        body.setSize(16, 24);
      }
      if (typeof body.setOffset === 'function') {
        body.setOffset(4, 2);
      }
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

    if (typeof this.setFlipX === 'function') {
      this.setFlipX(this.facingLeft);
    }

    body.setVelocityX(this.facingLeft ? -this.moveSpeed : this.moveSpeed);

    const isGrounded = body.blocked?.down || body.touching?.down || false;

    const anims = this.scene?.anims || this.scene?.sys?.anims;
    if (this.anims && typeof this.anims.play === 'function') {
      if (!isGrounded) {
        if (anims?.exists?.('jumper_jump') && this.anims.currentAnim?.key !== 'jumper_jump') {
          this.anims.play('jumper_jump', true);
        }
      } else {
        if (typeof this.anims.stop === 'function') {
          this.anims.stop();
        }
        if (typeof this.setFrame === 'function') {
          this.setFrame(0);
        }
      }
    }

    if (isGrounded && this.jumpTimer <= 0) {
      body.setVelocityY(this.jumpVelocity);
      this.jumpTimer = this.jumpCooldownMs;
      if (this.anims && typeof this.anims.play === 'function' && anims?.exists?.('jumper_jump')) {
        this.anims.play('jumper_jump', true);
      }
    }
  }
}
