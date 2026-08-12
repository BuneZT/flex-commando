import Phaser from 'phaser';
import { WeaponType } from '../weapons/WeaponTypes';

export type PickupLetter = 'S' | 'L' | 'M' | 'F' | 'B';

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
  }
}

export class PickupItem extends Phaser.Physics.Arcade.Sprite {
  public weaponType: WeaponType = 'SPREAD_SHOT';
  public letter: PickupLetter = 'S';

  constructor(scene: Phaser.Scene, x: number, y: number, weaponType: WeaponType = 'SPREAD_SHOT') {
    const letter = weaponTypeToLetter(weaponType);
    super(scene, x, y, `tex_pickup_${letter}`);

    if (scene.add && typeof scene.add.existing === 'function') {
      scene.add.existing(this);
    }
    if (scene.physics && scene.physics.add && typeof scene.physics.add.existing === 'function') {
      scene.physics.add.existing(this);
    }

    this.initPickup(x, y, weaponType);
  }

  public initPickup(x: number, y: number, weaponType: WeaponType): void {
    this.setPosition(x, y);
    this.weaponType = weaponType;
    this.letter = weaponTypeToLetter(weaponType);
    this.setTexture(`tex_pickup_${this.letter}`);
    this.setActive(true);
    this.setVisible(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.reset(x, y);
      body.setSize(14, 14);
      body.setGravityY(100); // Gently falls to ground
      body.setVelocityY(20);
      body.setBounce(0.4, 0.4);
    }
  }

  public collect(): WeaponType {
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }

    return this.weaponType;
  }
}

export class PickupCapsule extends Phaser.Physics.Arcade.Sprite {
  public weaponType: WeaponType = 'SPREAD_SHOT';
  public speed: number = 60;
  public hp: number = 1;
  private flightTime: number = 0;
  private startY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, weaponType: WeaponType = 'SPREAD_SHOT', texture: string = 'tex_capsule_flying') {
    super(scene, x, y, texture);

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

    this.spawnCapsule(x, y, weaponType);
  }

  public spawnCapsule(x: number, y: number, weaponType: WeaponType): void {
    this.setPosition(x, y);
    this.startY = y;
    this.weaponType = weaponType;
    this.hp = 1;
    this.flightTime = 0;

    this.setActive(true);
    this.setVisible(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.reset(x, y);
      body.setAllowGravity(false);
      body.setSize(20, 12);
      body.setVelocityX(this.speed);
    }
  }

  public updateCapsule(_time: number, delta: number): void {
    if (!this.active) return;

    this.flightTime += delta * 0.003;
    const waveY = Math.sin(this.flightTime) * 15;
    this.setY(this.startY + waveY);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocityX(this.speed);
    }

    // World bounds check (level width is 1280px)
    if (this.x < -50 || this.x > 1400) {
      this.setActive(false);
      this.setVisible(false);
      if (body) body.enable = false;
    }
  }

  public hit(): PickupItem | null {
    this.hp -= 1;
    if (this.hp <= 0) {
      return this.destroyAndDrop();
    }
    return null;
  }

  public destroyAndDrop(): PickupItem {
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }

    return new PickupItem(this.scene, this.x, this.y, this.weaponType);
  }
}
