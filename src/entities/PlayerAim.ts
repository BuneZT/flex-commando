export type AimDirection = 'FORWARD' | 'UP' | 'UP_FORWARD' | 'DOWN_FORWARD' | 'DOWN';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  isGrounded: boolean;
  facingLeft: boolean;
}

export function calculateAimDirection(
  up: boolean,
  down: boolean,
  left: boolean,
  right: boolean
): AimDirection {
  const movingHoriz = left || right;
  if (up) {
    return movingHoriz ? 'UP_FORWARD' : 'UP';
  }
  if (down) {
    return movingHoriz ? 'DOWN_FORWARD' : 'DOWN';
  }
  return 'FORWARD';
}

export function getAimAngleDegrees(aim: AimDirection, facingLeft: boolean): number {
  if (facingLeft) {
    switch (aim) {
      case 'FORWARD':
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
