import Phaser from 'phaser';
import { ProjectilePool } from '../../weapons/ProjectilePool';

export abstract class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  public health: number;
  public maxHealth: number;
  public isAlive: boolean = true;
  public scoreValue: number = 100;
  public damageOnContact: number = 1;
  public facingLeft: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = '', health: number = 1) {
    super(scene, x, y, texture);
    this.health = health;
    this.maxHealth = health;

    if (scene.add && typeof scene.add.existing === 'function') {
      scene.add.existing(this);
    }
    if (scene.physics && scene.physics.add && typeof scene.physics.add.existing === 'function') {
      scene.physics.add.existing(this);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(true);
    }
  }

  public takeDamage(amount: number): boolean {
    if (!this.isAlive) return true;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return true;
    }
    return false;
  }

  public die(): void {
    this.isAlive = false;
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
    }
  }

  public abstract updateAI(
    time: number,
    delta: number,
    player?: { x: number; y: number },
    projectilePool?: ProjectilePool
  ): void;
}
