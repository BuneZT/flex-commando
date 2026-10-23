import Phaser from 'phaser';
import { WeaponType, getRandomPickupWeapon } from '../weapons/WeaponTypes';
import { CombatFX } from '../core/CombatFX';

export type CapsuleDropType = WeaponType | 'HEART';
export const HEART_DROP_CHANCE = 0.25;

export function getRandomCapsuleDrop(rng?: () => number): CapsuleDropType {
  const randomFn = rng || Math.random;
  if (randomFn() < HEART_DROP_CHANCE) {
    return 'HEART';
  }
  return getRandomPickupWeapon(randomFn);
}

export type PickupLetter = 'S' | 'L' | 'M' | 'F' | 'B' | 'H';

export function weaponTypeToLetter(weaponType: WeaponType): PickupLetter {
  switch (weaponType) {
    case 'SPREAD_SHOT': return 'S';
    case 'LASER': return 'L';
    case 'MACHINE_GUN': return 'M';
    case 'FLAME': return 'F';
    case 'BARRIER': return 'B';
    default: return 'S';
  }
}

export function letterToWeaponType(letter: PickupLetter): WeaponType {
  switch (letter) {
    case 'S': return 'SPREAD_SHOT';
    case 'L': return 'LASER';
    case 'M': return 'MACHINE_GUN';
    case 'F': return 'FLAME';
    case 'B': return 'BARRIER';
    case 'H': return 'SPREAD_SHOT';
    default: return 'SPREAD_SHOT';
  }
}

export class PickupItem extends Phaser.Physics.Arcade.Sprite {
  public dropType: CapsuleDropType = 'SPREAD_SHOT';
  public weaponType: WeaponType = 'SPREAD_SHOT';
  public letter: PickupLetter = 'S';

  constructor(scene: Phaser.Scene, x: number, y: number, dropType: CapsuleDropType = 'SPREAD_SHOT') {
    const isHeart = dropType === 'HEART';
    const letter = isHeart ? 'H' : weaponTypeToLetter(dropType);
    const hasPickupsSheet = Boolean(scene?.textures?.exists?.('tex_pickups'));
    super(scene, x, y, hasPickupsSheet ? 'tex_pickups' : `tex_pickup_${letter}`);

    if (scene.add && typeof scene.add.existing === 'function') {
      scene.add.existing(this);
    }
    if (scene.physics && scene.physics.add && typeof scene.physics.add.existing === 'function') {
      scene.physics.add.existing(this);
    }

    this.initPickup(x, y, dropType);
  }

  public initPickup(x: number, y: number, dropType: CapsuleDropType): void {
    this.setPosition(x, y);
    this.dropType = dropType;
    if (dropType === 'HEART') {
      this.letter = 'H';
      this.weaponType = 'SPREAD_SHOT';
    } else {
      this.weaponType = dropType;
      this.letter = weaponTypeToLetter(dropType);
    }

    if (this.scene?.textures?.exists?.('tex_pickups')) {
      let badgeFrame = 2;
      if (dropType === 'HEART') {
        badgeFrame = 7;
      } else {
        switch (this.letter) {
          case 'S':
            badgeFrame = 2;
            break;
          case 'L':
            badgeFrame = 3;
            break;
          case 'F':
            badgeFrame = 4;
            break;
          case 'M':
            badgeFrame = 5;
            break;
          case 'B':
            badgeFrame = 6;
            break;
        }
      }
      this.setTexture('tex_pickups', badgeFrame);
    } else {
      this.setTexture(`tex_pickup_${this.letter}`);
    }

    this.setActive(true);
    this.setVisible(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      if (typeof body.reset === 'function') body.reset(x, y);
      if (typeof body.setSize === 'function') body.setSize(14, 14);
      if (typeof body.setOffset === 'function') body.setOffset(1, 1);
      if (typeof body.setGravityY === 'function') body.setGravityY(100); // Gently falls to ground
      if (typeof body.setVelocityY === 'function') body.setVelocityY(20);
      if (typeof body.setBounce === 'function') body.setBounce(0.4, 0.4);
    }
  }

  public collect(): CapsuleDropType {
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      if (typeof body.setVelocity === 'function') body.setVelocity(0, 0);
    }

    return this.dropType;
  }
}

export class PickupCapsule extends Phaser.Physics.Arcade.Sprite {
  public dropType: CapsuleDropType = 'SPREAD_SHOT';
  public get weaponType(): WeaponType {
    return this.dropType === 'HEART' ? 'SPREAD_SHOT' : this.dropType;
  }
  public set weaponType(w: WeaponType) {
    this.dropType = w;
  }
  public speed: number = 60;
  public hp: number = 1;
  private flightTime: number = 0;
  private startY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, dropType: CapsuleDropType = 'SPREAD_SHOT', texture?: string) {
    const hasPickupsSheet = Boolean(scene?.textures?.exists?.('tex_pickups'));
    const defaultTexture = hasPickupsSheet ? 'tex_pickups' : 'tex_capsule_flying';
    super(scene, x, y, texture || defaultTexture);

    if (hasPickupsSheet && (!texture || texture === 'tex_pickups')) {
      if (typeof this.setFrame === 'function') {
        this.setFrame(0);
      }
    }

    if (scene.add && typeof scene.add.existing === 'function') {
      scene.add.existing(this);
    }
    if (scene.physics && scene.physics.add && typeof scene.physics.add.existing === 'function') {
      scene.physics.add.existing(this);
    }

    if (this.anims && typeof this.anims.play === 'function') {
      const animsManager = scene.anims || scene.sys?.anims;
      if (animsManager && typeof animsManager.exists === 'function' && animsManager.exists('capsule_spin')) {
        this.anims.play('capsule_spin', true);
      }
    }

    this.spawnCapsule(x, y, dropType);
  }

  public spawnCapsule(x: number, y: number, dropType: CapsuleDropType): void {
    this.setPosition(x, y);
    this.startY = y;
    this.dropType = dropType;
    this.hp = 1;
    this.flightTime = 0;

    this.setActive(true);
    this.setVisible(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      if (typeof body.reset === 'function') body.reset(x, y);
      if (typeof body.setAllowGravity === 'function') body.setAllowGravity(false);
      if (typeof body.setSize === 'function') body.setSize(20, 12);
      if (typeof body.setOffset === 'function') body.setOffset(0, 2);
      if (typeof body.setVelocityX === 'function') body.setVelocityX(this.speed);
    }
  }

  public updateCapsule(_time: number, delta: number): void {
    if (!this.active) return;

    this.flightTime += delta * 0.003;
    const waveY = Math.sin(this.flightTime) * 15;
    this.setY(this.startY + waveY);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body && typeof body.setVelocityX === 'function') {
      body.setVelocityX(this.speed);
    }

    // World bounds check (level width is 1280px)
    if (this.x < -50 || this.x > 1400) {
      this.setActive(false);
      this.setVisible(false);
      if (body) {
        body.enable = false;
        if (typeof body.setVelocity === 'function') body.setVelocity(0, 0);
      }
    }
  }

  public hit(): PickupItem | null {
    if (this.hp <= 0) return null;
    this.hp -= 1;
    if (this.hp <= 0) {
      CombatFX.spawnDeathExplosion(this.scene, this.x, this.y, 1.0);
      return this.destroyAndDrop();
    }
    CombatFX.applyHitFlash(this, 90);
    return null;
  }

  public destroyAndDrop(): PickupItem {
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      if (typeof body.setVelocity === 'function') body.setVelocity(0, 0);
    }

    return new PickupItem(this.scene, this.x, this.y, this.dropType);
  }
}
