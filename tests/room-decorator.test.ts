import { describe, it, expect } from 'vitest';
import { decorateRoomTiles } from '../src/core/RoomDecorator';
import { SeededRNG } from '../src/core/GridGenerator';
import { getRoomTemplateById } from '../src/core/RoomTemplate';

describe('RoomDecorator', () => {
  it('should not mutate START or BOSS room tiles', () => {
    const startTpl = getRoomTemplateById('room_E_01')!;
    const rng = new SeededRNG(42);
    const decorated = decorateRoomTiles(startTpl.tiles, startTpl.doors, 'START', rng);
    expect(decorated).toEqual(startTpl.tiles);
  });

  it('should never place tiles inside doorway forbidden zones', () => {
    const ewTpl = getRoomTemplateById('room_EW_01')!;
    const rng = new SeededRNG(999);
    const decorated = decorateRoomTiles(ewTpl.tiles, ewTpl.doors, 'PATH', rng);

    // West door corridor: col 0, rows 11-16 must remain 0
    for (let r = 11; r <= 16; r++) {
      expect(decorated[r][0]).toBe(0);
    }
    // East door corridor: col 31, rows 11-16 must remain 0
    for (let r = 11; r <= 16; r++) {
      expect(decorated[r][31]).toBe(0);
    }
  });

  it('should produce identical decorated matrices for the same seed (deterministic)', () => {
    const ewTpl = getRoomTemplateById('room_EW_01')!;
    const dec1 = decorateRoomTiles(ewTpl.tiles, ewTpl.doors, 'PATH', new SeededRNG(12345));
    const dec2 = decorateRoomTiles(ewTpl.tiles, ewTpl.doors, 'PATH', new SeededRNG(12345));
    expect(dec1).toEqual(dec2);
  });

  it('should produce variations across different seeds', () => {
    const ewTpl = getRoomTemplateById('room_EW_01')!;
    const dec1 = decorateRoomTiles(ewTpl.tiles, ewTpl.doors, 'PATH', new SeededRNG(101));
    const dec2 = decorateRoomTiles(ewTpl.tiles, ewTpl.doors, 'PATH', new SeededRNG(202));
    // At least some decoration elements should vary
    expect(JSON.stringify(dec1)).not.toEqual(JSON.stringify(dec2));
  });
});
