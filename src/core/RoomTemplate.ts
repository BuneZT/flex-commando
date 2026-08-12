export const DOOR_FLAGS = {
  NORTH: 1,
  SOUTH: 2,
  EAST: 4,
  WEST: 8,
} as const;

export interface RoomTemplate {
  id: string;
  doorMask: number;
  doors: { north: boolean; south: boolean; east: boolean; west: boolean };
  width: number;  // 20 tiles
  height: number; // 15 tiles
  type?: 'START' | 'BOSS' | 'PATH' | 'BRANCH' | 'GENERIC';
  tiles: number[][]; // 15 rows x 20 cols
}

export function calculateDoorMask(doors: { north: boolean; south: boolean; east: boolean; west: boolean }): number {
  let mask = 0;
  if (doors.north) mask |= DOOR_FLAGS.NORTH;
  if (doors.south) mask |= DOOR_FLAGS.SOUTH;
  if (doors.east) mask |= DOOR_FLAGS.EAST;
  if (doors.west) mask |= DOOR_FLAGS.WEST;
  return mask;
}

function createEmptyTileMatrix(
  width = 20,
  height = 15,
  doors: { north: boolean; south: boolean; east: boolean; west: boolean } = { north: false, south: false, east: false, west: false }
): number[][] {
  const matrix: number[][] = [];
  for (let r = 0; r < height; r++) {
    const row: number[] = [];
    for (let c = 0; c < width; c++) {
      if (r === height - 1) {
        // Floor level (r = 14)
        if (doors.south && c >= 8 && c <= 11) {
          row.push(2); // One-way drop-through platform for South door
        } else {
          row.push(1); // Solid ground
        }
      } else if (r === 0) {
        // Ceiling level (r = 0)
        if (doors.north && c >= 8 && c <= 11) {
          row.push(0); // Open ceiling gap for North door
        } else {
          row.push(3); // Solid ceiling wall
        }
      } else if (c === 0 && !doors.west) {
        row.push(3); // West wall pillar if no West door
      } else if (c === width - 1 && !doors.east) {
        row.push(3); // East wall pillar if no East door
      } else if ((doors.north || doors.south) && (r === 4 || r === 9) && c >= 7 && c <= 12) {
        row.push(2); // Climbing platform ledges for vertical rooms
      } else if (r === 9 && c >= 5 && c <= 14) {
        row.push(2); // Standard platform bridge
      } else {
        row.push(0);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  // 1. East only (Start / Dead-end East)
  {
    id: 'room_E_01',
    doorMask: DOOR_FLAGS.EAST,
    doors: { north: false, south: false, east: true, west: false },
    width: 20,
    height: 15,
    type: 'START',
    tiles: createEmptyTileMatrix(20, 15, { north: false, south: false, east: true, west: false }),
  },
  // 2. West only (Boss / Dead-end West)
  {
    id: 'room_W_01',
    doorMask: DOOR_FLAGS.WEST,
    doors: { north: false, south: false, east: false, west: true },
    width: 20,
    height: 15,
    type: 'BOSS',
    tiles: createEmptyTileMatrix(20, 15, { north: false, south: false, east: false, west: true }),
  },
  // 3. North only
  {
    id: 'room_N_01',
    doorMask: DOOR_FLAGS.NORTH,
    doors: { north: true, south: false, east: false, west: false },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: true, south: false, east: false, west: false }),
  },
  // 4. South only
  {
    id: 'room_S_01',
    doorMask: DOOR_FLAGS.SOUTH,
    doors: { north: false, south: true, east: false, west: false },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: false, south: true, east: false, west: false }),
  },
  // 5. East-West horizontal corridor
  {
    id: 'room_EW_01',
    doorMask: DOOR_FLAGS.EAST | DOOR_FLAGS.WEST,
    doors: { north: false, south: false, east: true, west: true },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: false, south: false, east: true, west: true }),
  },
  // 6. North-South vertical corridor
  {
    id: 'room_NS_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH,
    doors: { north: true, south: true, east: false, west: false },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: true, south: true, east: false, west: false }),
  },
  // 7. North-East
  {
    id: 'room_NE_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.EAST,
    doors: { north: true, south: false, east: true, west: false },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: true, south: false, east: true, west: false }),
  },
  // 8. North-West
  {
    id: 'room_NW_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.WEST,
    doors: { north: true, south: false, east: false, west: true },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: true, south: false, east: false, west: true }),
  },
  // 9. South-East
  {
    id: 'room_SE_01',
    doorMask: DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST,
    doors: { north: false, south: true, east: true, west: false },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: false, south: true, east: true, west: false }),
  },
  // 10. South-West
  {
    id: 'room_SW_01',
    doorMask: DOOR_FLAGS.SOUTH | DOOR_FLAGS.WEST,
    doors: { north: false, south: true, east: false, west: true },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: false, south: true, east: false, west: true }),
  },
  // 11. North-East-West T-junction
  {
    id: 'room_NEW_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.EAST | DOOR_FLAGS.WEST,
    doors: { north: true, south: false, east: true, west: true },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: true, south: false, east: true, west: true }),
  },
  // 12. South-East-West T-junction
  {
    id: 'room_SEW_01',
    doorMask: DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST | DOOR_FLAGS.WEST,
    doors: { north: false, south: true, east: true, west: true },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: false, south: true, east: true, west: true }),
  },
  // 13. North-South-East T-junction
  {
    id: 'room_NSE_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST,
    doors: { north: true, south: true, east: true, west: false },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: true, south: true, east: true, west: false }),
  },
  // 14. North-South-West T-junction
  {
    id: 'room_NSW_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH | DOOR_FLAGS.WEST,
    doors: { north: true, south: true, east: false, west: true },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: true, south: true, east: false, west: true }),
  },
  // 15. North-South-East-West 4-way crossroad
  {
    id: 'room_NSEW_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST | DOOR_FLAGS.WEST,
    doors: { north: true, south: true, east: true, west: true },
    width: 20,
    height: 15,
    type: 'GENERIC',
    tiles: createEmptyTileMatrix(20, 15, { north: true, south: true, east: true, west: true }),
  },
];

// Pre-indexed lookup map for O(1) room template matching by doorMask (0..15)
const ROOM_TEMPLATES_BY_MASK: Map<number, RoomTemplate[]> = new Map();
for (const template of ROOM_TEMPLATES) {
  const existing = ROOM_TEMPLATES_BY_MASK.get(template.doorMask) || [];
  existing.push(template);
  ROOM_TEMPLATES_BY_MASK.set(template.doorMask, existing);
}

export function getMatchingRoomTemplates(doorMask: number, type?: string): RoomTemplate[] {
  const matches = ROOM_TEMPLATES_BY_MASK.get(doorMask) || [];
  if (type && matches.some((t) => t.type === type)) {
    return matches.filter((t) => t.type === type);
  }
  if (matches.length > 0) {
    return matches;
  }
  return [ROOM_TEMPLATES[0]];
}

export function getRoomTemplateById(id: string): RoomTemplate | undefined {
  return ROOM_TEMPLATES.find((t) => t.id === id);
}
