import type Phaser from 'phaser';

/**
 * Standard retro arcade font stack:
 * Prioritizes crisp sans-serif monospace fonts (Consolas on Windows, Monaco/Menlo on macOS,
 * Liberation Mono on Linux) with heavy, uniform stems for razor-sharp pixel art rendering.
 */
export const RETRO_FONT_FAMILY = 'Consolas, "Lucida Console", "Liberation Mono", "DejaVu Sans Mono", monospace';

export interface RetroTextStyleOptions {
  fontSize?: string;
  fontStyle?: string;
  color?: string;
  stroke?: string;
  strokeThickness?: number;
  align?: string;
  backgroundColor?: string;
  padding?: { x?: number; y?: number };
}

/**
 * Creates high-contrast, bold, non-blurry text styling optimized for
 * low-resolution pixel-art rendering (e.g. 320x240 viewports).
 */
export function createRetroTextStyle(
  options: RetroTextStyleOptions = {}
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: RETRO_FONT_FAMILY,
    fontSize: options.fontSize || '10px',
    fontStyle: options.fontStyle || 'bold',
    color: options.color || '#ffffff',
    stroke: options.stroke !== undefined ? options.stroke : '#000000',
    strokeThickness: options.strokeThickness !== undefined ? options.strokeThickness : 2,
    align: options.align || 'center',
    ...(options.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
    ...(options.padding ? { padding: options.padding } : {}),
  };
}
