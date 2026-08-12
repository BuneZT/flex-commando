import { describe, it, expect, beforeEach } from 'vitest';
import { CameraManager } from '../src/core/CameraManager';

function createMockEnemy(x: number, y: number, isAlive: boolean = true, hasBody: boolean = true) {
  const enemy = {
    x,
    y,
    isAlive,
    active: true,
    visible: true,
    body: hasBody ? { enable: true } : undefined,
    setActive(val: boolean) {
      this.active = val;
      return this;
    },
    setVisible(val: boolean) {
      this.visible = val;
      return this;
    },
  };
  return enemy;
}

describe('CameraManager enemy spatial culling', () => {
  let mockCamera: any;
  let cameraManager: CameraManager;

  beforeEach(() => {
    mockCamera = {
      setBounds: () => {},
      centerOn: () => {},
      pan: () => {},
      removeBounds: () => {},
    };
    // Initialize CameraManager at room (0, 0)
    cameraManager = new CameraManager(mockCamera, 0, 0, 320, 240);
  });

  it('should activate enemies in active room and deactivate enemies in inactive rooms', () => {
    const enemyInRoom00 = createMockEnemy(100, 100, true);
    const enemyInRoom10 = createMockEnemy(400, 100, true);
    const enemyInRoom01 = createMockEnemy(100, 300, true);

    const enemies = [enemyInRoom00, enemyInRoom10, enemyInRoom01];

    cameraManager.cullEnemies(enemies);

    expect(enemyInRoom00.active).toBe(true);
    expect(enemyInRoom00.visible).toBe(true);
    expect(enemyInRoom00.body?.enable).toBe(true);

    expect(enemyInRoom10.active).toBe(false);
    expect(enemyInRoom10.visible).toBe(false);
    expect(enemyInRoom10.body?.enable).toBe(false);

    expect(enemyInRoom01.active).toBe(false);
    expect(enemyInRoom01.visible).toBe(false);
    expect(enemyInRoom01.body?.enable).toBe(false);
  });

  it('should update enemy culling state when camera moves to a new room cell', () => {
    const enemyInRoom00 = createMockEnemy(100, 100, true);
    const enemyInRoom10 = createMockEnemy(400, 100, true);

    const enemies = [enemyInRoom00, enemyInRoom10];

    // Camera moves to room (1, 0) (x = 350, y = 100)
    cameraManager.update(350, 100);
    cameraManager.cullEnemies(enemies);

    expect(enemyInRoom00.active).toBe(false);
    expect(enemyInRoom00.visible).toBe(false);
    expect(enemyInRoom00.body?.enable).toBe(false);

    expect(enemyInRoom10.active).toBe(true);
    expect(enemyInRoom10.visible).toBe(true);
    expect(enemyInRoom10.body?.enable).toBe(true);
  });

  it('should skip dead enemies (isAlive === false)', () => {
    const deadEnemy = createMockEnemy(100, 100, false);
    deadEnemy.active = false;
    deadEnemy.visible = false;
    if (deadEnemy.body) deadEnemy.body.enable = false;

    cameraManager.cullEnemies([deadEnemy]);

    // Should remain unchanged
    expect(deadEnemy.active).toBe(false);
    expect(deadEnemy.visible).toBe(false);
    expect(deadEnemy.body?.enable).toBe(false);
  });

  it('should handle enemies without a physics body gracefully', () => {
    const enemyWithoutBody = createMockEnemy(100, 100, true, false);
    const enemyOffscreenNoBody = createMockEnemy(400, 100, true, false);

    const enemies = [enemyWithoutBody, enemyOffscreenNoBody];

    expect(() => cameraManager.cullEnemies(enemies)).not.toThrow();

    expect(enemyWithoutBody.active).toBe(true);
    expect(enemyWithoutBody.visible).toBe(true);

    expect(enemyOffscreenNoBody.active).toBe(false);
    expect(enemyOffscreenNoBody.visible).toBe(false);
  });

  it('should return array of active enemies from cullEnemies', () => {
    const enemyInRoom00 = createMockEnemy(100, 100, true);
    const enemyInRoom10 = createMockEnemy(400, 100, true);
    const enemyInRoom01 = createMockEnemy(100, 300, true);

    const enemies = [enemyInRoom00, enemyInRoom10, enemyInRoom01];

    const activeEnemies = cameraManager.cullEnemies(enemies);

    expect(activeEnemies.length).toBe(1);
    expect(activeEnemies[0]).toBe(enemyInRoom00);
  });

  it('should populate provided outArray buffer in-place when provided', () => {
    const enemyInRoom00 = createMockEnemy(100, 100, true);
    const enemyInRoom10 = createMockEnemy(400, 100, true);

    const enemies = [enemyInRoom00, enemyInRoom10];
    const buffer: any[] = [];

    const res = cameraManager.cullEnemies(enemies, buffer);

    expect(res).toBe(buffer);
    expect(buffer.length).toBe(1);
    expect(buffer[0]).toBe(enemyInRoom00);
  });

  it('should set union camera bounds during room transitions', () => {
    const setBoundsCalls: any[] = [];
    let removeBoundsCalled = false;
    const customCameraMock: any = {
      setBounds: (x: number, y: number, w: number, h: number) => {
        setBoundsCalls.push({ x, y, w, h });
      },
      centerOn: () => {},
      pan: (targetX: number, targetY: number, duration: number, ease: string, force: boolean, callback: Function) => {
        // Mock pan triggering callback with progress 1
        if (callback) callback({}, 1);
      },
      removeBounds: () => {
        removeBoundsCalled = true;
      },
    };

    const cm = new CameraManager(customCameraMock, 0, 0, 320, 240);
    setBoundsCalls.length = 0; // clear initial call from constructor

    cm.transitionToRoom(1, 0, 400);

    // Initial bounds call should be union of room (0,0) [0,0,320,240] and room (1,0) [320,0,320,240] -> [0,0,640,240]
    expect(setBoundsCalls[0]).toEqual({ x: 0, y: 0, w: 640, h: 240 });
    // Final bounds call on completion should be target room (1,0) [320,0,320,240]
    expect(setBoundsCalls[1]).toEqual({ x: 320, y: 0, w: 320, h: 240 });
    expect(removeBoundsCalled).toBe(false);
  });
});
