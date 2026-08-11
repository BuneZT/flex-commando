import Phaser from 'phaser';
import { AimDirection, calculateAimDirection, getAimAngleDegrees } from './PlayerAim';
import { RawInputState } from '../config/Controls';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public aimDirection: AimDirection = 'FORWARD';
  public facingLeft: boolean = false;
  public lives: number = 3;
  public moveSpeed: number = 120;
  public jumpVelocity: number = -260;
  public isCrouching: boolean = false;
  public isDroppingThrough: boolean = false;
  private dropThroughTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string = '') {
    super(scene, x, y, texture);
    if (scene.add && typeof scene.add.existing === 'function') {
      scene.add.existing(this);
    }
    if (scene.physics && scene.physics.add && typeof scene.physics.add.existing === 'function') {
      scene.physics.add.existing(this);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(true);
      body.setSize(16, 24);
      body.setOffset(0, 0);
    }
  }

  public updatePlayer(input: RawInputState, delta: number = 16): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    const isGrounded = body.blocked?.down || body.touching?.down || false;

    // Update Facing Direction
    if (input.left && !input.right) {
      this.facingLeft = true;
    } else if (input.right && !input.left) {
      this.facingLeft = false;
    }

    // Calculate Aim Direction
    this.aimDirection = calculateAimDirection({
      up: input.up,
      down: input.down,
      left: input.left,
      right: input.right,
      isGrounded,
      facingLeft: this.facingLeft,
    });

    this.isCrouching = this.aimDirection === 'CROUCH';

    // Handle Drop-Through Platform Timer
    if (this.isDroppingThrough) {
      this.dropThroughTimer -= delta;
      if (this.dropThroughTimer <= 0) {
        this.isDroppingThrough = false;
        if (body.checkCollision) {
          body.checkCollision.down = true;
        }
      }
    }

    // Handle Drop-Through platform trigger
    if (isGrounded && input.down && input.jumpJustPressed) {
      this.isDroppingThrough = true;
      this.dropThroughTimer = 250; // ms to pass through one-way platform
      if (body.checkCollision) {
        body.checkCollision.down = false;
      }
    } else if (isGrounded && input.jumpJustPressed && !this.isCrouching) {
      // Regular Jump
      body.setVelocityY(this.jumpVelocity);
    }

    // Horizontal Movement
    if (this.isCrouching) {
      body.setVelocityX(0);
      body.setSize(16, 12);
      body.setOffset(0, 12);
    } else {
      body.setSize(16, 24);
      body.setOffset(0, 0);

      if (input.left) {
        body.setVelocityX(-this.moveSpeed);
      } else if (input.right) {
        body.setVelocityX(this.moveSpeed);
      } else {
        body.setVelocityX(0);
      }
    }
  }

  public getAimAngle(): number {
    return getAimAngleDegrees(this.aimDirection, this.facingLeft);
  }

  public getMuzzlePosition(): { x: number; y: number } {
    const angleDeg = this.getAimAngle();
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const offsetX = Math.cos(angleRad) * 12;
    const offsetY = Math.sin(angleRad) * 12;
    const spawnY = this.isCrouching ? this.y + 4 : this.y - 4;
    return {
      x: this.x + offsetX,
      y: spawnY + offsetY,
    };
  }
}
