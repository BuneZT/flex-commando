import Phaser from 'phaser';
import { EnemyBase } from './EnemyBase';
import { ProjectilePool } from '../../weapons/ProjectilePool';
import { CombatFX } from '../../core/CombatFX';

export type BossState =
  | 'PATROL'
  | 'SWEEP_TELEGRAPH'
  | 'SWEEP_ATTACK'
  | 'LEAP_TELEGRAPH'
  | 'LEAP_AIR'
  | 'CHARGE_TELEGRAPH'
  | 'CHARGE_DASH'
  | 'OVERHEAT';

export type BossAttackPattern = 'SWEEP' | 'LEAP' | 'CHARGE';

export const BOSS_ATTACK_CYCLE: readonly BossAttackPattern[] = ['SWEEP', 'LEAP', 'CHARGE'];

/**
 * Pure helper to calculate the sweeping gatling gun angle (in degrees).
 * Sweeps from low-to-high in Phase 1, and low-to-high-to-low in Phase 2.
 */
export function calculateSweepAngleDeg(facingLeft: boolean, progress: number, phase: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  // Phase 2 sweeps up and back down (triangle wave); Phase 1 sweeps steadily upward
  const sweepT = phase === 2 ? 1 - Math.abs(2 * clamped - 1) : clamped;
  // Relative to facing right (0 deg): +30 deg (downward floor) to -55 deg (upper platforms)
  const rightFacingAngle = 30 - sweepT * 85;
  return facingLeft ? 180 - rightFacingAngle : rightFacingAngle;
}

/**
 * Pure helper to calculate ballistic jump velocity toward the locked target position.
 */
export function calculateLeapVelocity(
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number,
  phase: number
): { vx: number; vy: number } {
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  const maxVx = phase === 2 ? 260 : 210;
  const vx = Math.max(-maxVx, Math.min(maxVx, dx * 1.65));
  const vy = dy < -40 ? -390 : -330;
  return { vx, vy };
}

export class Boss extends EnemyBase {
  public shootTimer: number = 0;
  public fireRateMs: number = 1500;
  public phase: number = 1;
  public jumpTimer: number = 0;
  public jumpCooldownMs: number = 2400;
  public dropThroughTimer: number = 0;
  public isDroppingThrough: boolean = false;

  public state: BossState = 'PATROL';
  public stateTimer: number = 0;
  public patternIndex: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;
  public chargeDir: number = 1;
  public remainingLeaps: number = 0;
  private sweepShotCount: number = 0;
  private moveTimer: number = 0;
  private moveDirection: number = 1;
  public glowFilter: any | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, health: number = 120, texture: string = 'tex_enemy_boss') {
    super(scene, x, y, texture, health);
    this.scoreValue = 5000;
    this.damageOnContact = 2;
    this.explosionScale = 2.0;

    this.glowFilter = CombatFX.attachGlowFilter(this, 0xff3333, 2, 6, 4);
    if (this.glowFilter) {
      this.glowFilter.active = false;
    }

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

  public override takeDamage(amount: number): boolean {
    const effectiveDamage = this.state === 'OVERHEAT' ? amount * 2 : amount;
    return super.takeDamage(effectiveDamage);
  }

  public enterState(newState: BossState, player?: { x: number; y: number }): void {
    this.state = newState;
    this.stateTimer = 0;
    this.shootTimer = 0;
    this.sweepShotCount = 0;

    if (typeof this.clearTint === 'function') {
      this.clearTint();
    }

    if (this.glowFilter) {
      switch (newState) {
        case 'SWEEP_TELEGRAPH':
          this.glowFilter.active = true;
          this.glowFilter.color = 0xff3333;
          break;
        case 'LEAP_TELEGRAPH':
          this.glowFilter.active = true;
          this.glowFilter.color = 0xffaa00;
          break;
        case 'CHARGE_TELEGRAPH':
          this.glowFilter.active = true;
          this.glowFilter.color = 0xff6600;
          break;
        case 'OVERHEAT':
          this.glowFilter.active = true;
          this.glowFilter.color = 0x44ddff;
          break;
        default:
          this.glowFilter.active = false;
          break;
      }
    }

    if (player) {
      this.targetX = player.x;
      this.targetY = player.y;
      this.facingLeft = player.x < this.x;
      this.chargeDir = this.facingLeft ? -1 : 1;
    }
  }

  private applyPulseTint(color: number, intervalMs: number = 90): void {
    if (Math.floor(this.stateTimer / intervalMs) % 2 === 0) {
      if (typeof this.setTint === 'function') {
        this.setTint(color);
      }
    } else if (typeof this.clearTint === 'function') {
      this.clearTint();
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
    this.stateTimer += delta;

    switch (this.state) {
      case 'PATROL': {
        this.updatePatrolState(delta, isGrounded, body, player);
        break;
      }

      case 'SWEEP_TELEGRAPH': {
        body.setVelocityX(0);
        if (player) {
          this.facingLeft = player.x < this.x;
        }
        this.applyPulseTint(0xff3333, 80);
        const telegraphMs = this.phase === 2 ? 420 : 600;
        if (this.stateTimer >= telegraphMs) {
          this.enterState('SWEEP_ATTACK', player);
        }
        break;
      }

      case 'SWEEP_ATTACK': {
        body.setVelocityX(0);
        const attackDurationMs = this.phase === 2 ? 1000 : 1200;
        const fireIntervalMs = this.phase === 2 ? 110 : 150;
        this.shootTimer += delta;

        if (this.shootTimer >= fireIntervalMs && projectilePool) {
          this.shootTimer -= fireIntervalMs;
          const progress = Math.min(1, this.stateTimer / attackDurationMs);
          const angle = calculateSweepAngleDeg(this.facingLeft, progress, this.phase);
          const muzzleX = this.x + (this.facingLeft ? -24 : 24);
          const muzzleY = this.y + 8;
          projectilePool.spawn(muzzleX, muzzleY, angle, 'PEA_SHOOTER', false);

          // Phase 2 fires a wider twin-stream on alternating bursts
          if (this.phase === 2 && this.sweepShotCount % 2 === 1) {
            const offsetAngle = angle + (this.facingLeft ? -14 : 14);
            projectilePool.spawn(muzzleX, muzzleY, offsetAngle, 'PEA_SHOOTER', false);
          }
          this.sweepShotCount++;
        }

        if (this.stateTimer >= attackDurationMs) {
          this.enterState('PATROL', player);
        }
        break;
      }

      case 'LEAP_TELEGRAPH': {
        body.setVelocityX(0);
        this.applyPulseTint(0xffaa00, 80);
        const telegraphMs = this.phase === 2 ? 380 : 550;
        if (this.stateTimer >= telegraphMs) {
          const { vx, vy } = calculateLeapVelocity(this.x, this.y, this.targetX, this.targetY, this.phase);
          if (this.targetY - this.y > 40 && !this.isDroppingThrough) {
            this.isDroppingThrough = true;
            this.dropThroughTimer = 280;
            if (body.checkCollision) {
              body.checkCollision.down = false;
            }
          }
          this.enterState('LEAP_AIR');
          body.setVelocityX(vx);
          body.setVelocityY(vy);
        }
        break;
      }

      case 'LEAP_AIR': {
        // Wait until the boss lands back on a surface (after initial lift-off window)
        if ((this.stateTimer > 120 && isGrounded) || this.stateTimer >= 1400) {
          body.setVelocityX(0);
          if (projectilePool) {
            this.fireLandingShockwave(projectilePool);
          }
          if (this.remainingLeaps > 0) {
            this.remainingLeaps--;
            this.enterState('LEAP_TELEGRAPH', player);
          } else {
            this.enterState('PATROL', player);
          }
        }
        break;
      }

      case 'CHARGE_TELEGRAPH': {
        body.setVelocityX(0);
        this.applyPulseTint(0xff6600, 70);
        // Drop to lower floor during telegraph if player is below
        if (player && player.y - this.y > 35 && isGrounded && !this.isDroppingThrough) {
          this.isDroppingThrough = true;
          this.dropThroughTimer = 300;
          if (body.checkCollision) {
            body.checkCollision.down = false;
          }
        }
        const telegraphMs = this.phase === 2 ? 400 : 550;
        if (this.stateTimer >= telegraphMs) {
          const dir = this.chargeDir;
          this.enterState('CHARGE_DASH');
          this.chargeDir = dir;
          this.facingLeft = dir < 0;
        }
        break;
      }

      case 'CHARGE_DASH': {
        const dashSpeed = this.phase === 2 ? 320 : 240;
        body.setVelocityX(this.chargeDir * dashSpeed);

        // In Phase 2, vent vertical flak shots while charging
        if (this.phase === 2 && projectilePool) {
          this.shootTimer += delta;
          if (this.shootTimer >= 260) {
            this.shootTimer = 0;
            projectilePool.spawn(this.x, this.y - 16, -90, 'PEA_SHOOTER', false);
          }
        }

        const hitWall =
          this.stateTimer > 80 &&
          ((this.chargeDir < 0 && !!body.blocked?.left) || (this.chargeDir > 0 && !!body.blocked?.right));

        if (hitWall || this.stateTimer >= 950) {
          body.setVelocityX(0);
          this.enterState('OVERHEAT', player);
        }
        break;
      }

      case 'OVERHEAT': {
        body.setVelocityX(0);
        this.applyPulseTint(0x44ddff, 120);
        const overheatMs = this.phase === 2 ? 1150 : 1500;
        if (this.stateTimer >= overheatMs) {
          this.enterState('PATROL', player);
        }
        break;
      }
    }

    if (this.anims && typeof this.anims.play === 'function') {
      const anims = this.scene?.anims || this.scene?.sys?.anims;
      if (anims?.exists?.('boss_drive') && this.anims.currentAnim?.key !== 'boss_drive') {
        this.anims.play('boss_drive', true);
      }
    }

    if (typeof this.setFlipX === 'function') {
      this.setFlipX(this.facingLeft);
    }
  }

  private updatePatrolState(
    delta: number,
    isGrounded: boolean,
    body: Phaser.Physics.Arcade.Body,
    player?: { x: number; y: number }
  ): void {
    if (player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.abs(dx);
      this.facingLeft = dx < 0;

      const baseSpeed = this.phase === 2 ? 140 : 80;
      const speed = dist > 200 ? baseSpeed * 1.3 : baseSpeed;
      const moveDir = dx < -10 ? -1 : dx > 10 ? 1 : 0;

      body.setVelocityX(moveDir * speed);

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
            body.setVelocityY(-340);
            this.jumpTimer = this.jumpCooldownMs;
          } else if (dist > 160) {
            body.setVelocityY(this.phase === 2 ? -300 : -250);
            this.jumpTimer = this.phase === 2 ? 1800 : 2500;
          }
        }
      }

      const patrolDurationMs = this.phase === 2 ? 750 : 1200;
      if (this.stateTimer >= patrolDurationMs) {
        this.startNextAttackPattern(player);
      }
    } else {
      const speed = this.phase === 2 ? 80 : 40;
      this.moveTimer += delta;
      if (this.moveTimer > 2000) {
        this.moveTimer = 0;
        this.moveDirection *= -1;
      }
      body.setVelocityX(speed * this.moveDirection);
    }
  }

  public startNextAttackPattern(player: { x: number; y: number }): void {
    const pattern = BOSS_ATTACK_CYCLE[this.patternIndex % BOSS_ATTACK_CYCLE.length];
    this.patternIndex++;

    switch (pattern) {
      case 'SWEEP':
        this.enterState('SWEEP_TELEGRAPH', player);
        break;
      case 'LEAP':
        this.remainingLeaps = this.phase === 2 ? 1 : 0;
        this.enterState('LEAP_TELEGRAPH', player);
        break;
      case 'CHARGE':
        this.enterState('CHARGE_TELEGRAPH', player);
        break;
    }
  }

  private fireLandingShockwave(projectilePool: ProjectilePool): void {
    const shockwaveY = this.y + 18;
    // Ground-hugging shockwave left and right
    projectilePool.spawn(this.x - 20, shockwaveY, 180, 'PEA_SHOOTER', false);
    projectilePool.spawn(this.x + 20, shockwaveY, 0, 'PEA_SHOOTER', false);

    if (this.phase === 2) {
      // Diagonal shrapnel in Phase 2
      projectilePool.spawn(this.x - 16, shockwaveY - 6, -150, 'PEA_SHOOTER', false);
      projectilePool.spawn(this.x + 16, shockwaveY - 6, -30, 'PEA_SHOOTER', false);
    }
  }
}
