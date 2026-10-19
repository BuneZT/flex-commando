import { GridCell, SeededRNG } from './GridGenerator';
import { RoomTemplate } from './RoomTemplate';

export function decorateRoomTiles(
  baseTiles: number[][],
  doors: { north: boolean; south: boolean; east: boolean; west: boolean },
  type?: GridCell['type'] | RoomTemplate['type'],
  rng: SeededRNG = new SeededRNG(0)
): number[][] {
  // Deep clone to prevent mutating template originals
  const matrix: number[][] = baseTiles.map((row) => [...row]);

  // Do not procedurally decorate START or BOSS rooms
  if (type === 'START' || type === 'BOSS') {
    return matrix;
  }

  // Eligible decorator zones: safe airspace away from portals
  // Zone A: cols 5 to 11, rows 7 to 13
  // Zone B: cols 20 to 26, rows 7 to 13
  const featureCount = rng.range(1, 2);

  for (let f = 0; f < featureCount; f++) {
    const zone = rng.next() < 0.5 ? 'A' : 'B';
    const startCol = zone === 'A' ? rng.range(5, 9) : rng.range(20, 24);
    const row = rng.choice([8, 10, 13]);
    const featureType = rng.choice(['LEDGE', 'STEP', 'PERCH']);

    if (featureType === 'LEDGE') {
      // 3-tile one-way platform (Tile 2)
      if (matrix[row][startCol] === 0 && matrix[row][startCol + 1] === 0 && matrix[row][startCol + 2] === 0) {
        matrix[row][startCol] = 2;
        matrix[row][startCol + 1] = 2;
        matrix[row][startCol + 2] = 2;
      }
    } else if (featureType === 'STEP') {
      // 2-tile one-way step platform (Tile 2) at lower heights
      const stepRow = Math.min(row, 13);
      if (matrix[stepRow][startCol] === 0 && matrix[stepRow][startCol + 1] === 0) {
        matrix[stepRow][startCol] = 2;
        matrix[stepRow][startCol + 1] = 2;
      }
    } else if (featureType === 'PERCH') {
      // 1-tile ceiling mount (Tile 3) hanging from ceiling
      if (matrix[1][startCol] === 0 && matrix[2][startCol] === 0 && !doors.north) {
        matrix[1][startCol] = 3;
        matrix[2][startCol] = 3;
      }
    }
  }

  return matrix;
}
