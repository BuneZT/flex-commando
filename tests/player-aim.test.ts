import { describe, it, expect } from 'vitest';
import {
  calculateAimDirection,
  getAimAngleDegrees,
  calculateMouseAimAngle,
  calculateFacingDirection,
} from '../src/entities/PlayerAim';

describe('calculateMouseAimAngle', () => {
  it('should calculate accurate 360-degree angles relative to origin', () => {
    // Direct right
    expect(calculateMouseAimAngle(100, 100, 200, 100)).toBeCloseTo(0, 1);
    // Direct down
    expect(calculateMouseAimAngle(100, 100, 100, 200)).toBeCloseTo(90, 1);
    // Direct left
    expect(Math.abs(calculateMouseAimAngle(100, 100, 0, 100))).toBeCloseTo(180, 1);
    // Direct up
    expect(calculateMouseAimAngle(100, 100, 100, 0)).toBeCloseTo(-90, 1);

    // Diagonals
    expect(calculateMouseAimAngle(100, 100, 200, 200)).toBeCloseTo(45, 1);
    expect(calculateMouseAimAngle(100, 100, 200, 0)).toBeCloseTo(-45, 1);
    expect(calculateMouseAimAngle(100, 100, 0, 200)).toBeCloseTo(135, 1);
    expect(calculateMouseAimAngle(100, 100, 0, 0)).toBeCloseTo(-135, 1);

    // Arbitrary angle (e.g. 30 degrees down-right)
    const rad30 = (30 * Math.PI) / 180;
    const targetX = 100 + Math.cos(rad30) * 50;
    const targetY = 100 + Math.sin(rad30) * 50;
    expect(calculateMouseAimAngle(100, 100, targetX, targetY)).toBeCloseTo(30, 1);
  });
});

describe('calculateFacingDirection', () => {
  it('should return true when target is to the left of origin', () => {
    expect(calculateFacingDirection(100, 50)).toBe(true);
  });

  it('should return false when target is to the right of origin', () => {
    expect(calculateFacingDirection(100, 150)).toBe(false);
  });

  it('should preserve previous facing direction when targetX equals originX', () => {
    expect(calculateFacingDirection(100, 100, true)).toBe(true);
    expect(calculateFacingDirection(100, 100, false)).toBe(false);
  });
});

describe('calculateAimDirection', () => {
  it('should return UP when holding Up key without left/right', () => {
    const aim = calculateAimDirection(true, false, false, false);
    expect(aim).toBe('UP');
  });

  it('should return UP_FORWARD when holding Up key with horizontal movement', () => {
    const aimRight = calculateAimDirection(true, false, false, true);
    expect(aimRight).toBe('UP_FORWARD');

    const aimLeft = calculateAimDirection(true, false, true, false);
    expect(aimLeft).toBe('UP_FORWARD');
  });

  it('should return DOWN when holding Down key on ground without horizontal movement', () => {
    const aim = calculateAimDirection(false, true, false, false);
    expect(aim).toBe('DOWN');
  });

  it('should return DOWN_FORWARD when holding Down key with horizontal movement on ground', () => {
    const aim = calculateAimDirection(false, true, false, true);
    expect(aim).toBe('DOWN_FORWARD');
  });

  it('should return DOWN when holding Down key in air without horizontal movement', () => {
    const aim = calculateAimDirection(false, true, false, false);
    expect(aim).toBe('DOWN');
  });

  it('should return DOWN_FORWARD when holding Down key in air with horizontal movement', () => {
    const aim = calculateAimDirection(false, true, true, false);
    expect(aim).toBe('DOWN_FORWARD');
  });

  it('should return FORWARD when no vertical key is pressed', () => {
    const aimGrounded = calculateAimDirection(false, false, true, false);
    expect(aimGrounded).toBe('FORWARD');

    const aimAir = calculateAimDirection(false, false, false, false);
    expect(aimAir).toBe('FORWARD');
  });
});

describe('getAimAngleDegrees', () => {
  it('should return correct degrees when facing right', () => {
    expect(getAimAngleDegrees('FORWARD', false)).toBe(0);
    expect(getAimAngleDegrees('UP_FORWARD', false)).toBe(-45);
    expect(getAimAngleDegrees('UP', false)).toBe(-90);
    expect(getAimAngleDegrees('DOWN_FORWARD', false)).toBe(45);
    expect(getAimAngleDegrees('DOWN', false)).toBe(90);
  });

  it('should return correct degrees when facing left', () => {
    expect(getAimAngleDegrees('FORWARD', true)).toBe(180);
    expect(getAimAngleDegrees('UP_FORWARD', true)).toBe(-135);
    expect(getAimAngleDegrees('UP', true)).toBe(-90);
    expect(getAimAngleDegrees('DOWN_FORWARD', true)).toBe(135);
    expect(getAimAngleDegrees('DOWN', true)).toBe(90);
  });
});
