import { describe, it, expect } from 'vitest';
import { formatHUDLives } from '../src/ui/HUD';
import { Boss } from '../src/entities/enemies/Boss';

function createMockScene() {
  return {
    sys: {
      queueDepthSort: () => {},
      displayList: { add: () => {} },
      updateList: { add: () => {} },
      anims: { on: () => {}, once: () => {}, off: () => {} },
      textures: { get: () => ({ get: () => ({}) }) },
    },
    add: { existing: () => {} },
    physics: { add: { existing: () => {} } },
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
});

