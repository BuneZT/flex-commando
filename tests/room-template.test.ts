import { describe, it, expect } from 'vitest';
import { ROOM_TEMPLATES, getMatchingRoomTemplates, getRoomTemplateById, DOOR_FLAGS, calculateDoorMask, createArchetypeMatrix } from '../src/core/RoomTemplate';
import { GAME_CONSTANTS } from '../src/config/GameConstants';

describe('RoomTemplate 32x18 Archetypes', () => {
  it('should have 15 room templates matching width 32 and height 18', () => {
    expect(ROOM_TEMPLATES.length).toBe(15);
    for (const template of ROOM_TEMPLATES) {
      expect(template.width).toBe(GAME_CONSTANTS.ROOM_WIDTH_TILES);
      expect(template.height).toBe(GAME_CONSTANTS.ROOM_HEIGHT_TILES);
      expect(template.tiles.length).toBe(18);
      for (const row of template.tiles) {
        expect(row.length).toBe(32);
      }
    }
  });

  it('should ensure east doors have open corridors at cols 30-31 rows 11-16', () => {
    const eastTemplates = ROOM_TEMPLATES.filter((t) => t.doors.east);
    expect(eastTemplates.length).toBeGreaterThan(0);
    for (const t of eastTemplates) {
      for (let r = 11; r <= 16; r++) {
        expect(t.tiles[r][31]).toBe(0);
        expect(t.tiles[r][30]).toBe(0);
      }
    }
  });

  it('should ensure west doors have open corridors at col 0 rows 11-16', () => {
    const westTemplates = ROOM_TEMPLATES.filter((t) => t.doors.west);
    expect(westTemplates.length).toBeGreaterThan(0);
    for (const t of westTemplates) {
      for (let r = 11; r <= 16; r++) {
        expect(t.tiles[r][0]).toBe(0);
        expect(t.tiles[r][1]).toBe(0);
      }
    }
  });

  it('should ensure south doors have drop-through one-way platforms (tile 2) at row 17 cols 14-17', () => {
    const southTemplates = ROOM_TEMPLATES.filter((t) => t.doors.south);
    expect(southTemplates.length).toBeGreaterThan(0);
    for (const t of southTemplates) {
      for (let c = 14; c <= 17; c++) {
        expect(t.tiles[17][c]).toBe(2);
      }
    }
  });

  it('should ensure north doors have open ceiling gaps (tile 0) at row 0 cols 14-17', () => {
    const northTemplates = ROOM_TEMPLATES.filter((t) => t.doors.north);
    expect(northTemplates.length).toBeGreaterThan(0);
    for (const t of northTemplates) {
      for (let c = 14; c <= 17; c++) {
        expect(t.tiles[0][c]).toBe(0);
      }
    }
  });

  it('should correctly calculate door mask', () => {
    expect(calculateDoorMask({ north: true, south: false, east: true, west: false })).toBe(
      DOOR_FLAGS.NORTH | DOOR_FLAGS.EAST
    );
    expect(calculateDoorMask({ north: true, south: true, east: true, west: true })).toBe(
      DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST | DOOR_FLAGS.WEST
    );
  });

  it('should find room templates by id and by mask', () => {
    const startRoom = getRoomTemplateById('room_E_01');
    expect(startRoom).toBeDefined();
    expect(startRoom?.type).toBe('START');

    const matchingBoss = getMatchingRoomTemplates(DOOR_FLAGS.WEST, 'BOSS');
    expect(matchingBoss.length).toBeGreaterThan(0);
    expect(matchingBoss[0].id).toBe('room_W_01');

    const matchesAll = getMatchingRoomTemplates(DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST | DOOR_FLAGS.WEST);
    expect(matchesAll.length).toBe(1);
    expect(matchesAll[0].id).toBe('room_NSEW_01');
  });

  it('should fall back to GENERIC archetype without door corridors when doorCount is 0', () => {
    const zeroDoors = { north: false, south: false, east: false, west: false };
    const matrix = createArchetypeMatrix(zeroDoors);
    // Boundary walls must be solid with no open corridors
    for (let r = 11; r <= 16; r++) {
      expect(matrix[r][0]).toBe(3); // West wall solid
      expect(matrix[r][31]).toBe(3); // East wall solid
    }
    for (let c = 14; c <= 17; c++) {
      expect(matrix[0][c]).toBe(3); // Ceiling solid
      expect(matrix[17][c]).toBe(1); // Floor solid ground
    }
    // Verify default GENERIC platforms exist
    expect(matrix[14][10]).toBe(2);
    expect(matrix[11][20]).toBe(2);
  });
});
