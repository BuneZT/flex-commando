import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
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
  let offsetX = 0;
  let offsetY = 0;
  let velX = 0;
  let velY = 0;

  return {
    get width() { return width; },
    get height() { return height; },
    get offsetX() { return offsetX; },
    get offsetY() { return offsetY; },
    get velocityX() { return velX; },
    get velocityY() { return velY; },
    setCollideWorldBounds: () => {},
    setSize: (w: number, h: number) => { width = w; height = h; },
    setOffset: (x: number, y: number) => { offsetX = x; offsetY = y; },
    setVelocityX: (vx: number) => { velX = vx; },
    setVelocityY: (vy: number) => { velY = vy; },
    blocked: { down: true },
    touching: { down: true },
    checkCollision: { down: true },
  } as unknown as Phaser.Physics.Arcade.Body;
}

describe('Player entity', () => {
  it('should initialize with default properties and default texture key', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    expect(player.lives).toBe(3);
    expect(player.aimDirection).toBe('FORWARD');
    expect(player.facingLeft).toBe(false);
    expect(player.isCrouching).toBe(false);
    expect(player.texture.key).toBe('tex_player');
  });

  it('should update aiming and facing direction when moving left', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    player.body = createMockBody();

    const input: RawInputState = {
      up: true,
      down: false,
      left: true,
      right: false,
      jump: false,
      jumpJustPressed: false,
      shoot: false,
      shootJustPressed: false,
    };
    player.updatePlayer(input);
    expect(player.facingLeft).toBe(true);
    expect(player.aimDirection).toBe('UP_FORWARD');
    expect(player.getAimAngle()).toBe(-135);
  });

  it('should handle crouching state', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    const body = createMockBody();
    player.body = body;

    const input: RawInputState = {
      up: false,
      down: true,
      left: false,
      right: false,
      jump: false,
      jumpJustPressed: false,
      shoot: false,
      shootJustPressed: false,
    };
    player.updatePlayer(input);
    expect(player.isCrouching).toBe(true);
    expect(player.aimDirection).toBe('CROUCH');
    expect(body.height).toBe(12);
  });

  it('should calculate muzzle position correctly', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    player.facingLeft = false;
    player.aimDirection = 'FORWARD';

    const pos = player.getMuzzlePosition();
    expect(pos.x).toBeGreaterThan(100);
    expect(pos.y).toBe(96);
  });
});
