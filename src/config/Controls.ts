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
}

export class Controls {
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
    x: Phaser.Input.Keyboard.Key;
    j: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene) {
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
      x: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      j: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
    };
  }

  public getInputState(): RawInputState {
    const up = this.keys.w.isDown || this.keys.up.isDown;
    const down = this.keys.s.isDown || this.keys.down.isDown;
    const left = this.keys.a.isDown || this.keys.left.isDown;
    const right = this.keys.d.isDown || this.keys.right.isDown;
    const jump = this.keys.space.isDown;
    const jumpJustPressed = Phaser.Input.Keyboard.JustDown(this.keys.space);
    const shoot = this.keys.x.isDown || this.keys.j.isDown;
    const shootJustPressed = Phaser.Input.Keyboard.JustDown(this.keys.x) || Phaser.Input.Keyboard.JustDown(this.keys.j);

    return {
      up,
      down,
      left,
      right,
      jump,
      jumpJustPressed,
      shoot,
      shootJustPressed,
    };
  }
}
