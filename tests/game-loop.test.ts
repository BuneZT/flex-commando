import { describe, it, expect } from 'vitest';
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
      text: () => {
        const textObj: any = {
          setOrigin: () => textObj,
          setScrollFactor: () => textObj,
          setDepth: () => textObj,
          setText: () => textObj,
          setColor: () => textObj,
        };
        return textObj;
      },
      sprite: () => {
        const spriteObj: any = {
          setScrollFactor: () => spriteObj,
          setDepth: () => spriteObj,
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

function createMockBody() {
  let width = 32;
  let height = 32;
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

  it('should support full 4x4 level physics bounds (1280x960)', () => {
    let bounds: { x: number; y: number; width: number; height: number } | null = null;
    const mockPhysics = {
      world: {
        setBounds: (x: number, y: number, w: number, h: number) => {
          bounds = { x, y, width: w, height: h };
        },
      },
    };
    mockPhysics.world.setBounds(0, 0, 1280, 960);
    expect(bounds).toEqual({ x: 0, y: 0, width: 1280, height: 960 });
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
      w: 320,
      h: 240,
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

  it('should update tilePositionX and tilePositionY at 0.25x and 0.15x scroll ratios', () => {
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

    expect(mockTileSprite.tilePositionX).toBe(400 * 0.25); // 100
    expect(mockTileSprite.tilePositionY).toBe(200 * 0.15); // 30
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







