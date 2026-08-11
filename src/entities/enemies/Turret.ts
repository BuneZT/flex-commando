import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../../weapons/ProjectilePool';

export class Turret extends EnemyBase {
  public aimAngleDeg: number = 0;
  public fireRateMs: number = 1500;
  public shootTimer: number = 0;
  public range: number = 300;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 2, texture: string = 'tex_enemy_turret') {
    super(scene, x, y, texture, health);
    this.scoreValue = 200;
    this.shootTimer = this.fireRateMs;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
      body.setAllowGravity(false);
      body.setSize(20, 20);
    }
  }

  public updateAI(
    _time: number,
    delta: number,
    player?: { x: number; y: number },
    projectilePool?: ProjectilePool
  ): void {
    if (!this.isAlive) return;

    if (this.shootTimer > 0) {
      this.shootTimer -= delta;
    }

    if (player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      this.aimAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      this.facingLeft = dx < 0;

      if (dist <= this.range && this.shootTimer <= 0 && projectilePool) {
        projectilePool.spawn(this.x, this.y, this.aimAngleDeg, 'PEA_SHOOTER', false);
        this.shootTimer = this.fireRateMs;
      }
    }

    if (typeof this.setFlipX === 'function') {
      this.setFlipX(this.facingLeft);
    }
  }
}
