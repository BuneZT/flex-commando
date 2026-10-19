import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImpactFXPool } from '../src/core/ImpactFXPool';

describe('ImpactFXPool', () => {
  let mockScene: any;
  let mockSprites: any[];

  beforeEach(() => {
    mockSprites = [];
    mockScene = {
      add: {
        sprite: vi.fn((x: number, y: number, texture: string) => {
          const sprite: any = {
            x,
            y,
            texture,
            active: true,
            visible: true,
            depth: 0,
            setActive: vi.fn((a: boolean) => {
              sprite.active = a;
              return sprite;
            }),
            setVisible: vi.fn((v: boolean) => {
              sprite.visible = v;
              return sprite;
            }),
            setPosition: vi.fn((newX: number, newY: number) => {
              sprite.x = newX;
              sprite.y = newY;
              return sprite;
            }),
            setDepth: vi.fn((d: number) => {
              sprite.depth = d;
              return sprite;
            }),
            anims: {
              play: vi.fn().mockReturnThis(),
            },
            once: vi.fn((event: string, cb: () => void) => {
              sprite._listeners = sprite._listeners || {};
              sprite._listeners[event] = cb;
              return sprite;
            }),
            _triggerEvent: (event: string) => {
              if (sprite._listeners && sprite._listeners[event]) {
                sprite._listeners[event]();
              }
            },
            destroy: vi.fn(),
          };
          mockSprites.push(sprite);
          return sprite;
        }),
      },
    };
  });

  it('allocates a sprite on spawn, activates it, and plays bullet_impact_spark', () => {
    const pool = new ImpactFXPool(mockScene, 10);
    const spark = pool.spawn(120, 80);

    expect(spark).not.toBeNull();
    expect(mockScene.add.sprite).toHaveBeenCalledWith(120, 80, 'tex_bullet_impact');
    expect(spark?.active).toBe(true);
    expect(spark?.visible).toBe(true);
    expect(spark?.setDepth).toHaveBeenCalledWith(50);
    expect(spark?.anims.play).toHaveBeenCalledWith('bullet_impact_spark');
  });

  it('deactivates sprite when animationcomplete is triggered', () => {
    const pool = new ImpactFXPool(mockScene, 10);
    const spark: any = pool.spawn(100, 50);

    expect(spark.active).toBe(true);
    expect(spark.visible).toBe(true);
    expect(spark.once).toHaveBeenCalledWith('animationcomplete', expect.any(Function));

    // Simulate animation completing
    spark._triggerEvent('animationcomplete');

    expect(spark.setActive).toHaveBeenCalledWith(false);
    expect(spark.setVisible).toHaveBeenCalledWith(false);
    expect(spark.active).toBe(false);
  });

  it('reuses inactive sprites without allocating new ones', () => {
    const pool = new ImpactFXPool(mockScene, 10);
    const spark1: any = pool.spawn(10, 20);
    expect(mockSprites.length).toBe(1);

    // Complete first spark animation
    spark1._triggerEvent('animationcomplete');
    expect(spark1.active).toBe(false);

    // Second spawn should reuse spark1
    const spark2 = pool.spawn(50, 60);
    expect(spark2).toBe(spark1);
    expect(mockSprites.length).toBe(1); // No new sprite instantiated
    expect(spark1.setPosition).toHaveBeenCalledWith(50, 60);
    expect(spark1.setActive).toHaveBeenCalledWith(true);
    expect(spark1.setVisible).toHaveBeenCalledWith(true);
    expect(spark1.anims.play).toHaveBeenCalledWith('bullet_impact_spark');
  });

  it('does not exceed maxSize when all sprites are active', () => {
    const pool = new ImpactFXPool(mockScene, 3);
    const s1 = pool.spawn(1, 1);
    const s2 = pool.spawn(2, 2);
    const s3 = pool.spawn(3, 3);
    expect(pool.pool.length).toBe(3);

    const s4 = pool.spawn(4, 4);
    // When saturated, it should either return null or gracefully handle it without exceeding maxSize
    expect(pool.pool.length).toBe(3);
    expect(s4).toBeNull();
  });

  it('clear() deactivates all active sprites in the pool', () => {
    const pool = new ImpactFXPool(mockScene, 5);
    const s1 = pool.spawn(10, 10);
    const s2 = pool.spawn(20, 20);
    expect(s1?.active).toBe(true);
    expect(s2?.active).toBe(true);

    pool.clear();

    expect(s1?.active).toBe(false);
    expect(s2?.active).toBe(false);
  });

  it('handles null/headless mock scenes safely without throwing', () => {
    const headlessPool = new ImpactFXPool({} as any, 5);
    expect(() => {
      const result = headlessPool.spawn(10, 10);
      expect(result).toBeNull();
    }).not.toThrow();

    expect(() => headlessPool.clear()).not.toThrow();
  });
});
