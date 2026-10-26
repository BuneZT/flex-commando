import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameScene } from '../src/scenes/GameScene';
import { SoundManager } from '../src/core/SoundManager';
import { Player } from '../src/entities/Player';

describe('GameScene Room Lockdown & Barrier Integration', () => {
  let scene: GameScene;
  let mockSoundManagerPlaySfx: any;

  beforeEach(() => {
    mockSoundManagerPlaySfx = vi.spyOn(SoundManager.getInstance(), 'playSfx').mockImplementation(() => {});

    scene = new GameScene();
    const mock = {
      sys: {
        queueDepthSort: () => {},
        displayList: { add: () => {}, queueDepthSort: () => {} },
        updateList: { add: () => {} },
        anims: { on: () => {}, once: () => {}, off: () => {} },
        textures: { get: () => ({ get: () => ({}) }) },
        settings: { data: {} },
      },
      cameras: {
        main: {
          setBackgroundColor: () => {},
          setScroll: () => {},
          setBounds: () => {},
          centerOn: () => {},
          pan: () => {},
        },
      },
      add: {
        existing: () => {},
        group: () => ({ add: () => {} }),
        text: () => {
          const t: any = {
            setOrigin: () => t,
            setScrollFactor: () => t,
            setDepth: () => t,
            setText: () => t,
            setColor: () => t,
            setVisible: () => t,
          };
          return t;
        },
        sprite: (x = 0, y = 0) => {
          const s: any = {
            x,
            y,
            active: true,
            visible: true,
            body: {
              enable: true,
              immovable: true,
              setSize: (w: number, h: number) => { s.body.width = w; s.body.height = h; },
              reset: (bx: number, by: number) => { s.x = bx; s.y = by; },
              width: 16,
              height: 16,
            },
            setPosition: (px: number, py: number) => { s.x = px; s.y = py; return s; },
            setDisplaySize: (dw: number, dh: number) => { s.displayWidth = dw; s.displayHeight = dh; return s; },
            setScrollFactor: () => s,
            setDepth: () => s,
            setTint: () => s,
            clearTint: () => s,
            setAlpha: () => s,
            setActive: (val: boolean) => { s.active = val; return s; },
            setVisible: (val: boolean) => { s.visible = val; return s; },
          };
          return s;
        },
        graphics: () => {
          const g: any = {
            setScrollFactor: () => g,
            setDepth: () => g,
            clear: () => g,
            fillStyle: () => g,
            fillRect: () => g,
            lineStyle: () => g,
            strokeRect: () => g,
          };
          return g;
        },
      },
      physics: {
        add: {
          existing: () => {},
          group: () => ({ add: () => {} }),
          staticGroup: () => {
            const group: any = {
              children: { entries: [] },
              create: (x: number, y: number) => {
                const s = mock.add.sprite(x, y);
                group.children.entries.push(s);
                return s;
              },
              add: (item: any) => group.children.entries.push(item),
            };
            return group;
          },
          collider: vi.fn(),
        },
        world: { setBounds: () => {} },
      },
    } as any;

    scene.sys = mock.sys;
    scene.cameras = mock.cameras;
    scene.add = mock.add;
    scene.physics = mock.physics;
  });

  it('initializes room barrier pool and colliders on create', () => {
    scene.create();
    expect(scene.roomBarriers).toBeDefined();
    expect(scene.roomBarriers.length).toBe(4);
    // In START room (no enemies), all barriers must be deactivated
    expect(scene.roomBarriers.every((b) => !b.active && !b.visible)).toBe(true);
    // Player collider should be registered
    expect(scene.physics.add.collider).toHaveBeenCalledWith(scene.player, scene.roomBarrierGroup);
  });

  it('locks room doors when entering a room with undefeated enemies', () => {
    scene.create();

    // Mock an uncleared room at grid (1, 0) with a living enemy
    const mockEnemy: any = {
      x: 600,
      y: 100,
      isAlive: true,
      active: true,
      visible: true,
      takeDamage: () => false,
      scoreValue: 100,
    };
    scene.enemies = [mockEnemy];

    // Room (1, 0) doors
    if (scene.grid && scene.grid[0] && scene.grid[0][1]) {
      scene.grid[0][1].doors = { north: false, south: true, east: true, west: true };
    }

    scene.updateRoomLockdown(1, 0);

    // Active barriers should equal open doors in room (3 doors)
    const activeBarriers = scene.roomBarriers.filter((b) => b.active);
    expect(activeBarriers.length).toBe(3);
    for (const barrier of activeBarriers) {
      expect(barrier.visible).toBe(true);
      expect((barrier.body as any)?.enable).toBe(true);
    }
  });

  it('clamps player inside room on lockdown if overlapping door edge', () => {
    scene.create();
    // Player at edge near west door of room (1, 0): x = 515 (room left is 512)
    if (scene.player) {
      scene.player.x = 515;
      scene.player.y = 200;
    }

    const mockEnemy: any = {
      x: 600,
      y: 100,
      isAlive: true,
      active: true,
      visible: true,
    };
    scene.enemies = [mockEnemy];

    scene.updateRoomLockdown(1, 0);

    // Clamped inward away from west door (512 + 24 = 536)
    expect(scene.player!.x).toBeGreaterThanOrEqual(536);
  });

  it('unlocks barriers and plays pickup sfx chime when unlockRoomBarriers is called', () => {
    scene.create();
    // Activate barriers
    for (const b of scene.roomBarriers) {
      b.setActive(true);
      b.setVisible(true);
      if (b.body) (b.body as any).enable = true;
    }

    scene.unlockRoomBarriers();

    expect(scene.roomBarriers.every((b) => !b.active && !b.visible && !(b.body as any)?.enable)).toBe(true);
    expect(mockSoundManagerPlaySfx).toHaveBeenCalledWith('pickup');
  });

  it('detonates bullets colliding with active barriers and triggers impact FX', () => {
    scene.create();
    scene.isRoomLockdownActive = true;
    const barrier = scene.roomBarriers[0];
    barrier.setActive(true);
    barrier.setPosition(500, 200);
    barrier.setDisplaySize(16, 96);
    const body = barrier.body as any;
    if (body) {
      body.enable = true;
      body.setSize(16, 96);
      body.reset(500, 200);
    }

    let bulletDeactivated = false;
    const mockBullet: any = {
      x: 500,
      y: 200,
      active: true,
      isPlayerBullet: true,
      damage: 10,
      body: { width: 8, height: 8, x: 496, y: 196 },
      deactivate: () => { bulletDeactivated = true; mockBullet.active = false; },
    };

    scene.projectilePool = {
      getActiveProjectiles: () => [mockBullet],
    } as any;

    const spawnImpactSpy = vi.fn();
    scene.impactFXPool = { spawn: spawnImpactSpy } as any;

    (scene as any).handleCollisions();

    expect(bulletDeactivated).toBe(true);
    expect(spawnImpactSpy).toHaveBeenCalledWith(500, 200);
  });

  it('automatically unlocks room when the last enemy in room is killed', () => {
    scene.create();
    if (scene.player) {
      scene.player.x = 600;
      scene.player.y = 200;
    }

    let enemy1Alive = true;
    const enemy1: any = {
      x: 650,
      y: 200,
      isAlive: true,
      active: true,
      scoreValue: 100,
      body: { width: 16, height: 16, x: 642, y: 192 },
      takeDamage: () => { enemy1Alive = false; enemy1.isAlive = false; return true; },
    };

    scene.enemies = [enemy1];
    scene.activeEnemies = [enemy1];
    scene.updateRoomLockdown(1, 0);

    expect(scene.isRoomLockdownActive).toBe(true);

    const mockBullet: any = {
      x: 650,
      y: 200,
      active: true,
      isPlayerBullet: true,
      damage: 10,
      body: { width: 8, height: 8, x: 646, y: 196 },
      deactivate: () => { mockBullet.active = false; },
      hasHitTarget: () => false,
      recordTargetHit: () => {},
    };

    scene.projectilePool = {
      getActiveProjectiles: () => [mockBullet],
    } as any;

    (scene as any).handleCollisions();

    expect(enemy1.isAlive).toBe(false);
    expect(scene.isRoomLockdownActive).toBe(false);
    expect(scene.roomBarriers.every((b) => !b.active)).toBe(true);
    expect(mockSoundManagerPlaySfx).toHaveBeenCalledWith('pickup');
  });

  it('detonates enemy bullets on active barriers without damaging player', () => {
    scene.create();
    scene.isRoomLockdownActive = true;
    const barrier = scene.roomBarriers[0];
    barrier.setActive(true);
    barrier.setPosition(500, 200);
    barrier.setDisplaySize(16, 96);
    const body = barrier.body as any;
    if (body) {
      body.enable = true;
      body.setSize(16, 96);
      body.reset(500, 200);
    }

    let bulletDeactivated = false;
    const mockEnemyBullet: any = {
      x: 500,
      y: 200,
      active: true,
      isPlayerBullet: false,
      damage: 1,
      body: { width: 8, height: 8, x: 496, y: 196 },
      deactivate: () => { bulletDeactivated = true; mockEnemyBullet.active = false; },
    };

    scene.projectilePool = {
      getActiveProjectiles: () => [mockEnemyBullet],
    } as any;

    const damageSpy = vi.spyOn(scene, 'handlePlayerDamage');

    (scene as any).handleCollisions();

    expect(bulletDeactivated).toBe(true);
    expect(damageSpy).not.toHaveBeenCalled();
  });

  it('triggers fade-in and fade-out tweens with additive blend mode for sci-fi barriers', () => {
    scene.create();

    const tweenSpy = vi.fn((config: any) => {
      if (config.onComplete) config.onComplete();
    });
    scene.tweens = {
      add: tweenSpy,
      isTweening: () => false,
    } as any;

    const mockEnemy: any = {
      x: 600,
      y: 100,
      isAlive: true,
      active: true,
      visible: true,
    };
    scene.enemies = [mockEnemy];
    if (scene.grid && scene.grid[0] && scene.grid[0][1]) {
      scene.grid[0][1].doors = { north: false, south: true, east: true, west: false };
    }

    // Trigger lockdown (fade-in)
    scene.updateRoomLockdown(1, 0);

    expect(tweenSpy).toHaveBeenCalled();
    const activeBarriers = scene.roomBarriers.filter((b) => b.active);
    expect(activeBarriers.length).toBe(2);

    // Trigger unlock (fade-out)
    tweenSpy.mockClear();
    scene.unlockRoomBarriers();

    expect(tweenSpy).toHaveBeenCalled();
    expect(scene.roomBarriers.every((b) => !b.active && !b.visible)).toBe(true);
  });

  it('updates exit portal Phaser 4 glow filter color and strength when unlocked', () => {
    scene.create();
    const mockPortalGlow = { color: 0xff4444, outerStrength: 2, active: true };
    (scene as any).exitPortalGlow = mockPortalGlow;

    scene.unlockExitPortal();

    expect(mockPortalGlow.color).toBe(0x00ff88);
    expect(mockPortalGlow.outerStrength).toBe(3);
  });
});
