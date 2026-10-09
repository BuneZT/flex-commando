import Phaser from 'phaser';
import {
  AimDirection,
  calculateAimDirection,
  getAimAngleDegrees,
  calculateMouseAimAngle,
  calculateFacingDirection,
} from './PlayerAim';
import { RawInputState } from '../config/Controls';
import { WeaponType, getSpreadShotAngles, WEAPON_CONFIGS } from '../weapons/WeaponTypes';
import { ProjectilePool } from '../weapons/ProjectilePool';
import { SoundManager } from '../core/SoundManager';

export type MuzzleAimState =
  | AimDirection
  | {
      aimDirection?: AimDirection;
      facingLeft?: boolean;
      isCrouching?: boolean;
    };

export class Player extends Phaser.Physics.Arcade.Sprite {
  public aimDirection: AimDirection = 'FORWARD';
  public aimAngle: number = 0;
  public facingLeft: boolean = false;
  public isCrouching: boolean = false;
  public isUsingMouseAim: boolean = false;
  public lives: number = 3;
  public moveSpeed: number = 120;
  public jumpVelocity: number = -340;
  public isDroppingThrough: boolean = false;
  private dropThroughTimer: number = 0;

  // Weapon System & Barrier
  public currentWeapon: WeaponType = 'PEA_SHOOTER';
  public shootTimer: number = 0;
  public barrierHits: number = 0;
  public isBarrierActive: boolean = false;

  private muzzlePos: { x: number; y: number } = { x: 0, y: 0 };

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
      if (typeof body.setCollideWorldBounds === 'function') {
        body.setCollideWorldBounds(true);
      }
      if (typeof body.setSize === 'function') {
        body.setSize(16, 22);
      }
      if (typeof body.setOffset === 'function') {
        body.setOffset(4, 2);
      }
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

    const isGrounded = Boolean(body.blocked?.down || body.touching?.down);

    // Crouch state: Grounded and pressing down without horizontal movement, not dropping through
    this.isCrouching = isGrounded && Boolean(input.down) && !input.left && !input.right && !this.isDroppingThrough;

    // Update Facing Direction and Aim Angle
    if (input.mouseX !== undefined && input.mouseY !== undefined) {
      this.isUsingMouseAim = true;
      this.facingLeft = calculateFacingDirection(this.x, input.mouseX, this.facingLeft);
      this.aimAngle = calculateMouseAimAngle(this.x, this.y - 4, input.mouseX, input.mouseY);
      this.aimDirection = calculateAimDirection(
        Boolean(input.up),
        Boolean(input.down),
        Boolean(input.left),
        Boolean(input.right)
      );
    } else {
      this.isUsingMouseAim = false;
      if (input.left && !input.right) {
        this.facingLeft = true;
      } else if (input.right && !input.left) {
        this.facingLeft = false;
      }
      this.aimDirection = calculateAimDirection(
        Boolean(input.up),
        Boolean(input.down),
        Boolean(input.left),
        Boolean(input.right)
      );
      this.aimAngle = getAimAngleDegrees(this.aimDirection, this.facingLeft);
    }

    if (typeof this.setFlipX === 'function') {
      this.setFlipX(this.facingLeft);
    }

    // Play corresponding animation if registered; otherwise fallback to appropriate frame
    if (this.anims && typeof this.anims.play === 'function') {
      const targetAnim = !isGrounded
        ? 'player_jump'
        : this.isCrouching
        ? 'player_crouch'
        : (input.left || input.right ? 'player_run' : 'player_idle');

      const animsManager = this.scene?.anims || this.scene?.sys?.anims;
      const animExists = animsManager && typeof animsManager.exists === 'function'
        ? animsManager.exists(targetAnim)
        : false;

      if (animExists) {
        if (this.anims.currentAnim?.key !== targetAnim) {
          this.anims.play(targetAnim, true);
        }
      } else if (typeof this.setFrame === 'function') {
        const fallbackFrame = !isGrounded ? 3 : (this.isCrouching ? 4 : (input.left || input.right ? 1 : 0));
        this.setFrame(fallbackFrame);
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
    } else if (isGrounded && input.jumpJustPressed) {
      // Regular Jump
      if (typeof body.setVelocityY === 'function') {
        body.setVelocityY(this.jumpVelocity);
      }
    }

    // Adjust Hitbox size based on crouch vs standing
    if (this.isCrouching) {
      if (typeof body.setSize === 'function') {
        body.setSize(16, 14);
      }
      if (typeof body.setOffset === 'function') {
        body.setOffset(4, 10);
      }
    } else {
      if (typeof body.setSize === 'function') {
        body.setSize(16, 22);
      }
      if (typeof body.setOffset === 'function') {
        body.setOffset(4, 2);
      }
    }

    // Horizontal Movement
    if (this.isCrouching) {
      if (typeof body.setVelocityX === 'function') {
        body.setVelocityX(0);
      }
    } else if (input.left) {
      if (typeof body.setVelocityX === 'function') {
        body.setVelocityX(-this.moveSpeed);
      }
    } else if (input.right) {
      if (typeof body.setVelocityX === 'function') {
        body.setVelocityX(this.moveSpeed);
      }
    } else {
      if (typeof body.setVelocityX === 'function') {
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
      for (let i = 0; i < angles.length; i++) {
        projectilePool.spawn(muzzle.x, muzzle.y, angles[i], 'SPREAD_SHOT', true);
      }
      SoundManager.getInstance().playShoot('SPREAD_SHOT', true);
    } else {
      projectilePool.spawn(muzzle.x, muzzle.y, aimAngle, this.currentWeapon, true);
      SoundManager.getInstance().playShoot(this.currentWeapon, true);
    }

    this.shootTimer = stats.fireRateMs;
  }

  public getAimAngle(): number {
    return this.aimAngle;
  }

  public getMuzzleOffset(aimState?: MuzzleAimState): { x: number; y: number } {
    let dir: AimDirection = this.aimDirection;
    let facingLeft: boolean = this.facingLeft;
    let crouching: boolean = this.isCrouching;

    if (typeof aimState === 'string') {
      dir = aimState;
    } else if (aimState && typeof aimState === 'object') {
      if (aimState.aimDirection !== undefined) dir = aimState.aimDirection;
      if (aimState.facingLeft !== undefined) facingLeft = aimState.facingLeft;
      if (aimState.isCrouching !== undefined) crouching = aimState.isCrouching;
    }

    if (crouching) {
      return { x: facingLeft ? -12 : 12, y: 2 };
    }

    switch (dir) {
      case 'UP':
        return { x: facingLeft ? -2 : 2, y: -16 };
      case 'UP_FORWARD':
        return { x: facingLeft ? -9 : 9, y: -12 };
      case 'DOWN':
        return { x: facingLeft ? -2 : 2, y: 8 };
      case 'DOWN_FORWARD':
        return { x: facingLeft ? -9 : 9, y: 4 };
      case 'FORWARD':
      default:
        return { x: facingLeft ? -12 : 12, y: -4 };
    }
  }

  public getMuzzlePosition(): { x: number; y: number } {
    if (this.isUsingMouseAim && !this.isCrouching) {
      const angleRad = Phaser.Math.DegToRad(this.aimAngle);
      this.muzzlePos.x = this.x + Math.cos(angleRad) * 12;
      this.muzzlePos.y = this.y - 4 + Math.sin(angleRad) * 12;
      return this.muzzlePos;
    }
    const offset = this.getMuzzleOffset();
    this.muzzlePos.x = this.x + offset.x;
    this.muzzlePos.y = this.y + offset.y;
    return this.muzzlePos;
  }
}
