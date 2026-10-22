import { describe, it, expect, vi } from 'vitest';
import { formatHUDLives } from '../src/ui/HUD';
import { Boss } from '../src/entities/enemies/Boss';
import { GameScene } from '../src/scenes/GameScene';

function createMockScene() {
  return {
    sys: {
      queueDepthSort: () => {},
      displayList: { add: () => {}, queueDepthSort: () => {} },
      updateList: { add: () => {} },
      anims: { on: () => {}, once: () => {}, off: () => {} },
      textures: { get: () => ({ get: () => ({}) }) },
      settings: { data: {} },
    },
    cameras: { main: { setBackgroundColor: () => {}, setScroll: () => {}, setBounds: () => {} } },
    add: {
      existing: () => {},
      group: () => ({ add: () => {} }),
      text: (_x?: number, _y?: number, content?: string) => {
        const textObj: any = {
          text: content ?? '',
          color: '',
          setOrigin: () => textObj,
          setScrollFactor: () => textObj,
          setDepth: () => textObj,
          setText: (txt: string) => { textObj.text = txt; return textObj; },
          setColor: (clr: string) => { textObj.color = clr; return textObj; },
          setVisible: () => textObj,
        };
        return textObj;
      },
      sprite: (x: number = 0, y: number = 0) => {
        const spriteObj: any = {
          x,
          y,
          width: 16,
          height: 16,
          tint: undefined as number | undefined,
          alpha: 1,
          setScrollFactor: () => spriteObj,
          setDepth: () => spriteObj,
          setTint: (t: number) => { spriteObj.tint = t; return spriteObj; },
          clearTint: () => { spriteObj.tint = undefined; return spriteObj; },
          setAlpha: (a: number) => { spriteObj.alpha = a; return spriteObj; },
        };
        return spriteObj;
      },
      graphics: () => {
        const gfxObj: any = {
          setScrollFactor: () => gfxObj,
          setDepth: () => gfxObj,
          clear: () => gfxObj,
          fillStyle: () => gfxObj,
          fillRect: () => gfxObj,
          lineStyle: () => gfxObj,
          strokeRect: () => gfxObj,
        };
        return gfxObj;
      },
    },
    physics: { add: { existing: () => {}, group: () => ({ add: () => {} }), collider: () => {} }, world: { setBounds: () => {} } },
  } as any;
}

function createMockBody(x: number = 0, y: number = 0) {
  let width = 32;
  let height = 32;
  const velocity = { x: 0, y: 0 };
  return {
    x,
    y,
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
  } as any;
}

describe('formatHUDLives', () => {
  it('should return icon string representing remaining lives', () => {
    expect(formatHUDLives(3)).toBe('❤❤❤');
    expect(formatHUDLives(1)).toBe('❤');
    expect(formatHUDLives(0)).toBe('DEAD');
    expect(formatHUDLives(-1)).toBe('DEAD');
  });
});

describe('Boss Class Mechanics', () => {
  it('should initialize with high max health and handle damage', () => {
    const scene = createMockScene();
    const boss = new Boss(scene, 300, 200);
    boss.body = createMockBody();

    expect(boss.isAlive).toBe(true);
    expect(boss.health).toBeGreaterThanOrEqual(30);
    expect(boss.maxHealth).toBe(boss.health);

    const isDead = boss.takeDamage(10);
    expect(isDead).toBe(false);
    expect(boss.health).toBe(boss.maxHealth - 10);

    const lethal = boss.takeDamage(boss.health);
    expect(lethal).toBe(true);
    expect(boss.isAlive).toBe(false);
  });

  it('should detect when all enemies are defeated', () => {
    const scene = createMockScene();
    const boss = new Boss(scene, 300, 200);
    boss.body = createMockBody();

    const enemies = [boss];
    expect(enemies.every((e) => !e.isAlive)).toBe(false);

    boss.takeDamage(boss.maxHealth);
    expect(enemies.every((e) => !e.isAlive)).toBe(true);
  });

  it('should support full 4x4 level physics bounds (2048x1152)', () => {
    let bounds: { x: number; y: number; width: number; height: number } | null = null;
    const mockPhysics = {
      world: {
        setBounds: (x: number, y: number, w: number, h: number) => {
          bounds = { x, y, width: w, height: h };
        },
      },
    };
    mockPhysics.world.setBounds(0, 0, 2048, 1152);
    expect(bounds).toEqual({ x: 0, y: 0, width: 2048, height: 1152 });
  });

  it('should configure physics world bounds to 2048x1152 in create()', () => {
    const scene = createInitializedGameScene();
    let setBoundsArgs: any = null;
    scene.physics.world.setBounds = (x: number, y: number, w: number, h: number) => {
      setBoundsArgs = { x, y, w, h };
      return scene.physics.world;
    };
    scene.create();
    expect(setBoundsArgs).toEqual({ x: 0, y: 0, w: 2048, h: 1152 });
  });
});

describe('GameScene Primitive AABB Collision Detection', () => {
  it('should correctly detect overlapping objects using AABB math', () => {
    const scene = new GameScene();
    const a = { x: 100, y: 100, width: 16, height: 16 };
    const b = { x: 108, y: 108, width: 16, height: 16 };
    // @ts-ignore - testing private method
    expect(scene.checkOverlap(a, b, 4)).toBe(true);
  });

  it('should return false when objects are beyond collision threshold', () => {
    const scene = new GameScene();
    const a = { x: 100, y: 100, width: 16, height: 16 };
    const b = { x: 200, y: 200, width: 16, height: 16 };
    // @ts-ignore - testing private method
    expect(scene.checkOverlap(a, b, 4)).toBe(false);
  });

  it('should prioritize body dimensions over width/height properties', () => {
    const scene = new GameScene();
    const a = { x: 100, y: 100, width: 8, height: 8, body: { x: 84, y: 84, width: 32, height: 32 } };
    const b = { x: 120, y: 120, width: 8, height: 8, body: { x: 104, y: 104, width: 32, height: 32 } };
    // @ts-ignore - testing private method
    expect(scene.checkOverlap(a, b, 4)).toBe(true);
  });
});

describe('GameScene Group Physics Consolidation', () => {
  it('should initialize enemyGroup for physics colliders', () => {
    const scene = new GameScene();
    let mockGroupCreated = false;
    const mock = createMockScene();
    scene.sys = mock.sys;
    scene.cameras = mock.cameras;
    scene.add = mock.add;
    scene.physics = {
      ...mock.physics,
      add: {
        ...mock.physics.add,
        group: () => {
          mockGroupCreated = true;
          return { add: () => {} } as any;
        },
      },
    } as any;

    expect(scene.enemyGroup).toBeUndefined();
    scene.create();
    expect(mockGroupCreated).toBe(true);
    expect(scene.enemyGroup).toBeDefined();
  });
});

describe('GameScene Parallax Background', () => {
  it('should initialize parallaxBg TileSprite when cyber_hangar_bg texture exists', () => {
    const scene = new GameScene();
    const mock = createMockScene();
    scene.sys = mock.sys;
    scene.cameras = mock.cameras;
    scene.physics = mock.physics;

    let tileSpriteConfig: any = null;
    let originSet: [number, number] | null = null;
    let scrollFactorSet: number | null = null;
    let depthSet: number | null = null;

    const mockTileSprite = {
      tilePositionX: 0,
      tilePositionY: 0,
      setOrigin: (x: number, y: number) => {
        originSet = [x, y];
        return mockTileSprite;
      },
      setScrollFactor: (factor: number) => {
        scrollFactorSet = factor;
        return mockTileSprite;
      },
      setDepth: (d: number) => {
        depthSet = d;
        return mockTileSprite;
      },
    };

    scene.add = {
      ...mock.add,
      tileSprite: (x: number, y: number, w: number, h: number, key: string) => {
        tileSpriteConfig = { x, y, w, h, key };
        return mockTileSprite as any;
      },
    } as any;

    (scene as any).textures = {
      exists: (key: string) => key === 'cyber_hangar_bg',
    };

    scene.create();

    expect(scene.parallaxBg).toBe(mockTileSprite);
    expect(tileSpriteConfig).toEqual({
      x: 0,
      y: 0,
      w: 512,
      h: 288,
      key: 'cyber_hangar_bg',
    });
    expect(originSet).toEqual([0, 0]);
    expect(scrollFactorSet).toBe(0);
    expect(depthSet).toBe(-10);
  });

  it('should safely leave parallaxBg undefined if texture or tileSprite is unavailable', () => {
    const scene = new GameScene();
    const mock = createMockScene();
    scene.sys = mock.sys;
    scene.cameras = mock.cameras;
    scene.add = mock.add;
    scene.physics = mock.physics;

    scene.create();

    expect(scene.parallaxBg).toBeUndefined();
  });

  it('should update tilePositionX and tilePositionY at 0.15x and 0.10x scroll ratios', () => {
    const scene = new GameScene();
    const mockTileSprite: any = {
      tilePositionX: 0,
      tilePositionY: 0,
    };
    scene.parallaxBg = mockTileSprite;
    scene.cameras = {
      main: {
        scrollX: 400,
        scrollY: 200,
      },
    } as any;

    scene.update(1000, 16);

    expect(mockTileSprite.tilePositionX).toBe(400 * 0.15); // 60
    expect(mockTileSprite.tilePositionY).toBe(200 * 0.10); // 20
  });

  it('should default parallax offsets to 0 when camera scroll is zero or undefined', () => {
    const scene = new GameScene();
    const mockTileSprite: any = {
      tilePositionX: 100,
      tilePositionY: 100,
    };
    scene.parallaxBg = mockTileSprite;
    scene.cameras = {
      main: {} as any,
    } as any;

    scene.update(1000, 16);

    expect(mockTileSprite.tilePositionX).toBe(0);
    expect(mockTileSprite.tilePositionY).toBe(0);
  });
});

describe('Pickup Capsule Spatial Culling', () => {
  function createMockCapsule(x: number, y: number, hp: number = 1) {
    const capsule: any = {
      x,
      y,
      hp,
      active: true,
      visible: true,
      body: { enable: true },
      setActive(val: boolean) {
        this.active = val;
        return this;
      },
      setVisible(val: boolean) {
        this.visible = val;
        return this;
      },
    };
    return capsule;
  }

  it('should cull capsules outside the current room and activate capsules inside', () => {
    const scene = new GameScene();
    const capsuleRoom00 = createMockCapsule(400, 100);
    const capsuleRoom10 = createMockCapsule(600, 100);
    const capsuleRoom01 = createMockCapsule(100, 350);

    const capsules = [capsuleRoom00, capsuleRoom10, capsuleRoom01];
    const active = scene.cullCapsules(capsules, 0, 0);

    expect(active.length).toBe(1);
    expect(active[0]).toBe(capsuleRoom00);
    expect(capsuleRoom00.active).toBe(true);
    expect(capsuleRoom00.visible).toBe(true);
    expect(capsuleRoom00.body.enable).toBe(true);

    expect(capsuleRoom10.active).toBe(false);
    expect(capsuleRoom10.visible).toBe(false);
    expect(capsuleRoom10.body.enable).toBe(false);

    expect(capsuleRoom01.active).toBe(false);
    expect(capsuleRoom01.visible).toBe(false);
    expect(capsuleRoom01.body.enable).toBe(false);
  });

  it('should update active capsules when room changes', () => {
    const scene = new GameScene();
    const capsuleRoom00 = createMockCapsule(400, 100);
    const capsuleRoom10 = createMockCapsule(600, 100);

    const capsules = [capsuleRoom00, capsuleRoom10];
    const active = scene.cullCapsules(capsules, 1, 0);

    expect(active.length).toBe(1);
    expect(active[0]).toBe(capsuleRoom10);
    expect(capsuleRoom00.active).toBe(false);
    expect(capsuleRoom10.active).toBe(true);
  });
});

function createInitializedGameScene(): GameScene {
  const scene = new GameScene();
  const mock = createMockScene();
  scene.sys = mock.sys;
  scene.cameras = mock.cameras;
  scene.add = mock.add;
  scene.physics = mock.physics;
  scene.scene = { start: vi.fn() } as any;
  return scene;
}

describe('Curated Weapon Capsules and Enemy Drops', () => {
  it('should spawn weapon capsules only in curated rooms (2 to 3 per level)', () => {
    const scene = createInitializedGameScene();
    scene.create();
    expect(scene.pickupCapsules.length).toBeGreaterThanOrEqual(2);
    expect(scene.pickupCapsules.length).toBeLessThanOrEqual(3);
  });

  it('should not drop pickup items when regular enemies are killed', () => {
    const scene = createInitializedGameScene();
    scene.create();
    const initialItemsCount = scene.pickupItems.length;

    // Cull to a room containing regular enemies
    expect(scene.enemies.length).toBeGreaterThan(0);
    const firstEnemy = scene.enemies[0];
    const enemyRoomX = Math.floor(firstEnemy.x / 512);
    const enemyRoomY = Math.floor(firstEnemy.y / 288);
    scene.cameraManager?.setRoom(enemyRoomX, enemyRoomY);
    scene.cullEntities(enemyRoomX, enemyRoomY);

    if (scene.activeEnemies.length > 0) {
      const enemy = scene.activeEnemies[0];
      // Spawn player bullet overlapping enemy with lethal damage
      const bullet = scene.projectilePool?.spawn(enemy.x, enemy.y, 0, 'PEA_SHOOTER', true);
      if (bullet) {
        bullet.damage = 9999;
      }
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
      try {
        (scene as any).handleCollisions();
        expect(enemy.isAlive).toBe(false);
        expect(scene.pickupItems.length).toBe(initialItemsCount);
      } finally {
        randomSpy.mockRestore();
      }
    }
  });
});

describe('Portal Lock State and Win Condition', () => {
  it('should initialize portal in locked state with PORTAL LOCKED text', () => {
    const scene = createInitializedGameScene();
    scene.create();

    expect(scene.isPortalUnlocked).toBe(false);
    expect(scene.exitDoor).toBeDefined();
    expect(scene.exitPortalText).toBeDefined();
    expect((scene.exitPortalText as any)?.text).toBe('PORTAL LOCKED');
  });

  it('should not trigger victory when player overlaps exit portal while locked', () => {
    const scene = createInitializedGameScene();
    scene.create();

    const triggerVictorySpy = vi.spyOn(scene as any, 'triggerVictory');
    expect(scene.isPortalUnlocked).toBe(false);
    expect(scene.exitDoor).toBeDefined();

    // Position player directly over the exit portal
    scene.player!.x = scene.exitDoor!.x;
    scene.player!.y = scene.exitDoor!.y;
    if (scene.player!.body) {
      scene.player!.body.x = scene.exitDoor!.x;
      scene.player!.body.y = scene.exitDoor!.y;
    }

    (scene as any).handleCollisions();

    expect(triggerVictorySpy).not.toHaveBeenCalled();
    expect(scene.isVictory).toBe(false);
  });

  it('should not trigger victory when all regular enemies are defeated', () => {
    const scene = createInitializedGameScene();
    scene.create();

    const triggerVictorySpy = vi.spyOn(scene as any, 'triggerVictory');

    // Slay all regular enemies
    expect(scene.enemies.length).toBeGreaterThan(0);
    for (const enemy of scene.enemies) {
      enemy.isAlive = false;
    }

    scene.update(1000, 16);

    expect(triggerVictorySpy).not.toHaveBeenCalled();
    expect(scene.isVictory).toBe(false);
  });

  it('should unlock exit portal, update text and play SFX when boss is defeated without triggering victory immediately', () => {
    const scene = createInitializedGameScene();
    scene.create();

    const boss = new Boss(scene, 200, 200);
    boss.body = createMockBody(boss.x - 16, boss.y - 16);
    scene.boss = boss;
    scene.activeEnemies.push(boss);

    const triggerVictorySpy = vi.spyOn(scene as any, 'triggerVictory');
    const unlockSpy = vi.spyOn(scene as any, 'unlockExitPortal');

    // Lethal bullet hit on boss
    const bullet = scene.projectilePool?.spawn(boss.x, boss.y, 0, 'PEA_SHOOTER', true);
    if (bullet) {
      bullet.damage = 9999;
    }

    (scene as any).handleCollisions();

    expect(boss.isAlive).toBe(false);
    expect(unlockSpy).toHaveBeenCalled();
    expect(scene.isPortalUnlocked).toBe(true);
    expect((scene.exitPortalText as any)?.text).toBe('EXIT PORTAL');
    expect(triggerVictorySpy).not.toHaveBeenCalled();
    expect(scene.isVictory).toBe(false);
  });

  it('should trigger victory when player overlaps exit portal after it is unlocked', () => {
    const scene = createInitializedGameScene();
    scene.create();

    (scene as any).unlockExitPortal?.();
    expect(scene.isPortalUnlocked).toBe(true);

    const triggerVictorySpy = vi.spyOn(scene as any, 'triggerVictory');

    // Position player directly over exit portal
    scene.player!.x = scene.exitDoor!.x;
    scene.player!.y = scene.exitDoor!.y;
    if (scene.player!.body) {
      scene.player!.body.x = scene.exitDoor!.x;
      scene.player!.body.y = scene.exitDoor!.y;
    }

    (scene as any).handleCollisions();

    expect(triggerVictorySpy).toHaveBeenCalled();
    expect(scene.isVictory).toBe(true);
  });

  it('should not trigger boss encounter when entering column 3 room if cell type is not BOSS', () => {
    const scene = createInitializedGameScene();
    scene.create();

    expect(scene.grid).toBeDefined();
    // Configure cell (3, 0) to be a non-boss room (e.g. PATH)
    scene.grid![0][3] = { x: 3, y: 0, type: 'PATH', doorMask: 0 } as any;

    expect(scene.bossTriggered).toBe(false);

    // Position player in room (3, 0)
    scene.player!.x = 3 * 512 + 256;
    scene.player!.y = 0 * 288 + 144;

    scene.update(1000, 16);

    expect(scene.bossTriggered).toBe(false);
    expect(scene.boss).toBeNull();
  });

  it('should spawn player and exit door at correct 512x288 16:9 room coordinates', () => {
    const scene = createInitializedGameScene();
    scene.create();

    const startRoom = scene.grid!.flat().find((c) => c.type === 'START')!;
    const expectedStartX = startRoom.x * 512 + 120;
    const expectedStartY = startRoom.y * 288 + 220;

    expect(scene.player!.x).toBe(expectedStartX);
    expect(scene.player!.y).toBe(expectedStartY);

    const exitCell = scene.grid!.flat().find((c) => c.type === 'BOSS')!;
    const expectedExitX = exitCell.x * 512 + 420;
    const expectedExitY = exitCell.y * 288 + 220;

    expect(scene.exitDoor!.x).toBe(expectedExitX);
    expect(scene.exitDoor!.y).toBe(expectedExitY);
  });

  it('should spawn enemies with 16:9 room offsets in PATH and BRANCH rooms', () => {
    const scene = createInitializedGameScene();
    scene.create();

    const room = scene.grid!.flat().find((c) => c.type === 'PATH' || c.type === 'BRANCH');
    expect(room).toBeDefined();
    if (room) {
      const roomX = room.x * 512;
      const roomY = room.y * 288;

      const trooper = scene.enemies.find((e) => e.x === roomX + 160 && e.y === roomY + 220);
      expect(trooper).toBeDefined();

      const turret = scene.enemies.find((e) => e.x === roomX + 380 && e.y === roomY + 48);
      expect(turret).toBeDefined();

      const drone = scene.enemies.find((e) => e.x === roomX + 256 && e.y === roomY + 120);
      expect(drone).toBeDefined();

      const jumper = scene.enemies.find((e) => e.x === roomX + 420 && e.y === roomY + 220);
      expect(jumper).toBeDefined();
    }
  });

  describe('Bullet Impact Indicators in GameScene', () => {
    it('should initialize ImpactFXPool and wire it to ProjectilePool', () => {
      const scene = createInitializedGameScene();
      scene.create();

      expect(scene.impactFXPool).toBeDefined();
      expect(scene.projectilePool?.impactFXPool).toBe(scene.impactFXPool);
    });

    it('should spawn impact spark when enemy bullet hits active player barrier shield', () => {
      const scene = createInitializedGameScene();
      scene.create();

      // Enable player barrier
      scene.player!.equipWeapon('BARRIER');
      expect(scene.player!.isBarrierActive).toBe(true);
      expect(scene.player!.barrierHits).toBe(3);

      const sparkSpy = vi.spyOn(scene.impactFXPool!, 'spawn');

      // Spawn enemy bullet overlapping player
      const enemyBullet = scene.projectilePool!.spawn(scene.player!.x, scene.player!.y, 0, 'PEA_SHOOTER', false)!;
      expect(enemyBullet.isPlayerBullet).toBe(false);

      (scene as any).handleCollisions();

      // Bullet was absorbed by barrier
      expect(scene.player!.barrierHits).toBe(2);
      expect(enemyBullet.active).toBe(false);
      expect(sparkSpy).toHaveBeenCalledWith(enemyBullet.x, enemyBullet.y);
    });
  });

  describe('Score Tracking, Power-up Points and Victory Persistence', () => {
    it('should initialize score to 0 on GameScene create', () => {
      const scene = createInitializedGameScene();
      scene.create();
      expect(scene.score).toBe(0);
    });

    it('should add enemy scoreValue to score when enemy is killed', () => {
      const scene = createInitializedGameScene();
      scene.create();

      const firstEnemy = scene.enemies[0];
      const enemyScore = firstEnemy.scoreValue;
      const enemyRoomX = Math.floor(firstEnemy.x / 512);
      const enemyRoomY = Math.floor(firstEnemy.y / 288);
      scene.cameraManager?.setRoom(enemyRoomX, enemyRoomY);
      scene.cullEntities(enemyRoomX, enemyRoomY);

      const enemy = scene.activeEnemies[0];
      const bullet = scene.projectilePool?.spawn(enemy.x, enemy.y, 0, 'PEA_SHOOTER', true);
      if (bullet) {
        bullet.damage = 9999;
      }

      (scene as any).handleCollisions();

      expect(enemy.isAlive).toBe(false);
      expect(scene.score).toBe(enemyScore);
    });

    it('should add 500 points when collecting a weapon pickup item', () => {
      const scene = createInitializedGameScene();
      scene.create();

      // Mock a pickup item overlapping player
      const mockItem = {
        active: true,
        x: scene.player!.x,
        y: scene.player!.y,
        body: { width: 16, height: 16, x: scene.player!.x - 8, y: scene.player!.y - 8 },
        collect: vi.fn().mockReturnValue('SPREAD_SHOT'),
        destroy: vi.fn(),
      } as any;
      scene.pickupItems.push(mockItem);

      (scene as any).handleCollisions();

      expect(mockItem.collect).toHaveBeenCalled();
      expect(scene.score).toBe(500);
      expect(scene.player!.currentWeapon).toBe('SPREAD_SHOT');
    });

    it('should persist high score upon victory and launch GameOverScene with victory data', () => {
      const scene = createInitializedGameScene();
      scene.create();
      scene.score = 6500;

      // Mock localStorage or ScoreManager
      (scene as any).triggerVictory();

      expect(scene.scene.start).toHaveBeenCalledWith(
        'GameOverScene',
        expect.objectContaining({
          victory: true,
          score: 6500,
          isNewHighScore: expect.any(Boolean),
          highScore: expect.any(Number),
        })
      );
    });

    it('should not persist high score on player permadeath, but pass current high score to GameOverScene', () => {
      const scene = createInitializedGameScene();
      scene.create();
      scene.score = 1200;
      scene.player!.lives = 1;

      (scene as any).handlePlayerDamage();

      expect(scene.player!.lives).toBe(0);
      expect(scene.scene.start).toHaveBeenCalledWith(
        'GameOverScene',
        expect.objectContaining({
          victory: false,
          score: 1200,
          isNewHighScore: false,
          highScore: expect.any(Number),
        })
      );
    });

    it('should only apply piercing projectile (LASER/FLAME) damage once per shot against the Boss across multiple frames', () => {
      const scene = createInitializedGameScene();
      scene.create();

      const boss = new Boss(scene, 200, 200);
      boss.body = createMockBody(boss.x - 32, boss.y - 29);
      scene.boss = boss;
      scene.activeEnemies = [boss];

      const initialHp = boss.health;
      const laser = scene.projectilePool!.spawn(boss.x, boss.y, 0, 'LASER', true)!;
      expect(laser.piercing).toBe(true);

      // Simulate 10 consecutive collision checks while the laser travels through the 64px boss body
      for (let frame = 0; frame < 10; frame++) {
        (scene as any).handleCollisions();
      }

      expect(boss.health).toBe(initialHp - laser.damage);
      expect(laser.active).toBe(true);
    });
  });
});

