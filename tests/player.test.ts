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
  let height = 22;
  let offsetX = 4;
  let offsetY = 2;
  let velX = 0;
  let velY = 0;

  return {
    get width() { return width; },
    get height() { return height; },
    get offset() { return { x: offsetX, y: offsetY }; },
    get velocityX() { return velX; },
    get velocityY() { return velY; },
    velocity: {
      get x() { return velX; },
      get y() { return velY; },
    },
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

  it('should shrink hitbox and enter crouch state when grounded and aiming down', () => {
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
    expect(player.aimDirection).toBe('DOWN');
    expect(player.isCrouching).toBe(true);
    expect(body.width).toBe(16);
    expect(body.height).toBe(14);
    expect(body.offset.x).toBe(4);
    expect(body.offset.y).toBe(10);
  });

  it('should maintain standing hitbox (16x22, offset 4,2) when standing or running', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    const body = createMockBody();
    player.body = body;

    player.updatePlayer({
      up: false,
      down: false,
      left: false,
      right: true,
      jump: false,
      jumpJustPressed: false,
      shoot: false,
      shootJustPressed: false,
    });
    expect(player.isCrouching).toBe(false);
    expect(body.width).toBe(16);
    expect(body.height).toBe(22);
    expect(body.offset.x).toBe(4);
    expect(body.offset.y).toBe(2);
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

  it('should have sufficient jump velocity to reach 80px high platform ledges', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    expect(Math.abs(player.jumpVelocity)).toBeGreaterThanOrEqual(340);
  });

  it('should aim and face toward mouse cursor when mouseX and mouseY are provided', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    player.body = createMockBody();

    // Aim left at muzzle pivot height (y = 96)
    player.updatePlayer({
      up: false,
      down: false,
      left: false,
      right: false,
      jump: false,
      jumpJustPressed: false,
      shoot: false,
      shootJustPressed: false,
      mouseX: 50,
      mouseY: 96,
    });
    expect(player.facingLeft).toBe(true);
    expect(Math.abs(player.getAimAngle())).toBeCloseTo(180, 0);

    // Aim right at muzzle pivot height (y = 96)
    player.updatePlayer({
      up: false,
      down: false,
      left: false,
      right: false,
      jump: false,
      jumpJustPressed: false,
      shoot: false,
      shootJustPressed: false,
      mouseX: 150,
      mouseY: 96,
    });
    expect(player.facingLeft).toBe(false);
    expect(player.getAimAngle()).toBeCloseTo(0, 0);

    // Aim straight up (above player's muzzle origin y = 96)
    player.updatePlayer({
      up: false,
      down: false,
      left: false,
      right: false,
      jump: false,
      jumpJustPressed: false,
      shoot: false,
      shootJustPressed: false,
      mouseX: 100,
      mouseY: 0,
    });
    expect(player.getAimAngle()).toBeCloseTo(-90, 0);
  });

  it('should allow strafing: move left while facing and aiming right toward mouse cursor', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    const body = createMockBody();
    player.body = body;

    player.updatePlayer({
      up: false,
      down: false,
      left: true,
      right: false,
      jump: false,
      jumpJustPressed: false,
      shoot: false,
      shootJustPressed: false,
      mouseX: 200,
      mouseY: 96,
    });

    // Character faces right because cursor is at x=200 (> player x=100)
    expect(player.facingLeft).toBe(false);
    // Character moves left because left key is held
    expect(body.velocity.x).toBe(-120);
    // Aim angle points towards cursor
    expect(player.getAimAngle()).toBeCloseTo(0, 0);
  });

  it('should calibrate getMuzzleOffset accurately across all 8 directions and crouching', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);

    // Facing right (0 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'FORWARD', facingLeft: false, isCrouching: false })).toEqual({ x: 12, y: -4 });
    // Up-forward right (-45 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'UP_FORWARD', facingLeft: false, isCrouching: false })).toEqual({ x: 9, y: -12 });
    // Up straight (-90 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'UP', facingLeft: false, isCrouching: false })).toEqual({ x: 2, y: -16 });
    // Down-forward right (45 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'DOWN_FORWARD', facingLeft: false, isCrouching: false })).toEqual({ x: 9, y: 4 });
    // Down straight right (90 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'DOWN', facingLeft: false, isCrouching: false })).toEqual({ x: 2, y: 8 });

    // Facing left (180 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'FORWARD', facingLeft: true, isCrouching: false })).toEqual({ x: -12, y: -4 });
    // Up-forward left (-135 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'UP_FORWARD', facingLeft: true, isCrouching: false })).toEqual({ x: -9, y: -12 });
    // Up straight left (-90 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'UP', facingLeft: true, isCrouching: false })).toEqual({ x: -2, y: -16 });
    // Down-forward left (135 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'DOWN_FORWARD', facingLeft: true, isCrouching: false })).toEqual({ x: -9, y: 4 });
    // Down straight left (90 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'DOWN', facingLeft: true, isCrouching: false })).toEqual({ x: -2, y: 8 });

    // Crouching (lowered rifle barrel)
    expect(player.getMuzzleOffset({ isCrouching: true, facingLeft: false })).toEqual({ x: 12, y: 2 });
    expect(player.getMuzzleOffset({ isCrouching: true, facingLeft: true })).toEqual({ x: -12, y: 2 });
  });

  it('should safely guard anims and select correct animation keys', () => {
    const mockScene = createMockScene();
    const player = new Player(mockScene, 100, 100);
    const body = createMockBody();
    player.body = body;

    let playedAnim = '';
    player.anims = {
      play: (key: string) => { playedAnim = key; },
      currentAnim: null,
    } as any;
    (mockScene.sys.anims as any).exists = () => true;

    // Idle
    player.updatePlayer({ up: false, down: false, left: false, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_idle');

    // Run
    player.updatePlayer({ up: false, down: false, left: true, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_run');

    // Crouch
    player.updatePlayer({ up: false, down: true, left: false, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_crouch');

    // Jump (airborne)
    (body as any).blocked.down = false;
    (body as any).touching.down = false;
    player.updatePlayer({ up: false, down: false, left: false, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_jump');
  });
});
