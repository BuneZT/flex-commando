import { describe, it, expect } from 'vitest';
import { GameScene } from '../src/scenes/GameScene';

describe('GameScene Level Seed Randomization', () => {
  it('should generate a random seed when no seed is provided in init()', () => {
    const scene1 = new GameScene();
    scene1.init();
    expect(typeof scene1.seed).toBe('number');
    expect(scene1.seed).toBeGreaterThanOrEqual(0);

    const scene2 = new GameScene();
    scene2.init();
    expect(typeof scene2.seed).toBe('number');
  });

  it('should use explicit seed when provided in init()', () => {
    const scene = new GameScene();
    scene.init({ seed: 42 });
    expect(scene.seed).toBe(42);
  });

  it('should place player and exit door at deterministic 512x288 positions based on seed', () => {
    const scene = new GameScene();
    scene.init({ seed: 42 });
    const mock = {
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
        sprite: (x = 0, y = 0) => ({ x, y, setScrollFactor: () => ({}), setDepth: () => ({}), setTint: () => ({}), clearTint: () => ({}), setAlpha: () => ({}) }),
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
      physics: { add: { existing: () => {}, group: () => ({ add: () => {} }), collider: () => {} }, world: { setBounds: () => {} } },
    } as any;
    scene.sys = mock.sys;
    scene.cameras = mock.cameras;
    scene.add = mock.add;
    scene.physics = mock.physics;

    scene.create();
    const startRoom = scene.grid!.flat().find((c) => c.type === 'START')!;
    const exitCell = scene.grid!.flat().find((c) => c.type === 'BOSS')!;

    expect(scene.player!.x).toBe(startRoom.x * 512 + 120);
    expect(scene.player!.y).toBe(startRoom.y * 288 + 220);
    expect(scene.exitDoor!.x).toBe(exitCell.x * 512 + 420);
    expect(scene.exitDoor!.y).toBe(exitCell.y * 288 + 220);
  });
});
