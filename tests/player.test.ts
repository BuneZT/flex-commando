import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { Player, canPlayerDropThrough, shouldCollideWithTile } from '../src/entities/Player';
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
    expect(body.width).toBe(20);
    expect(body.height).toBe(10);
    expect(body.offset.x).toBe(2);
    expect(body.offset.y).toBe(14);
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
    expect(player.getMuzzleOffset({ aimDirection: 'UP_FORWARD', facingLeft: false, isCrouching: false })).toEqual({ x: 10, y: -11 });
    // Up straight (-90 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'UP', facingLeft: false, isCrouching: false })).toEqual({ x: 2, y: -16 });
    // Down-forward right (45 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'DOWN_FORWARD', facingLeft: false, isCrouching: false })).toEqual({ x: 10, y: 6 });
    // Down straight right (90 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'DOWN', facingLeft: false, isCrouching: false })).toEqual({ x: 2, y: 8 });

    // Facing left (180 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'FORWARD', facingLeft: true, isCrouching: false })).toEqual({ x: -12, y: -4 });
    // Up-forward left (-135 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'UP_FORWARD', facingLeft: true, isCrouching: false })).toEqual({ x: -10, y: -11 });
    // Up straight left (-90 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'UP', facingLeft: true, isCrouching: false })).toEqual({ x: -2, y: -16 });
    // Down-forward left (135 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'DOWN_FORWARD', facingLeft: true, isCrouching: false })).toEqual({ x: -10, y: 6 });
    // Down straight left (90 deg)
    expect(player.getMuzzleOffset({ aimDirection: 'DOWN', facingLeft: true, isCrouching: false })).toEqual({ x: -2, y: 8 });

    // Crouching (lowered prone rifle barrel)
    expect(player.getMuzzleOffset({ isCrouching: true, facingLeft: false })).toEqual({ x: 12, y: 6 });
    expect(player.getMuzzleOffset({ isCrouching: true, facingLeft: true })).toEqual({ x: -12, y: 6 });
  });

  it('should safely guard anims and select correct animation keys across all aiming angles and firing states', () => {
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

    // Crouch idle
    player.updatePlayer({ up: false, down: true, left: false, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_crouch');

    // Crouch shoot (firing active)
    player.firingFlashTimer = 60;
    player.updatePlayer({ up: false, down: true, left: false, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_crouch_shoot');

    // Aim Up standing
    player.firingFlashTimer = 0;
    player.updatePlayer({ up: true, down: false, left: false, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_aim_up');

    // Shoot Up standing
    player.firingFlashTimer = 60;
    player.updatePlayer({ up: true, down: false, left: false, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_shoot_up');

    // Aim Up-Forward standing
    player.firingFlashTimer = 0;
    // We test facing right with up and right released or aiming up-forward
    player.aimDirection = 'UP_FORWARD';
    player.updatePlayer({ up: true, down: false, left: false, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    // Note: if input.up without left/right, calculateAimDirection gives UP. If mouse/preset UP_FORWARD:
    expect(playedAnim).toBe('player_aim_up');

    // Airborne Aim Down-Forward
    (body as any).blocked.down = false;
    (body as any).touching.down = false;
    player.firingFlashTimer = 0;
    player.updatePlayer({ up: false, down: true, left: true, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_aim_down_forward');

    // Airborne Shoot Down-Forward
    player.firingFlashTimer = 60;
    player.updatePlayer({ up: false, down: true, left: true, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_shoot_down_forward');

    // Airborne neutral Jump
    player.firingFlashTimer = 0;
    player.updatePlayer({ up: false, down: false, left: false, right: false, jump: false, jumpJustPressed: false, shoot: false, shootJustPressed: false });
    expect(playedAnim).toBe('player_jump');
  });

  describe('Drop-Through Platform logic', () => {
    function createMockGroundLayer(tileMatrix: number[][]) {
      return {
        getTileAt: (tileX: number, tileY: number) => {
          if (tileY < 0 || tileY >= tileMatrix.length) return null;
          if (tileX < 0 || tileX >= (tileMatrix[tileY]?.length || 0)) return null;
          const index = tileMatrix[tileY][tileX];
          return { index };
        },
      };
    }

    it('should determine whether collision should occur using shouldCollideWithTile', () => {
      // When not dropping through, all solid/platform tiles collide
      expect(shouldCollideWithTile(false, 1)).toBe(true);
      expect(shouldCollideWithTile(false, 2)).toBe(true);
      expect(shouldCollideWithTile(false, 3)).toBe(true);

      // When dropping through, ONLY Tile 2 (one-way platform) is ignored; solid ground (1) and walls (3) STILL COLLIDE
      expect(shouldCollideWithTile(true, 1)).toBe(true);
      expect(shouldCollideWithTile(true, 2)).toBe(false);
      expect(shouldCollideWithTile(true, 3)).toBe(true);
    });

    it('should allow dropping through only when standing on Tile 2 platforms, not solid ground (Tile 1)', () => {
      // 18 rows x 32 cols matrix
      // Row 17: cols 0-13 are 1 (solid ground), cols 14-17 are 2 (south door platform), cols 18-31 are 1 (solid ground)
      const matrix: number[][] = Array.from({ length: 18 }, () => new Array(32).fill(0));
      for (let c = 0; c < 32; c++) {
        matrix[17][c] = (c >= 14 && c <= 17) ? 2 : 1;
      }
      const layer = createMockGroundLayer(matrix);

      // Player feet resting at row 17 (y = 17 * 16 = 272). Height = 14 (crouch), so body.y = 258, body.height = 14
      // 1. Column 5: solid ground (Tile 1)
      const onSolidGround = { x: 5 * 16, y: 258, width: 16, height: 14 };
      expect(canPlayerDropThrough(onSolidGround, layer)).toBe(false);

      // 2. Column 15: designated south exit shaft (Tile 2)
      const onSouthDoorHatch = { x: 15 * 16, y: 258, width: 16, height: 14 };
      expect(canPlayerDropThrough(onSouthDoorHatch, layer)).toBe(true);

      // 3. Straddling edge between solid ground (col 13) and platform (col 14) -> must disallow drop
      const onBoundary = { x: 13 * 16 + 8, y: 258, width: 16, height: 14 };
      expect(canPlayerDropThrough(onBoundary, layer)).toBe(false);

      // 4. In mid-air (empty air at row 10)
      const inAir = { x: 15 * 16, y: 10 * 16, width: 16, height: 14 };
      expect(canPlayerDropThrough(inAir, layer)).toBe(false);

      // 5. Missing or invalid layer
      expect(canPlayerDropThrough(onSouthDoorHatch, null)).toBe(false);
    });

    it('should NOT activate isDroppingThrough and NOT disable body collision down when on solid ground (Tile 1)', () => {
      const mockScene = createMockScene();
      const player = new Player(mockScene, 80, 272 - 11);
      const body = createMockBody();
      (body as any).x = 80 - 8;
      (body as any).y = 272 - 22;
      player.body = body;

      // Solid ground layer (all Tile 1)
      const matrix: number[][] = Array.from({ length: 18 }, () => new Array(32).fill(1));
      const layer = createMockGroundLayer(matrix);
      player.groundLayer = layer as any;

      const input: RawInputState = {
        up: false,
        down: true,
        left: false,
        right: false,
        jump: true,
        jumpJustPressed: true,
        shoot: false,
        shootJustPressed: false,
      };

      player.updatePlayer(input, 16);

      // Player must NOT drop through solid ground!
      expect(player.isDroppingThrough).toBe(false);
      // checkCollision.down must remain true (solid ground collision preserved!)
      expect(body.checkCollision.down).toBe(true);
    });

    it('should activate isDroppingThrough when on designated one-way platform (Tile 2), while preserving checkCollision.down = true', () => {
      const mockScene = createMockScene();
      // Position player at row 17 col 15 (south door one-way platform)
      const player = new Player(mockScene, 15 * 16 + 8, 272 - 11);
      const body = createMockBody();
      (body as any).x = 15 * 16;
      (body as any).y = 272 - 22;
      player.body = body;

      // South door matrix (Tile 2 at cols 14-17)
      const matrix: number[][] = Array.from({ length: 18 }, () => new Array(32).fill(0));
      for (let c = 0; c < 32; c++) {
        matrix[17][c] = (c >= 14 && c <= 17) ? 2 : 1;
      }
      const layer = createMockGroundLayer(matrix);
      player.groundLayer = layer as any;

      const input: RawInputState = {
        up: false,
        down: true,
        left: false,
        right: false,
        jump: true,
        jumpJustPressed: true,
        shoot: false,
        shootJustPressed: false,
      };

      player.updatePlayer(input, 16);

      // Player CAN drop through designated one-way platform
      expect(player.isDroppingThrough).toBe(true);
      // Crucial: checkCollision.down must NOT be disabled globally (it stays true so solid ground below still stops the player)
      expect(body.checkCollision.down).toBe(true);

      // Timer decrements and resets after 250ms
      player.updatePlayer({ ...input, jumpJustPressed: false }, 260);
      expect(player.isDroppingThrough).toBe(false);
      expect(body.checkCollision.down).toBe(true);
    });
  });

  describe('Player Death Sequence', () => {
    it('launches player into backward-upward knockback arc on triggerDeath and settles prone when grounded', () => {
      const mockScene = createMockScene();
      const player = new Player(mockScene, 200, 200);
      const body = createMockBody();
      player.body = body;
      player.facingLeft = false; // facing right -> knockback should be left (-90)

      expect(player.isDead).toBe(false);
      player.triggerDeath();

      expect(player.isDead).toBe(true);
      expect(body.velocity.x).toBe(-90);
      expect(body.velocity.y).toBe(-220);

      // Airborne tumble update
      (body as any).blocked.down = false;
      (body as any).touching.down = false;
      player.updateDeath(16);
      expect(body.velocity.x).toBe(-90);

      // Landing on ground settles into prone frame and stops horizontal slide
      (body as any).blocked.down = true;
      (body as any).touching.down = true;
      body.setVelocityY(0);
      player.updateDeath(16);
      expect(body.velocity.x).toBe(0);
    });
  });
});
