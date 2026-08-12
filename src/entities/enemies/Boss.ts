import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../../weapons/ProjectilePool';

export class Boss extends EnemyBase {
  public shootTimer: number = 0;
  public fireRateMs: number = 1500;
  public phase: number = 1;
  private moveTimer: number = 0;
  private moveDirection: number = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 50, texture: string = 'tex_enemy_boss') {
    super(scene, x, y, texture, health);
    this.scoreValue = 5000;
    this.damageOnContact = 2;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(32, 48);
      body.setImmovable(true);
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

    // Phase transition check
    if (this.health <= this.maxHealth / 2) {
      this.phase = 2;
      this.fireRateMs = 900;
    }

    // Horizontal patrolling movement
    const speed = this.phase === 2 ? 80 : 40;
    this.moveTimer += delta;
    if (this.moveTimer > 2000) {
      this.moveTimer = 0;
      this.moveDirection *= -1;
    }

    if (body) {
      body.setVelocityX(speed * this.moveDirection);
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
