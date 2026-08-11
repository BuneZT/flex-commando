import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { calculateDroneSinePosition, FalconDrone } from '../src/entities/enemies/FalconDrone';
import { EnemyBase } from '../src/entities/enemies/EnemyBase';
import { Trooper } from '../src/entities/enemies/Trooper';
import { Turret } from '../src/entities/enemies/Turret';
import { JumperMercenary } from '../src/entities/enemies/JumperMercenary';
import { Boss } from '../src/entities/enemies/Boss';
import { ProjectilePool } from '../src/weapons/ProjectilePool';

function createMockScene(): Phaser.Scene {
  return {
    sys: {
      queueDepthSort: () => {},
      displayList: { add: () => {} },
      updateList: { add: () => {} },
      anims: { get: () => null, exists: () => false, on: () => {}, once: () => {}, off: () => {} },
      textures: { get: (key?: string) => ({ key: key || '', get: () => ({}) }) },
    },
    add: { existing: () => {} },
    physics: { add: { existing: () => {} } },
  } as unknown as Phaser.Scene;
}

function createMockBody(): Phaser.Physics.Arcade.Body {
  let width = 16;
  let height = 24;
  const velocity = { x: 0, y: 0 };

  return {
    get width() { return width; },
    get height() { return height; },
    velocity,
    setCollideWorldBounds: () => {},
    setImmovable: () => {},
    setSize: (w: number, h: number) => { width = w; height = h; },
    setOffset: () => {},
    setVelocityX: (vx: number) => { velocity.x = vx; },
    setVelocityY: (vy: number) => { velocity.y = vy; },
    setVelocity: (vx: number, vy: number) => { velocity.x = vx; velocity.y = vy; },
    blocked: { down: true, left: false, right: false, up: false },
    touching: { down: true, left: false, right: false, up: false },
  } as unknown as Phaser.Physics.Arcade.Body;
}

describe('FalconDrone Sine Movement', () => {
  it('should calculate y-offset based on sine wave formula', () => {
    const yOffset = calculateDroneSinePosition(0, 10, 1);
    expect(yOffset).toBe(0);
    const peekYOffset = calculateDroneSinePosition(Math.PI / 2, 10, 1);
    expect(peekYOffset).toBeCloseTo(10);
    const troughYOffset = calculateDroneSinePosition(3 * Math.PI / 2, 10, 1);
    expect(troughYOffset).toBeCloseTo(-10);
  });
});

describe('Enemy Classes AI and Damage Behavior', () => {
  it('EnemyBase should take damage and die when health reaches 0', () => {
    const scene = createMockScene();
    const drone = new FalconDrone(scene, 100, 100);
    expect(drone.isAlive).toBe(true);
    expect(drone.health).toBeGreaterThan(0);

    const initialHealth = drone.health;
    const isDead = drone.takeDamage(initialHealth / 2);
    expect(isDead).toBe(false);
    expect(drone.isAlive).toBe(true);

    const lethal = drone.takeDamage(initialHealth);
    expect(lethal).toBe(true);
    expect(drone.isAlive).toBe(false);
  });

  it('Trooper should move toward player and jump when blocked', () => {
    const scene = createMockScene();
    const trooper = new Trooper(scene, 100, 100);
    const body = createMockBody();
    trooper.body = body;

    // Player to the right
    trooper.updateAI(0, 16, { x: 200, y: 100 });
    expect(body.velocity.x).toBeGreaterThan(0);
    expect(trooper.facingLeft).toBe(false);

    // Player to the left
    trooper.updateAI(16, 16, { x: 50, y: 100 });
    expect(body.velocity.x).toBeLessThan(0);
    expect(trooper.facingLeft).toBe(true);

    // Blocked horizontally while grounded -> should jump
    body.blocked.left = true;
    trooper.updateAI(32, 16, { x: 50, y: 100 });
    expect(body.velocity.y).toBeLessThan(0);
  });

  it('Turret should calculate aim angle toward player and shoot using ProjectilePool', () => {
    const scene = createMockScene();
    const turret = new Turret(scene, 100, 100);
    turret.body = createMockBody();
    const projectilePool = new ProjectilePool(scene);

    // Target to the right (angle 0 degrees)
    turret.updateAI(0, 16, { x: 200, y: 100 }, projectilePool);
    expect(turret.aimAngleDeg).toBeCloseTo(0);

    // Force fire timer trigger
    turret.shootTimer = 0;
    turret.updateAI(100, 16, { x: 200, y: 100 }, projectilePool);
    expect(projectilePool.getActiveProjectiles().length).toBe(1);
    const proj = projectilePool.getActiveProjectiles()[0];
    expect(proj.isPlayerBullet).toBe(false);
  });

  it('FalconDrone should update sinusoidal position over time', () => {
    const scene = createMockScene();
    const drone = new FalconDrone(scene, 100, 100, 20, 1);
    drone.body = createMockBody();

    drone.updateAI(0, Math.PI / 2, { x: 50, y: 100 });
    expect(drone.y).toBeCloseTo(120);
  });

  it('JumperMercenary should periodically jump towards player when grounded', () => {
    const scene = createMockScene();
    const jumper = new JumperMercenary(scene, 100, 100);
    const body = createMockBody();
    jumper.body = body;

    jumper.jumpTimer = 0; // ready to jump
    jumper.updateAI(0, 16, { x: 200, y: 100 });
    expect(body.velocity.y).toBeLessThan(0);
    expect(jumper.jumpTimer).toBeGreaterThan(0);
  });

  it('should initialize enemies with default texture keys', () => {
    const scene = createMockScene();
    const trooper = new Trooper(scene, 100, 100);
    const turret = new Turret(scene, 100, 100);
    const drone = new FalconDrone(scene, 100, 100);
    const jumper = new JumperMercenary(scene, 100, 100);
    const boss = new Boss(scene, 100, 100);

    expect(trooper.texture.key).toBe('tex_enemy_trooper');
    expect(turret.texture.key).toBe('tex_enemy_turret');
    expect(drone.texture.key).toBe('tex_enemy_drone');
    expect(jumper.texture.key).toBe('tex_enemy_jumper');
    expect(boss.texture.key).toBe('tex_enemy_boss');
  });
});
