import Phaser from 'phaser';
import { WeaponType, WEAPON_CONFIGS } from './WeaponTypes';
import { SoundManager } from '../core/SoundManager';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  public weaponType: WeaponType = 'PEA_SHOOTER';
  public damage: number = 1;
  public piercing: boolean = false;
  public lifespan: number = 1000;
  public isPlayerBullet: boolean = true;
  private baseAngleRad: number = 0;
  private travelDistance: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = 'tex_bullet_pea') {
    super(scene, x, y, texture);

    if (scene.add && typeof scene.add.existing === 'function') {
      scene.add.existing(this);
    }
    if (scene.physics && scene.physics.add && typeof scene.physics.add.existing === 'function') {
      scene.physics.add.existing(this);
    }

    this.setActive(false);
    this.setVisible(false);
  }

  public fire(x: number, y: number, angleDeg: number, weaponType: WeaponType, isPlayerBullet: boolean = true): void {
    const config = WEAPON_CONFIGS[weaponType] || WEAPON_CONFIGS.PEA_SHOOTER;

    let textureKey = 'tex_bullet_pea';
    if (!isPlayerBullet) {
      textureKey = 'tex_bullet_enemy';
    } else if (weaponType === 'SPREAD_SHOT') {
      textureKey = 'tex_bullet_spread';
    } else if (weaponType === 'LASER') {
      textureKey = 'tex_bullet_laser';
    } else if (weaponType === 'FLAME') {
      textureKey = 'tex_bullet_flame';
    }
    this.setTexture(textureKey);

    this.setPosition(x, y);
    this.weaponType = weaponType;
    this.damage = config.damage;
    this.piercing = config.piercing;
    this.lifespan = config.lifespanMs;
    this.isPlayerBullet = isPlayerBullet;
    this.travelDistance = 0;

    this.setActive(true);
    this.setVisible(true);

    const rad = Phaser.Math.DegToRad(angleDeg);
    this.baseAngleRad = rad;
    this.rotation = rad;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.reset(x, y);
      const velX = Math.cos(rad) * config.speed;
      const velY = Math.sin(rad) * config.speed;
      body.setVelocity(velX, velY);

      // Adjust hitbox size based on weapon type
      if (weaponType === 'LASER') {
        body.setSize(16, 4);
      } else if (weaponType === 'FLAME') {
        body.setSize(12, 12);
      } else {
        body.setSize(6, 6);
      }
    }
  }

  public updateProjectile(
    _time: number,
    delta: number,
    bounds?: { x: number; y: number; width: number; height: number }
  ): void {
    if (!this.active) return;

    this.lifespan -= delta;
    if (this.lifespan <= 0) {
      this.deactivate();
      return;
    }

    const config = WEAPON_CONFIGS[this.weaponType];

    // Special movement behavior for FLAME (spiraling / expanding orb)
    if (this.weaponType === 'FLAME') {
      this.travelDistance += delta * 0.001 * config.speed;
      const perpAngle = this.baseAngleRad + Math.PI / 2;
      const offset = Math.sin(this.travelDistance * 0.1) * 12;

      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        const vx = Math.cos(this.baseAngleRad) * config.speed + Math.cos(perpAngle) * offset * 10;
        const vy = Math.sin(this.baseAngleRad) * config.speed + Math.sin(perpAngle) * offset * 10;
        body.setVelocity(vx, vy);
      }
    }

    // Room bounds check with +32px margin if bounds provided, otherwise fallback to global bounds
    if (bounds) {
      const margin = 32;
      if (
        this.x < bounds.x - margin ||
        this.x > bounds.x + bounds.width + margin ||
        this.y < bounds.y - margin ||
        this.y > bounds.y + bounds.height + margin
      ) {
        this.deactivate();
        return;
      }
    } else if (this.x < -100 || this.x > 3000 || this.y < -100 || this.y > 3000) {
      this.deactivate();
    }
  }

  public deactivate(): void {
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }
  }
}

export class ProjectilePool {
  public scene: Phaser.Scene;
  public pool: Projectile[] = [];
  public maxSize: number;

  constructor(scene: Phaser.Scene, maxSize: number = 100) {
    this.scene = scene;
    this.maxSize = maxSize;
  }

  public spawn(x: number, y: number, angleDeg: number, weaponType: WeaponType, isPlayerBullet: boolean = true): Projectile | null {
    let proj = this.pool.find(p => !p.active);

    if (!proj && this.pool.length < this.maxSize) {
      proj = new Projectile(this.scene, x, y);
      this.pool.push(proj);
    }

    if (proj) {
      proj.fire(x, y, angleDeg, weaponType, isPlayerBullet);
      if (!isPlayerBullet) {
        SoundManager.getInstance().playShoot('ENEMY', false);
      }
      return proj;
    }

    return null;
  }

  public update(time: number, delta: number, bounds?: { x: number; y: number; width: number; height: number }): void {
    for (const proj of this.pool) {
      if (proj.active) {
        proj.updateProjectile(time, delta, bounds);
      }
    }
  }

  public getActiveProjectiles(outArray?: Projectile[]): Projectile[] {
    if (outArray) {
      outArray.length = 0;
      for (const p of this.pool) {
        if (p.active) {
          outArray.push(p);
        }
      }
      return outArray;
    }
    return this.pool.filter(p => p.active);
  }

  public clear(): void {
    for (const proj of this.pool) {
      proj.deactivate();
    }
  }
}
