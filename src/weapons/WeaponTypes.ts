export type WeaponType = 'PEA_SHOOTER' | 'SPREAD_SHOT' | 'LASER' | 'MACHINE_GUN' | 'FLAME' | 'BARRIER';

export function getSpreadShotAngles(baseAngleDeg: number): number[] {
  const offsets = [-30, -15, 0, 15, 30];
  return offsets.map(offset => baseAngleDeg + offset);
}

export interface WeaponStats {
  fireRateMs: number;
  speed: number;
  damage: number;
  piercing: boolean;
  lifespanMs: number;
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponStats> = {
  PEA_SHOOTER: {
    fireRateMs: 250,
    speed: 300,
    damage: 1,
    piercing: false,
    lifespanMs: 1200,
  },
  SPREAD_SHOT: {
    fireRateMs: 300,
    speed: 280,
    damage: 1,
    piercing: false,
    lifespanMs: 1000,
  },
  LASER: {
    fireRateMs: 200,
    speed: 500,
    damage: 2,
    piercing: true,
    lifespanMs: 800,
  },
  MACHINE_GUN: {
    fireRateMs: 100,
    speed: 350,
    damage: 1,
    piercing: false,
    lifespanMs: 1100,
  },
  FLAME: {
    fireRateMs: 200,
    speed: 180,
    damage: 2,
    piercing: true,
    lifespanMs: 900,
  },
  BARRIER: {
    fireRateMs: 0,
    speed: 0,
    damage: 0,
    piercing: false,
    lifespanMs: 0,
  },
};
