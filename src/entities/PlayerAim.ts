export type AimDirection = 'FORWARD' | 'UP' | 'UP_FORWARD' | 'DOWN_FORWARD' | 'DOWN';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  isGrounded: boolean;
  facingLeft: boolean;
}

/**
 * Calculates the exact angle in degrees from (originX, originY) to (targetX, targetY).
 * 0° = right, 90° = down, 180°/-180° = left, -90° = up.
 */
export function calculateMouseAimAngle(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number
): number {
  const dx = targetX - originX;
  const dy = targetY - originY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Determines facing direction based on mouse X position relative to origin X.
 * Returns true if facing left, false if facing right.
 * If targetX is equal to originX, maintains the current facing direction.
 */
export function calculateFacingDirection(
  originX: number,
  targetX: number,
  currentFacingLeft: boolean = false
): boolean {
  if (targetX < originX) {
    return true;
  }
  if (targetX > originX) {
    return false;
  }
  return currentFacingLeft;
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
