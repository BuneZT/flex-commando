import { describe, it, expect } from 'vitest';
import { calculateAimDirection, getAimAngleDegrees } from '../src/entities/PlayerAim';

describe('calculateAimDirection', () => {
  it('should return UP when holding Up key without left/right', () => {
    const aim = calculateAimDirection({ up: true, down: false, left: false, right: false, isGrounded: true, facingLeft: false });
    expect(aim).toBe('UP');
  });

  it('should return UP_FORWARD when holding Up key with horizontal movement', () => {
    const aimRight = calculateAimDirection({ up: true, down: false, left: false, right: true, isGrounded: true, facingLeft: false });
    expect(aimRight).toBe('UP_FORWARD');

    const aimLeft = calculateAimDirection({ up: true, down: false, left: true, right: false, isGrounded: false, facingLeft: true });
    expect(aimLeft).toBe('UP_FORWARD');
  });

  it('should return CROUCH when holding Down key on ground without horizontal movement', () => {
    const aim = calculateAimDirection({ up: false, down: true, left: false, right: false, isGrounded: true, facingLeft: false });
    expect(aim).toBe('CROUCH');
  });

  it('should return DOWN_FORWARD when holding Down key with horizontal movement on ground', () => {
    const aim = calculateAimDirection({ up: false, down: true, left: false, right: true, isGrounded: true, facingLeft: false });
    expect(aim).toBe('DOWN_FORWARD');
  });

  it('should return DOWN when holding Down key in air without horizontal movement', () => {
    const aim = calculateAimDirection({ up: false, down: true, left: false, right: false, isGrounded: false, facingLeft: false });
    expect(aim).toBe('DOWN');
  });

  it('should return DOWN_FORWARD when holding Down key in air with horizontal movement', () => {
    const aim = calculateAimDirection({ up: false, down: true, left: true, right: false, isGrounded: false, facingLeft: true });
    expect(aim).toBe('DOWN_FORWARD');
  });

  it('should return FORWARD when no vertical key is pressed', () => {
    const aimGrounded = calculateAimDirection({ up: false, down: false, left: true, right: false, isGrounded: true, facingLeft: true });
    expect(aimGrounded).toBe('FORWARD');

    const aimAir = calculateAimDirection({ up: false, down: false, left: false, right: false, isGrounded: false, facingLeft: false });
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
    expect(getAimAngleDegrees('CROUCH', false)).toBe(0);
  });

  it('should return correct degrees when facing left', () => {
    expect(getAimAngleDegrees('FORWARD', true)).toBe(180);
    expect(getAimAngleDegrees('UP_FORWARD', true)).toBe(-135);
    expect(getAimAngleDegrees('UP', true)).toBe(-90);
    expect(getAimAngleDegrees('DOWN_FORWARD', true)).toBe(135);
    expect(getAimAngleDegrees('DOWN', true)).toBe(90);
    expect(getAimAngleDegrees('CROUCH', true)).toBe(180);
  });
});
