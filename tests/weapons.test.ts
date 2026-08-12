import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { getSpreadShotAngles, WEAPON_CONFIGS, WeaponType } from '../src/weapons/WeaponTypes';
import { Projectile, ProjectilePool } from '../src/weapons/ProjectilePool';
import { PickupCapsule, PickupItem, weaponTypeToLetter, letterToWeaponType } from '../src/entities/PickupCapsule';
import { Player } from '../src/entities/Player';
import { RawInputState } from '../src/config/Controls';

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
  let velX = 0;
  let velY = 0;
  let enable = true;

  return {
    get width() { return width; },
    get height() { return height; },
    get velocityX() { return velX; },
    get velocityY() { return velY; },
    get enable() { return enable; },
    set enable(val: boolean) { enable = val; },
    setCollideWorldBounds: () => {},
    setSize: (w: number, h: number) => { width = w; height = h; },
    setOffset: () => {},
    setAllowGravity: () => {},
    setGravityY: () => {},
    setBounce: () => {},
    setVelocity: (vx: number, vy: number) => { velX = vx; velY = vy; },
    setVelocityX: (vx: number) => { velX = vx; },
    setVelocityY: (vy: number) => { velY = vy; },
    reset: () => {},
    blocked: { down: true },
    touching: { down: true },
    checkCollision: { down: true },
  } as unknown as Phaser.Physics.Arcade.Body;
}

describe('SpreadShot Angles', () => {
  it('should return 5 spread angles centered around target angle', () => {
    const angles = getSpreadShotAngles(0); // Aiming right (0 degrees)
    expect(angles.length).toBe(5);
    expect(angles).toEqual([-30, -15, 0, 15, 30]);
  });

  it('should handle non-zero base angles correctly', () => {
    const anglesUp = getSpreadShotAngles(-90); // Aiming straight up (-90 degrees)
    expect(anglesUp).toEqual([-120, -105, -90, -75, -60]);

    const anglesLeft = getSpreadShotAngles(180); // Aiming left (180 degrees)
    expect(anglesLeft).toEqual([150, 165, 180, 195, 210]);
  });
});

describe('Weapon Configurations & Letter Conversion', () => {
  it('should define configs for all 6 weapon types', () => {
    const types: WeaponType[] = ['PEA_SHOOTER', 'SPREAD_SHOT', 'LASER', 'MACHINE_GUN', 'FLAME', 'BARRIER'];
    for (const t of types) {
      expect(WEAPON_CONFIGS[t]).toBeDefined();
    }
  });

  it('should convert weapon types to letters and back correctly', () => {
    expect(weaponTypeToLetter('SPREAD_SHOT')).toBe('S');
    expect(weaponTypeToLetter('LASER')).toBe('L');
    expect(weaponTypeToLetter('MACHINE_GUN')).toBe('M');
    expect(weaponTypeToLetter('FLAME')).toBe('F');
    expect(weaponTypeToLetter('BARRIER')).toBe('B');

    expect(letterToWeaponType('S')).toBe('SPREAD_SHOT');
    expect(letterToWeaponType('L')).toBe('LASER');
    expect(letterToWeaponType('M')).toBe('MACHINE_GUN');
    expect(letterToWeaponType('F')).toBe('FLAME');
    expect(letterToWeaponType('B')).toBe('BARRIER');
  });
});

describe('ProjectilePool', () => {
  it('should spawn projectiles and recycle inactive ones', () => {
    const mockScene = createMockScene();
    const pool = new ProjectilePool(mockScene, 10);

    const proj1 = pool.spawn(100, 100, 0, 'PEA_SHOOTER');
    expect(proj1).not.toBeNull();
    expect(proj1?.active).toBe(true);
    expect(pool.getActiveProjectiles().length).toBe(1);

    proj1?.deactivate();
    expect(proj1?.active).toBe(false);
    expect(pool.getActiveProjectiles().length).toBe(0);

    const proj2 = pool.spawn(200, 200, 90, 'LASER');
    expect(proj2).toBe(proj1); // Recycled
    expect(proj2?.weaponType).toBe('LASER');
    expect(proj2?.x).toBe(200);
    expect(proj2?.y).toBe(200);
  });

  it('should update active projectiles and deactivate when lifespan expires', () => {
    const mockScene = createMockScene();
    const pool = new ProjectilePool(mockScene, 10);

    const proj = pool.spawn(100, 100, 0, 'PEA_SHOOTER');
    if (proj) proj.body = createMockBody();

    expect(pool.getActiveProjectiles().length).toBe(1);

    // Update pool beyond lifespan (PEA_SHOOTER lifespan is 1200ms)
    pool.update(0, 1300);
    expect(pool.getActiveProjectiles().length).toBe(0);
  });

  it('should populate provided buffer in-place when getActiveProjectiles is passed an array', () => {
    const mockScene = createMockScene();
    const pool = new ProjectilePool(mockScene, 10);

    const proj1 = pool.spawn(100, 100, 0, 'PEA_SHOOTER');
    const proj2 = pool.spawn(150, 150, 0, 'LASER');

    const buffer: Projectile[] = [new Projectile(mockScene, 0, 0)];
    const res = pool.getActiveProjectiles(buffer);

    expect(res).toBe(buffer);
    expect(buffer.length).toBe(2);
    expect(buffer[0]).toBe(proj1);
    expect(buffer[1]).toBe(proj2);

    proj1?.deactivate();
    pool.getActiveProjectiles(buffer);
    expect(buffer.length).toBe(1);
    expect(buffer[0]).toBe(proj2);
  });
});

describe('PickupCapsule', () => {
  it('should move horizontally and drop item upon hit', () => {
    const mockScene = createMockScene();
    const capsule = new PickupCapsule(mockScene, 100, 100, 'SPREAD_SHOT');
    capsule.body = createMockBody();

    expect(capsule.active).toBe(true);
    expect(capsule.weaponType).toBe('SPREAD_SHOT');

    const droppedItem = capsule.hit();
    expect(droppedItem).not.toBeNull();
    expect(droppedItem?.letter).toBe('S');
    expect(droppedItem?.weaponType).toBe('SPREAD_SHOT');
    expect(capsule.active).toBe(false);
  });
});

describe('Player Weapon & Barrier Integration', () => {
  it('should equip weapons and spawn projectiles on shoot', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    player.body = createMockBody();
    const pool = new ProjectilePool(mockScene, 20);

    const input: RawInputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      jump: false,
      jumpJustPressed: false,
      shoot: true,
      shootJustPressed: true,
    };

    // Default PEA_SHOOTER
    player.updatePlayer(input, 16, pool);
    expect(pool.getActiveProjectiles().length).toBe(1);
    expect(pool.getActiveProjectiles()[0].weaponType).toBe('PEA_SHOOTER');

    pool.clear();

    // SPREAD_SHOT
    player.equipWeapon('SPREAD_SHOT');
    player.shootTimer = 0;
    player.updatePlayer(input, 16, pool);
    expect(pool.getActiveProjectiles().length).toBe(5); // 5 pellets
    const angles = pool.getActiveProjectiles().map(p => Math.round(Phaser.Math.RadToDeg(p.rotation)));
    expect(angles).toEqual([-30, -15, 0, 15, 30]);
  });

  it('should activate barrier and absorb up to 3 hits', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);

    player.equipWeapon('BARRIER');
    expect(player.isBarrierActive).toBe(true);
    expect(player.barrierHits).toBe(3);

    expect(player.hitBarrier()).toBe(true); // Hit 1
    expect(player.barrierHits).toBe(2);

    expect(player.hitBarrier()).toBe(true); // Hit 2
    expect(player.hitBarrier()).toBe(true); // Hit 3
    expect(player.isBarrierActive).toBe(false);
    expect(player.barrierHits).toBe(0);

    expect(player.hitBarrier()).toBe(false); // No barrier left
  });
});

describe('Procedural Textures for Projectiles and Pickups', () => {
  it('should assign correct bullet texture keys on Projectile.fire', () => {
    const mockScene = createMockScene();
    const proj = new Projectile(mockScene, 0, 0);

    proj.fire(0, 0, 0, 'PEA_SHOOTER', true);
    expect(proj.texture.key).toBe('tex_bullet_pea');

    proj.fire(0, 0, 0, 'SPREAD_SHOT', true);
    expect(proj.texture.key).toBe('tex_bullet_spread');

    proj.fire(0, 0, 0, 'LASER', true);
    expect(proj.texture.key).toBe('tex_bullet_laser');

    proj.fire(0, 0, 0, 'FLAME', true);
    expect(proj.texture.key).toBe('tex_bullet_flame');

    proj.fire(0, 0, 0, 'MACHINE_GUN', true);
    expect(proj.texture.key).toBe('tex_bullet_pea');

    proj.fire(0, 0, 0, 'SPREAD_SHOT', false);
    expect(proj.texture.key).toBe('tex_bullet_enemy');
  });

  it('should assign default flying capsule texture to PickupCapsule', () => {
    const mockScene = createMockScene();
    const capsule = new PickupCapsule(mockScene, 100, 100, 'SPREAD_SHOT');
    expect(capsule.texture.key).toBe('tex_capsule_flying');
  });

  it('should assign letter badge textures to PickupItem based on weapon type', () => {
    const mockScene = createMockScene();

    const spreadItem = new PickupItem(mockScene, 0, 0, 'SPREAD_SHOT');
    expect(spreadItem.texture.key).toBe('tex_pickup_S');

    const laserItem = new PickupItem(mockScene, 0, 0, 'LASER');
    expect(laserItem.texture.key).toBe('tex_pickup_L');

    const flameItem = new PickupItem(mockScene, 0, 0, 'FLAME');
    expect(flameItem.texture.key).toBe('tex_pickup_F');

    const machineGunItem = new PickupItem(mockScene, 0, 0, 'MACHINE_GUN');
    expect(machineGunItem.texture.key).toBe('tex_pickup_M');

    const barrierItem = new PickupItem(mockScene, 0, 0, 'BARRIER');
    expect(barrierItem.texture.key).toBe('tex_pickup_B');
  });
});

