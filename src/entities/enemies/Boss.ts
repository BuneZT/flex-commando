import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../../weapons/ProjectilePool';

export class Boss extends EnemyBase {
  public shootTimer: number = 0;
  public fireRateMs: number = 1500;
  public phase: number = 1;
  public jumpTimer: number = 0;
  public jumpCooldownMs: number = 2400;
  public dropThroughTimer: number = 0;
  public isDroppingThrough: boolean = false;
  private moveTimer: number = 0;
  private moveDirection: number = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 50, texture: string = 'tex_enemy_boss') {
    super(scene, x, y, texture, health);
    this.scoreValue = 5000;
    this.damageOnContact = 2;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      if (typeof body.setImmovable === 'function') {
        body.setImmovable(true);
      }
      if (typeof body.setSize === 'function') {
        body.setSize(64, 58);
      }
      if (typeof body.setOffset === 'function') {
        body.setOffset(0, 6);
      }
    }
  }

  public updateAI(
    _time: number,
    delta: number,
    player?: { x: number; y: number },
    projectilePool?: ProjectilePool
  ): void {
    if (!this.isAlive) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    // Handle Drop-Through Platform Timer
    if (this.isDroppingThrough) {
      this.dropThroughTimer -= delta;
      if (this.dropThroughTimer <= 0) {
        this.isDroppingThrough = false;
        if (body.checkCollision) {
          body.checkCollision.down = true;
        }
      }
    }

    // Phase transition check
    if (this.health <= this.maxHealth / 2) {
      this.phase = 2;
      this.fireRateMs = 900;
    }

    const isGrounded = body.blocked?.down || body.touching?.down || false;

    // Horizontal pursuit & vertical mobility
    if (player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.abs(dx);
      this.facingLeft = dx < 0;

      const baseSpeed = this.phase === 2 ? 140 : 80;
      const speed = dist > 200 ? baseSpeed * 1.3 : baseSpeed;
      const moveDir = dx < -10 ? -1 : (dx > 10 ? 1 : 0);

      body.setVelocityX(moveDir * speed);

      // Vertical mobility: drop-through or leap
      if (isGrounded) {
        if (this.jumpTimer > 0) {
          this.jumpTimer -= delta;
        }

        // Drop down through platform if player is lower
        if (dy > 35 && !this.isDroppingThrough) {
          this.isDroppingThrough = true;
          this.dropThroughTimer = 300;
          if (body.checkCollision) {
            body.checkCollision.down = false;
          }
        } else if (this.jumpTimer <= 0) {
          if (dy < -30) {
            // Player is higher up: leap upward to pursue
            body.setVelocityY(-340);
            this.jumpTimer = this.jumpCooldownMs;
          } else if (dist > 160) {
            // Player is far: leap forward across arena
            body.setVelocityY(this.phase === 2 ? -300 : -250);
            this.jumpTimer = this.phase === 2 ? 1800 : 2500;
          }
        }
      }
    } else {
      // Fallback patrolling movement if no player
      const speed = this.phase === 2 ? 80 : 40;
      this.moveTimer += delta;
      if (this.moveTimer > 2000) {
        this.moveTimer = 0;
        this.moveDirection *= -1;
      }
      body.setVelocityX(speed * this.moveDirection);
    }

    if (this.anims && typeof this.anims.play === 'function') {
      const anims = this.scene?.anims || this.scene?.sys?.anims;
      if (anims?.exists?.('boss_drive') && this.anims.currentAnim?.key !== 'boss_drive') {
        this.anims.play('boss_drive', true);
      }
    }

    // Facing direction facing player
    if (player) {
      this.facingLeft = player.x < this.x;
    }

    if (typeof this.setFlipX === 'function') {
      this.setFlipX(this.facingLeft);
    }

    // Shooting AI
    this.shootTimer += delta;
    if (this.shootTimer >= this.fireRateMs && projectilePool && player) {
      this.shootTimer = 0;
      this.fireBossAttack(player, projectilePool);
    }
  }

  private fireBossAttack(player: { x: number; y: number }, projectilePool: ProjectilePool): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const baseAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (this.phase === 2) {
      // 3-way spread attack in phase 2
      projectilePool.spawn(this.x, this.y + 10, baseAngle - 20, 'PEA_SHOOTER', false);
      projectilePool.spawn(this.x, this.y + 10, baseAngle, 'PEA_SHOOTER', false);
      projectilePool.spawn(this.x, this.y + 10, baseAngle + 20, 'PEA_SHOOTER', false);
    } else {
      // Single direct targeted shot in phase 1
      projectilePool.spawn(this.x, this.y + 10, baseAngle, 'PEA_SHOOTER', false);
    }
  }
}
