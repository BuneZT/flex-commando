import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Asset Integrity', () => {
  const assetSpecs: { path: string; width: number; height: number }[] = [
    { path: 'public/assets/ui/logo.png', width: 200, height: 50 },
    { path: 'public/assets/bg/cyber_hangar_bg.png', width: 320, height: 240 },
    { path: 'public/assets/tiles/tileset.png', width: 80, height: 16 },
    { path: 'public/assets/sprites/player.png', width: 144, height: 24 },
    { path: 'public/assets/sprites/trooper.png', width: 96, height: 24 },
    { path: 'public/assets/sprites/turret.png', width: 64, height: 24 },
    { path: 'public/assets/sprites/drone.png', width: 128, height: 20 },
    { path: 'public/assets/sprites/jumper.png', width: 96, height: 28 },
    { path: 'public/assets/sprites/boss.png', width: 256, height: 64 },
    { path: 'public/assets/vfx/projectiles.png', width: 80, height: 16 },
    { path: 'public/assets/vfx/pickups.png', width: 96, height: 16 },
  ];

  it('verifies all expected pixel-art asset files exist and have non-zero size', () => {
    assetSpecs.forEach(({ path: relPath, width, height }) => {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath), `Missing asset: ${relPath}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(100);

      const buf = fs.readFileSync(fullPath);
      // Verify standard PNG magic header
      expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      // Verify PNG dimensions in IHDR chunk
      const pngWidth = buf.readUInt32BE(16);
      const pngHeight = buf.readUInt32BE(20);
      expect(pngWidth).toBe(width);
      expect(pngHeight).toBe(height);
    });
  });
});
