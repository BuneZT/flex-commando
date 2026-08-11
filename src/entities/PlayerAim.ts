export type AimDirection = 'FORWARD' | 'UP' | 'UP_FORWARD' | 'DOWN_FORWARD' | 'DOWN' | 'CROUCH';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  isGrounded: boolean;
  facingLeft: boolean;
}

export function calculateAimDirection(input: InputState): AimDirection {
  const movingHoriz = input.left || input.right;
  if (input.up) {
    return movingHoriz ? 'UP_FORWARD' : 'UP';
  }
  if (input.down) {
    if (input.isGrounded) {
      return movingHoriz ? 'DOWN_FORWARD' : 'CROUCH';
    }
    return movingHoriz ? 'DOWN_FORWARD' : 'DOWN';
  }
  return 'FORWARD';
}

export function getAimAngleDegrees(aim: AimDirection, facingLeft: boolean): number {
  if (facingLeft) {
    switch (aim) {
      case 'FORWARD':
      case 'CROUCH':
        return 180;
      case 'UP_FORWARD':
        return -135;
      case 'UP':
        return -90;
      case 'DOWN_FORWARD':
        return 135;
      case 'DOWN':
        return 90;
    }
  } else {
    switch (aim) {
      case 'FORWARD':
      case 'CROUCH':
        return 0;
      case 'UP_FORWARD':
        return -45;
      case 'UP':
        return -90;
      case 'DOWN_FORWARD':
        return 45;
      case 'DOWN':
        return 90;
    }
  }
}
