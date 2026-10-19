import { describe, it, expect } from 'vitest';
import { GameScene } from '../src/scenes/GameScene';
import { Player } from '../src/entities/Player';

describe('GameScene Infinite Lives', () => {
  it('should initialize infiniteLives property from scene init data', () => {
    const scene = new GameScene();
    scene.init({ infiniteLives: true });
    expect(scene.infiniteLives).toBe(true);
  });

  it('should not decrement player lives when handlePlayerDamage is called in infinite lives mode', () => {
    const scene = new GameScene();
    scene.init({ infiniteLives: true });
    scene.player = { lives: 3, hitBarrier: () => false } as unknown as Player;
    scene.invulnerableTimer = 0;
    scene.isGameOver = false;

    scene.handlePlayerDamage();
    expect(scene.player.lives).toBe(3);
    expect(scene.isGameOver).toBe(false);
    expect(scene.invulnerableTimer).toBe(1500);
  });

  it('should position player at 512x288 start room coordinates with infinite lives', () => {
    const scene = new GameScene();
    scene.init({ infiniteLives: true });
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
    expect(scene.player!.x).toBe(startRoom.x * 512 + 120);
    expect(scene.player!.y).toBe(startRoom.y * 288 + 220);
    expect(scene.infiniteLives).toBe(true);
  });
});

