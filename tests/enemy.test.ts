import { describe, it, expect, vi } from 'vitest';
import Phaser from 'phaser';
import { calculateDroneSinePosition, FalconDrone } from '../src/entities/enemies/FalconDrone';
import { EnemyBase } from '../src/entities/enemies/EnemyBase';
import { Trooper } from '../src/entities/enemies/Trooper';
import { Turret } from '../src/entities/enemies/Turret';
import { JumperMercenary } from '../src/entities/enemies/JumperMercenary';
import { Boss } from '../src/entities/enemies/Boss';
import { ProjectilePool } from '../src/weapons/ProjectilePool';
import { CombatFX } from '../src/core/CombatFX';

function createMockBody(): Phaser.Physics.Arcade.Body {
  let width = 0;
  let height = 0;
  let offsetX = 0;
  let offsetY = 0;
  let enable = true;
  const velocity = { x: 0, y: 0 };

  return {
    get width() { return width; },
    get height() { return height; },
    get offset() { return { x: offsetX, y: offsetY }; },
    get enable() { return enable; },
    set enable(val: boolean) { enable = val; },
    velocity,
    setCollideWorldBounds: () => {},
    setImmovable: () => {},
    setAllowGravity: () => {},
    reset: (_x?: number, _y?: number) => {},
    setSize: (w: number, h: number) => { width = w; height = h; },
    setOffset: (x: number, y: number) => { offsetX = x; offsetY = y; },
    setVelocityX: (vx: number) => { velocity.x = vx; },
    setVelocityY: (vy: number) => { velocity.y = vy; },
    setVelocity: (vx: number, vy: number) => { velocity.x = vx; velocity.y = vy; },
    blocked: { down: true, left: false, right: false, up: false },
    touching: { down: true, left: false, right: false, up: false },
    checkCollision: { none: false, up: true, down: true, left: true, right: true },
  } as unknown as Phaser.Physics.Arcade.Body;
}

function createMockScene(): Phaser.Scene {
  const anims = { get: () => null, exists: () => false, on: () => {}, once: () => {}, off: () => {} };
  return {
    anims,
    sys: {
      queueDepthSort: () => {},
      displayList: { add: () => {} },
      updateList: { add: () => {} },
      anims,
      textures: { get: (key?: string) => ({ key: key || '', get: () => ({}) }) },
    },
    add: { existing: () => {} },
    physics: {
      add: {
        existing: (obj: any) => {
          if (!obj.body) {
            obj.body = createMockBody();
          }
        },
      },
    },
  } as unknown as Phaser.Scene;
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

  it('EnemyBase should trigger CombatFX.applyHitFlash on non-lethal damage', () => {
    const scene = createMockScene();
    const flashSpy = vi.spyOn(CombatFX, 'applyHitFlash');
    const trooper = new Trooper(scene, 100, 100);
    trooper.health = 5;
    trooper.maxHealth = 5;

    const killed = trooper.takeDamage(1);

    expect(killed).toBe(false);
    expect(flashSpy).toHaveBeenCalledWith(trooper, 90);
    flashSpy.mockRestore();
  });

  it('EnemyBase should trigger CombatFX.spawnDeathExplosion with explosionScale on lethal damage', () => {
    const scene = createMockScene();
    const explosionSpy = vi.spyOn(CombatFX, 'spawnDeathExplosion');
    const trooper = new Trooper(scene, 100, 100);
    trooper.health = 1;

    const killed = trooper.takeDamage(1);

    expect(killed).toBe(true);
    expect(trooper.isAlive).toBe(false);
    expect(explosionSpy).toHaveBeenCalledWith(trooper.scene, trooper.x, trooper.y, 1.0);
    explosionSpy.mockRestore();
  });

  it('Boss should use explosionScale 2.0 upon lethal damage', () => {
    const scene = createMockScene();
    const explosionSpy = vi.spyOn(CombatFX, 'spawnDeathExplosion');
    const boss = new Boss(scene, 200, 200, 1);

    boss.takeDamage(1);

    expect(explosionSpy).toHaveBeenCalledWith(boss.scene, boss.x, boss.y, 2.0);
    explosionSpy.mockRestore();
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

  it('FalconDrone should update direct physics velocity over time', () => {
    const scene = createMockScene();
    const drone = new FalconDrone(scene, 100, 100, 20, 0.003);
    const body = createMockBody();
    drone.body = body;

    drone.updateAI(0, 100, { x: 50, y: 100 });
    expect(body.velocity.x).toBeLessThan(0);
    expect(body.velocity.y).toBeCloseTo(Math.cos(100 * 0.003) * 20 * 0.003 * 1000);
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

  it('FalconDrone should update body position and take damage when hit within bounding box', () => {
    const scene = createMockScene();
    const drone = new FalconDrone(scene, 100, 100);
    drone.body = createMockBody();

    drone.updateAI(0, 100, { x: 50, y: 100 });
    expect(drone.isAlive).toBe(true);

    const hit = drone.takeDamage(1);
    expect(hit).toBe(true);
    expect(drone.isAlive).toBe(false);
  });

  it('configures proper expanded physics body sizes matching new silhouettes', () => {
    const scene = createMockScene();
    const trooper = new Trooper(scene, 100, 100);
    const turret = new Turret(scene, 100, 100);
    const drone = new FalconDrone(scene, 100, 100);
    const jumper = new JumperMercenary(scene, 100, 100);
    const boss = new Boss(scene, 100, 100);

    // Trooper body size: 16x22, offset 4, 2
    expect(trooper.body!.width).toBe(16);
    expect(trooper.body!.height).toBe(22);
    expect((trooper.body as any).offset).toEqual({ x: 4, y: 2 });

    // Turret body size: 24x20, offset 4, 2
    expect(turret.body!.width).toBe(24);
    expect(turret.body!.height).toBe(20);
    expect((turret.body as any).offset).toEqual({ x: 4, y: 2 });

    // Drone body size: 28x16, offset 2, 2
    expect(drone.body!.width).toBe(28);
    expect(drone.body!.height).toBe(16);
    expect((drone.body as any).offset).toEqual({ x: 2, y: 2 });

    // Jumper body size: 16x24, offset 4, 2
    expect(jumper.body!.width).toBe(16);
    expect(jumper.body!.height).toBe(24);
    expect((jumper.body as any).offset).toEqual({ x: 4, y: 2 });

    // Boss body size: 64x58, offset 0, 6
    expect(boss.body!.width).toBe(64);
    expect(boss.body!.height).toBe(58);
    expect((boss.body as any).offset).toEqual({ x: 0, y: 6 });
  });

  it('should play multi-frame animations or switch frames for enemy states', () => {
    const scene = createMockScene();
    (scene.anims as any).exists = () => true;

    // Trooper: play trooper_run on moving, stop on idle
    const trooper = new Trooper(scene, 100, 100);
    const trooperAnims: string[] = [];
    let trooperStopped = false;
    (trooper as any).anims = {
      play: (key: string) => trooperAnims.push(key),
      stop: () => { trooperStopped = true; },
      currentAnim: null,
    };
    trooper.updateAI(0, 16, { x: 200, y: 100 });
    expect(trooperAnims).toContain('trooper_run');

    (trooper.body as any).velocity.x = 0;
    trooper.moveSpeed = 0;
    trooper.updateAI(16, 16, { x: 200, y: 100 });
    expect(trooperStopped).toBe(true);

    // FalconDrone: play drone_fly
    const drone = new FalconDrone(scene, 100, 100);
    const droneAnims: string[] = [];
    (drone as any).anims = {
      play: (key: string) => droneAnims.push(key),
      currentAnim: null,
    };
    drone.updateAI(0, 16, { x: 200, y: 100 });
    expect(droneAnims).toContain('drone_fly');

    // JumperMercenary: jump animation when in air, stopped when grounded
    const jumper = new JumperMercenary(scene, 100, 100);
    const jumperAnims: string[] = [];
    let jumperStopped = false;
    (jumper as any).anims = {
      play: (key: string) => jumperAnims.push(key),
      stop: () => { jumperStopped = true; },
      currentAnim: null,
    };
    // In air (not grounded)
    (jumper.body as any).blocked.down = false;
    (jumper.body as any).touching.down = false;
    jumper.updateAI(0, 16, { x: 200, y: 100 });
    expect(jumperAnims).toContain('jumper_jump');

    // Grounded
    (jumper.body as any).blocked.down = true;
    jumper.jumpTimer = 500;
    jumper.updateAI(0, 16, { x: 200, y: 100 });
    expect(jumperStopped).toBe(true);

    // Boss: play boss_drive
    const boss = new Boss(scene, 100, 100);
    const bossAnims: string[] = [];
    (boss as any).anims = {
      play: (key: string) => bossAnims.push(key),
      currentAnim: null,
    };
    boss.updateAI(0, 16, { x: 200, y: 100 });
    expect(bossAnims).toContain('boss_drive');
  });

  it('Turret should switch frames for muzzle flash when firing and revert', () => {
    const scene = createMockScene();
    const turret = new Turret(scene, 100, 100);
    const turretFrames: number[] = [];
    turret.setFrame = ((frame: number) => {
      turretFrames.push(frame);
      return turret;
    }) as any;
    const pool = new ProjectilePool(scene);

    turret.shootTimer = 0;
    turret.updateAI(0, 16, { x: 150, y: 100 }, pool);
    expect(turretFrames).toContain(1);

    turret.updateAI(0, 200, { x: 150, y: 100 }, pool);
    expect(turretFrames[turretFrames.length - 1]).toBe(0);
  });

  it('Boss should pursue player horizontally and increase speed in phase 2', () => {
    const scene = createMockScene();
    const boss = new Boss(scene, 200, 100);
    boss.body = createMockBody();

    // Player to the right -> positive velocity X
    boss.updateAI(0, 16, { x: 300, y: 100 });
    expect((boss.body as any).velocity.x).toBeGreaterThan(0);
    expect(boss.facingLeft).toBe(false);

    // Player to the left -> negative velocity X
    boss.updateAI(16, 16, { x: 100, y: 100 });
    expect((boss.body as any).velocity.x).toBeLessThan(0);
    expect(boss.facingLeft).toBe(true);

    // Transition to Phase 2 (< 50% health) -> increased speed
    boss.health = 20; // maxHealth is 50
    boss.updateAI(32, 16, { x: 300, y: 100 });
    expect(boss.phase).toBe(2);
    expect((boss.body as any).velocity.x).toBeGreaterThan(100);
  });

  it('Boss should drop through one-way platforms when player is below', () => {
    const scene = createMockScene();
    const boss = new Boss(scene, 200, 100);
    const body = createMockBody();
    body.blocked.down = true;
    boss.body = body;

    // Player is lower down (y=200 vs boss y=100) -> trigger drop-through
    boss.updateAI(0, 16, { x: 200, y: 200 });
    expect(boss.isDroppingThrough).toBe(true);
    expect(body.checkCollision.down).toBe(false);
  });

  it('Boss should leap upward when player is on a higher tier', () => {
    const scene = createMockScene();
    const boss = new Boss(scene, 200, 200);
    const body = createMockBody();
    body.blocked.down = true;
    boss.body = body;

    // Player is higher up (y=100 vs boss y=200) -> leap up
    boss.jumpTimer = 0;
    boss.updateAI(0, 16, { x: 200, y: 100 });
    expect(body.velocity.y).toBeLessThan(0);
    expect(boss.jumpTimer).toBeGreaterThan(0);
  });

  it('Enemy and boss projectiles should have minimum 2000ms lifespan to cover 512px room', () => {
    const scene = createMockScene();
    const pool = new ProjectilePool(scene);
    const bullet = pool.spawn(100, 100, 0, 'PEA_SHOOTER', false);
    expect(bullet).not.toBeNull();
    expect(bullet!.lifespan).toBeGreaterThanOrEqual(2000);
  });

  it('Boss should cycle through telegraphed SWEEP, LEAP, and CHARGE states with OVERHEAT recovery', () => {
    const scene = createMockScene();
    const boss = new Boss(scene, 200, 200);
    const body = createMockBody();
    boss.body = body;
    const pool = new ProjectilePool(scene);
    const player = { x: 350, y: 200 };

    // 1. PATROL transitions to SWEEP_TELEGRAPH after patrol duration (1200ms in phase 1)
    expect(boss.state).toBe('PATROL');
    boss.updateAI(0, 1250, player, pool);
    expect(boss.state).toBe('SWEEP_TELEGRAPH');

    // 2. SWEEP_TELEGRAPH holds boss stationary and transitions to SWEEP_ATTACK after 600ms
    boss.updateAI(1250, 100, player, pool);
    expect(body.velocity.x).toBe(0);
    boss.updateAI(1350, 550, player, pool);
    expect(boss.state).toBe('SWEEP_ATTACK');

    // 3. SWEEP_ATTACK fires sweeping bullets while stationary, then returns to PATROL
    boss.updateAI(1900, 200, player, pool);
    expect(body.velocity.x).toBe(0);
    expect(pool.getActiveProjectiles().length).toBeGreaterThan(0);
    boss.updateAI(2100, 1100, player, pool);
    expect(boss.state).toBe('PATROL');

    // 4. Next PATROL transitions to LEAP_TELEGRAPH -> LEAP_AIR -> landing shockwave
    boss.updateAI(3200, 1250, player, pool);
    expect(boss.state).toBe('LEAP_TELEGRAPH');
    expect(boss.targetX).toBe(player.x);

    boss.updateAI(4450, 600, player, pool);
    expect(boss.state).toBe('LEAP_AIR');
    expect(body.velocity.y).toBeLessThan(0);
    expect(body.velocity.x).toBeGreaterThan(0);

    // Simulate landing back on ground after > 120ms
    for (const p of pool.getActiveProjectiles()) p.deactivate();
    body.blocked.down = true;
    boss.updateAI(5050, 200, player, pool);
    expect(boss.state).toBe('PATROL');
    // Should have fired left + right shockwave projectiles on landing
    expect(pool.getActiveProjectiles().length).toBe(2);

    // 5. Third PATROL transitions to CHARGE_TELEGRAPH -> CHARGE_DASH -> OVERHEAT punish window
    boss.updateAI(5250, 1250, player, pool);
    expect(boss.state).toBe('CHARGE_TELEGRAPH');

    boss.updateAI(6500, 600, player, pool);
    expect(boss.state).toBe('CHARGE_DASH');

    // Dash moves rapidly toward locked direction; hitting wall triggers OVERHEAT
    boss.updateAI(7100, 100, player, pool);
    expect(body.velocity.x).toBeGreaterThan(200);
    body.blocked.right = true;
    boss.updateAI(7200, 100, player, pool);
    expect(boss.state).toBe('OVERHEAT');
    expect(body.velocity.x).toBe(0);

    // After overheat recovery (1500ms), boss returns to PATROL
    boss.updateAI(7300, 1550, player, pool);
    expect(boss.state).toBe('PATROL');
  });
});


