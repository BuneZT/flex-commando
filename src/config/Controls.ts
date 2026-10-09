import Phaser from 'phaser';

export interface RawInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
  shoot: boolean;
  shootJustPressed: boolean;
  mouseX?: number;
  mouseY?: number;
}

export class Controls {
  private scene: Phaser.Scene;
  private wasPointerDown: boolean = false;
  private keys: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };

  private cachedInputState: RawInputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
    jumpJustPressed: false,
    shoot: false,
    shootJustPressed: false,
    mouseX: 0,
    mouseY: 0,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!scene.input || !scene.input.keyboard) {
      throw new Error('Scene input keyboard is missing.');
    }
    const keyboard = scene.input.keyboard;
    this.keys = {
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };
  }

  private tempWorldPoint: { x: number; y: number } = { x: 0, y: 0 };

  public getInputState(camera?: Phaser.Cameras.Scene2D.Camera): RawInputState {
    const pointer = this.scene.input?.activePointer;
    let isPointerDown = false;
    let mouseX = 0;
    let mouseY = 0;

    if (pointer) {
      isPointerDown = pointer.isDown;
      if (camera && typeof camera.getWorldPoint === 'function') {
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y, this.tempWorldPoint as any);
        mouseX = worldPoint.x;
        mouseY = worldPoint.y;
      } else {
        mouseX = pointer.worldX ?? pointer.x ?? 0;
        mouseY = pointer.worldY ?? pointer.y ?? 0;
      }
    }

    this.cachedInputState.up = this.keys.w.isDown || this.keys.up.isDown;
    this.cachedInputState.down = this.keys.s.isDown || this.keys.down.isDown;
    this.cachedInputState.left = this.keys.a.isDown || this.keys.left.isDown;
    this.cachedInputState.right = this.keys.d.isDown || this.keys.right.isDown;
    this.cachedInputState.jump = this.keys.space.isDown || this.keys.w.isDown || this.keys.up.isDown;
    this.cachedInputState.jumpJustPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.up);
    this.cachedInputState.shoot = isPointerDown;
    this.cachedInputState.shootJustPressed = isPointerDown && !this.wasPointerDown;
    this.wasPointerDown = isPointerDown;
    this.cachedInputState.mouseX = mouseX;
    this.cachedInputState.mouseY = mouseY;

    return this.cachedInputState;
  }
}
