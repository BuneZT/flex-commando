import { GAME_CONSTANTS } from '../config/GameConstants';

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
  width: number;  // 32 tiles
  height: number; // 18 tiles
  type?: 'START' | 'BOSS' | 'PATH' | 'BRANCH' | 'GENERIC';
  tiles: number[][]; // 18 rows x 32 cols
}

export function calculateDoorMask(doors: { north: boolean; south: boolean; east: boolean; west: boolean }): number {
  let mask = 0;
  if (doors.north) mask |= DOOR_FLAGS.NORTH;
  if (doors.south) mask |= DOOR_FLAGS.SOUTH;
  if (doors.east) mask |= DOOR_FLAGS.EAST;
  if (doors.west) mask |= DOOR_FLAGS.WEST;
  return mask;
}

export type ArchetypeType = 'START' | 'BOSS' | 'HORIZ' | 'VERT' | 'CORNER' | 'JUNCTION' | 'GENERIC';

export function createArchetypeMatrix(
  doors: { north: boolean; south: boolean; east: boolean; west: boolean } = {
    north: false,
    south: false,
    east: false,
    west: false,
  },
  archetypeType?: ArchetypeType
): number[][] {
  const width = GAME_CONSTANTS.ROOM_WIDTH_TILES;
  const height = GAME_CONSTANTS.ROOM_HEIGHT_TILES;

  const matrix: number[][] = [];
  for (let r = 0; r < height; r++) {
    matrix.push(new Array(width).fill(0));
  }

  // Row 17: Ground (1), with cols 14-17 as one-way platform (2) if doors.south
  for (let c = 0; c < width; c++) {
    if (doors.south && c >= 14 && c <= 17) {
      matrix[height - 1][c] = 2;
    } else {
      matrix[height - 1][c] = 1;
    }
  }

  // Row 0: Ceiling (3), with cols 14-17 open (0) if doors.north
  for (let c = 0; c < width; c++) {
    if (doors.north && c >= 14 && c <= 17) {
      matrix[0][c] = 0;
    } else {
      matrix[0][c] = 3;
    }
  }

  // Col 0: West wall (3) for rows 1-16, unless doors.west (cols 0-1 open on rows 11-16)
  for (let r = 1; r < height - 1; r++) {
    if (doors.west && r >= 11 && r <= 16) {
      matrix[r][0] = 0;
      matrix[r][1] = 0;
    } else {
      matrix[r][0] = 3;
    }
  }

  // Col 31: East wall (3) for rows 1-16, unless doors.east (cols 30-31 open on rows 11-16)
  for (let r = 1; r < height - 1; r++) {
    if (doors.east && r >= 11 && r <= 16) {
      matrix[r][width - 1] = 0;
      matrix[r][width - 2] = 0;
    } else {
      matrix[r][width - 1] = 3;
    }
  }

  const addPlatform = (row: number, colStart: number, colEnd: number, tileType = 2) => {
    for (let c = colStart; c <= colEnd; c++) {
      if (row >= 0 && row < height && c >= 0 && c < width) {
        if (doors.west && (c === 0 || c === 1) && row >= 11 && row <= 16) continue;
        if (doors.east && (c === width - 1 || c === width - 2) && row >= 11 && row <= 16) continue;
        if (doors.north && row === 0 && c >= 14 && c <= 17) continue;
        if (doors.south && row === height - 1 && c >= 14 && c <= 17) continue;
        matrix[row][c] = tileType;
      }
    }
  };

  // Determine archetype layout
  let arch = archetypeType;
  if (!arch) {
    const doorCount = (doors.north ? 1 : 0) + (doors.south ? 1 : 0) + (doors.east ? 1 : 0) + (doors.west ? 1 : 0);
    if (doorCount === 0) {
      arch = 'GENERIC';
    } else if (doors.east && !doors.west && !doors.north && !doors.south) {
      arch = 'START';
    } else if (doors.west && !doors.east && !doors.north && !doors.south) {
      arch = 'BOSS';
    } else if (doors.east && doors.west && !doors.north && !doors.south) {
      arch = 'HORIZ';
    } else if ((doors.north || doors.south) && !doors.east && !doors.west) {
      arch = 'VERT';
    } else if (doorCount >= 3) {
      arch = 'JUNCTION';
    } else {
      arch = 'CORNER';
    }
  }

  switch (arch) {
    case 'GENERIC':
    case 'START':
      // Row 14 platform at cols 8–16, Row 11 platform at cols 17–25
      addPlatform(14, 8, 16, 2);
      addPlatform(11, 17, 25, 2);
      break;

    case 'BOSS':
      // Multi-tier dynamic combat arena:
      // Tactical lower terraces at Row 13 for maneuverability
      addPlatform(13, 4, 10, 2);
      addPlatform(13, 21, 27, 2);
      // Central elevated battle platform at Row 9
      addPlatform(9, 11, 20, 2);
      // High vantage perches at Row 6
      addPlatform(6, 4, 9, 2);
      addPlatform(6, 22, 27, 2);
      break;

    case 'HORIZ':
      // Dual-tier corridor with high platform bridge at Row 11 cols 4–27, stepped perch at Row 7 cols 12–20
      addPlatform(11, 4, 27, 2);
      addPlatform(7, 12, 20, 2);
      break;

    case 'VERT':
      // Zig-zag climbing platforms under portal: Row 14 cols 12–20, Row 11 cols 6–14, Row 8 cols 18–26, Row 5 cols 12–20
      addPlatform(14, 12, 20, 2);
      addPlatform(11, 6, 14, 2);
      addPlatform(8, 18, 26, 2);
      addPlatform(5, 12, 20, 2);
      break;

    case 'CORNER':
      // Ascending terraces linking vertical portal cols 14–17 to horizontal portal rows 11–16
      if (doors.north && doors.east) {
        addPlatform(5, 12, 19, 2);
        addPlatform(9, 16, 23, 2);
        addPlatform(13, 20, 27, 2);
      } else if (doors.north && doors.west) {
        addPlatform(5, 12, 19, 2);
        addPlatform(9, 8, 15, 2);
        addPlatform(13, 4, 11, 2);
      } else if (doors.south && doors.east) {
        addPlatform(14, 12, 19, 2);
        addPlatform(11, 16, 23, 2);
        addPlatform(8, 20, 27, 2);
      } else if (doors.south && doors.west) {
        addPlatform(14, 12, 19, 2);
        addPlatform(11, 8, 15, 2);
        addPlatform(8, 4, 11, 2);
      } else {
        addPlatform(13, 10, 22, 2);
        addPlatform(9, 12, 20, 2);
        addPlatform(5, 14, 18, 2);
      }
      break;

    case 'JUNCTION':
      // Central floating plaza (Row 11 cols 10–22) and vertical jump ledges at Row 6 and Row 14
      addPlatform(11, 10, 22, 2);
      addPlatform(6, 12, 20, 2);
      addPlatform(14, 12, 20, 2);
      break;
  }

  // Ensure top exit reachability: when doors.north is true, place a one-way jumping platform
  // at Row 3 (cols 12-19) under the portal. This guarantees the player can reach the ceiling gap
  // and land on the room above's one-way platform within player max jump height.
  if (doors.north) {
    addPlatform(3, 12, 19, 2);
  }

  return matrix;
}

export function createEmptyTileMatrix(
  _width = GAME_CONSTANTS.ROOM_WIDTH_TILES,
  _height = GAME_CONSTANTS.ROOM_HEIGHT_TILES,
  doors: { north: boolean; south: boolean; east: boolean; west: boolean } = {
    north: false,
    south: false,
    east: false,
    west: false,
  }
): number[][] {
  return createArchetypeMatrix(doors);
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  // 1. East only (Start / Dead-end East)
  {
    id: 'room_E_01',
    doorMask: DOOR_FLAGS.EAST,
    doors: { north: false, south: false, east: true, west: false },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'START',
    tiles: createArchetypeMatrix({ north: false, south: false, east: true, west: false }, 'START'),
  },
  // 2. West only (Boss / Dead-end West)
  {
    id: 'room_W_01',
    doorMask: DOOR_FLAGS.WEST,
    doors: { north: false, south: false, east: false, west: true },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'BOSS',
    tiles: createArchetypeMatrix({ north: false, south: false, east: false, west: true }, 'BOSS'),
  },
  // 3. North only
  {
    id: 'room_N_01',
    doorMask: DOOR_FLAGS.NORTH,
    doors: { north: true, south: false, east: false, west: false },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: true, south: false, east: false, west: false }, 'VERT'),
  },
  // 4. South only
  {
    id: 'room_S_01',
    doorMask: DOOR_FLAGS.SOUTH,
    doors: { north: false, south: true, east: false, west: false },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: false, south: true, east: false, west: false }, 'VERT'),
  },
  // 5. East-West horizontal corridor
  {
    id: 'room_EW_01',
    doorMask: DOOR_FLAGS.EAST | DOOR_FLAGS.WEST,
    doors: { north: false, south: false, east: true, west: true },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: false, south: false, east: true, west: true }, 'HORIZ'),
  },
  // 6. North-South vertical corridor
  {
    id: 'room_NS_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH,
    doors: { north: true, south: true, east: false, west: false },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: true, south: true, east: false, west: false }, 'VERT'),
  },
  // 7. North-East
  {
    id: 'room_NE_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.EAST,
    doors: { north: true, south: false, east: true, west: false },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: true, south: false, east: true, west: false }, 'CORNER'),
  },
  // 8. North-West
  {
    id: 'room_NW_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.WEST,
    doors: { north: true, south: false, east: false, west: true },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: true, south: false, east: false, west: true }, 'CORNER'),
  },
  // 9. South-East
  {
    id: 'room_SE_01',
    doorMask: DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST,
    doors: { north: false, south: true, east: true, west: false },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: false, south: true, east: true, west: false }, 'CORNER'),
  },
  // 10. South-West
  {
    id: 'room_SW_01',
    doorMask: DOOR_FLAGS.SOUTH | DOOR_FLAGS.WEST,
    doors: { north: false, south: true, east: false, west: true },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: false, south: true, east: false, west: true }, 'CORNER'),
  },
  // 11. North-East-West T-junction
  {
    id: 'room_NEW_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.EAST | DOOR_FLAGS.WEST,
    doors: { north: true, south: false, east: true, west: true },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: true, south: false, east: true, west: true }, 'JUNCTION'),
  },
  // 12. South-East-West T-junction
  {
    id: 'room_SEW_01',
    doorMask: DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST | DOOR_FLAGS.WEST,
    doors: { north: false, south: true, east: true, west: true },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: false, south: true, east: true, west: true }, 'JUNCTION'),
  },
  // 13. North-South-East T-junction
  {
    id: 'room_NSE_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST,
    doors: { north: true, south: true, east: true, west: false },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: true, south: true, east: true, west: false }, 'JUNCTION'),
  },
  // 14. North-South-West T-junction
  {
    id: 'room_NSW_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH | DOOR_FLAGS.WEST,
    doors: { north: true, south: true, east: false, west: true },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: true, south: true, east: false, west: true }, 'JUNCTION'),
  },
  // 15. North-South-East-West 4-way crossroad
  {
    id: 'room_NSEW_01',
    doorMask: DOOR_FLAGS.NORTH | DOOR_FLAGS.SOUTH | DOOR_FLAGS.EAST | DOOR_FLAGS.WEST,
    doors: { north: true, south: true, east: true, west: true },
    width: GAME_CONSTANTS.ROOM_WIDTH_TILES,
    height: GAME_CONSTANTS.ROOM_HEIGHT_TILES,
    type: 'GENERIC',
    tiles: createArchetypeMatrix({ north: true, south: true, east: true, west: true }, 'JUNCTION'),
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
