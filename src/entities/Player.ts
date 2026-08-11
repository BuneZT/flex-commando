import Phaser from 'phaser';
import { AimDirection, calculateAimDirection, getAimAngleDegrees } from './PlayerAim';
import { RawInputState } from '../config/Controls';
import { WeaponType, getSpreadShotAngles, WEAPON_CONFIGS } from '../weapons/WeaponTypes';
import { ProjectilePool } from '../weapons/ProjectilePool';
import { SoundManager } from '../core/SoundManager';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public aimDirection: AimDirection = 'FORWARD';
  public facingLeft: boolean = false;
  public lives: number = 3;
  public moveSpeed: number = 120;
  public jumpVelocity: number = -340;
  public isCrouching: boolean = false;
  public isDroppingThrough: boolean = false;
  private dropThroughTimer: number = 0;

  // Weapon System & Barrier
  public currentWeapon: WeaponType = 'PEA_SHOOTER';
  public shootTimer: number = 0;
  public barrierHits: number = 0;
  public isBarrierActive: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'tex_player') {
    super(scene, x, y, texture);
    if (scene.add && typeof scene.add.existing === 'function') {
      scene.add.existing(this);
    }
    if (scene.physics && scene.physics.add && typeof scene.physics.add.existing === 'function') {
      scene.physics.add.existing(this);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(true);
      body.setSize(16, 24);
      body.setOffset(0, 0);
    }
  }

  public equipWeapon(weaponType: WeaponType): void {
    if (weaponType === 'BARRIER') {
      this.isBarrierActive = true;
      this.barrierHits = 3;
    } else {
      this.currentWeapon = weaponType;
    }
  }

  public hitBarrier(): boolean {
    if (this.isBarrierActive && this.barrierHits > 0) {
      this.barrierHits -= 1;
      if (this.barrierHits <= 0) {
        this.isBarrierActive = false;
      }
      return true; // Hit absorbed
    }
    return false; // No barrier to absorb hit
  }

  public updatePlayer(input: RawInputState, delta: number = 16, projectilePool?: ProjectilePool): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    const isGrounded = body.blocked?.down || body.touching?.down || false;

    // Update Facing Direction
    if (input.left && !input.right) {
      this.facingLeft = true;
    } else if (input.right && !input.left) {
      this.facingLeft = false;
    }

    if (typeof this.setFlipX === 'function') {
      this.setFlipX(this.facingLeft);
    }

    // Calculate Aim Direction
    this.aimDirection = calculateAimDirection({
      up: input.up,
      down: input.down,
      left: input.left,
      right: input.right,
      isGrounded,
      facingLeft: this.facingLeft,
    });

    this.isCrouching = this.aimDirection === 'CROUCH';

    if (this.anims && typeof this.anims.play === 'function') {
      if (this.isCrouching) {
        this.anims.play('player_crouch', true);
      } else if (!isGrounded) {
        this.anims.play('player_jump', true);
      } else if (input.left || input.right) {
        this.anims.play('player_run', true);
      } else {
        this.anims.play('player_idle', true);
      }
    }

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

    // Handle Drop-Through platform trigger
    if (isGrounded && input.down && input.jumpJustPressed) {
      this.isDroppingThrough = true;
      this.dropThroughTimer = 250; // ms to pass through one-way platform
      if (body.checkCollision) {
        body.checkCollision.down = false;
      }
    } else if (isGrounded && input.jumpJustPressed && !this.isCrouching) {
      // Regular Jump
      body.setVelocityY(this.jumpVelocity);
    }

    // Horizontal Movement
    if (this.isCrouching) {
      body.setVelocityX(0);
      body.setSize(16, 12);
      body.setOffset(0, 12);
    } else {
      body.setSize(16, 24);
      body.setOffset(0, 0);

      if (input.left) {
        body.setVelocityX(-this.moveSpeed);
      } else if (input.right) {
        body.setVelocityX(this.moveSpeed);
      } else {
        body.setVelocityX(0);
      }
    }

    // Shooting System
    if (this.shootTimer > 0) {
      this.shootTimer -= delta;
    }

    const wantsToShoot = this.currentWeapon === 'MACHINE_GUN'
      ? input.shoot
      : (input.shootJustPressed || input.shoot);

    if (wantsToShoot && this.shootTimer <= 0 && projectilePool) {
      this.shoot(projectilePool);
    }
  }

  public shoot(projectilePool: ProjectilePool): void {
    const muzzle = this.getMuzzlePosition();
    const aimAngle = this.getAimAngle();
    const stats = WEAPON_CONFIGS[this.currentWeapon] || WEAPON_CONFIGS.PEA_SHOOTER;

    if (this.currentWeapon === 'SPREAD_SHOT') {
      const angles = getSpreadShotAngles(aimAngle);
      for (const angle of angles) {
        projectilePool.spawn(muzzle.x, muzzle.y, angle, 'SPREAD_SHOT', true);
      }
      SoundManager.getInstance().playShoot('SPREAD_SHOT', true);
    } else {
      projectilePool.spawn(muzzle.x, muzzle.y, aimAngle, this.currentWeapon, true);
      SoundManager.getInstance().playShoot(this.currentWeapon, true);
    }

    this.shootTimer = stats.fireRateMs;
  }

  public getAimAngle(): number {
    return getAimAngleDegrees(this.aimDirection, this.facingLeft);
  }

  public getMuzzlePosition(): { x: number; y: number } {
    const angleDeg = this.getAimAngle();
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const offsetX = Math.cos(angleRad) * 12;
    const offsetY = Math.sin(angleRad) * 12;
    const spawnY = this.isCrouching ? this.y + 4 : this.y - 4;
    return {
      x: this.x + offsetX,
      y: spawnY + offsetY,
    };
  }
}
