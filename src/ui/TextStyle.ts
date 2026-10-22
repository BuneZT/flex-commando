import type Phaser from 'phaser';

/**
 * Standard retro arcade font stack:
 * Prioritizes crisp sans-serif monospace fonts (Consolas on Windows, Monaco/Menlo on macOS,
 * Liberation Mono on Linux) with heavy, uniform stems for razor-sharp pixel art rendering.
 */
export const RETRO_FONT_FAMILY = 'Consolas, "Lucida Console", "Liberation Mono", "DejaVu Sans Mono", monospace';

/**
 * Character order matching the preloaded static sprite atlas `public/assets/ui/retro_font.png`.
 * Each character cell in `retro_font.png` is 7x9 pixels (5x7 white glyph + 1px black outline).
 */
export const RETRO_FONT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :!?.,-+_/[]()%\'"❤∞★█░';
export const RETRO_FONT_CELL_WIDTH = 7;
export const RETRO_FONT_CELL_HEIGHT = 9;
export const RETRO_FONT_CHAR_ADVANCE = 6;
export const RETRO_FONT_ATLAS_WIDTH = RETRO_FONT_CHARS.length * RETRO_FONT_CELL_WIDTH; // 406
export const RETRO_FONT_ATLAS_HEIGHT = RETRO_FONT_CELL_HEIGHT; // 9

// Precomputed O(1) lookup table from charCode to glyph cell index in `retro_font.png`
const ASCII_LOOKUP = new Int16Array(128).fill(-1);
const UNICODE_LOOKUP = new Map<number, number>();
const SPACE_CELL_INDEX = RETRO_FONT_CHARS.indexOf(' ');

for (let i = 0; i < RETRO_FONT_CHARS.length; i++) {
  const code = RETRO_FONT_CHARS.charCodeAt(i);
  if (code < 128) {
    ASCII_LOOKUP[code] = i;
    // Map lowercase a-z (97..122) to uppercase A-Z (65..90)
    if (code >= 65 && code <= 90) {
      ASCII_LOOKUP[code + 32] = i;
    }
  } else {
    UNICODE_LOOKUP.set(code, i);
  }
}

/**
 * Returns the cell index (0..57) in `retro_font.png` for a UTF-16 character code with zero allocations.
 */
export function getRetroFontCharIndex(charCode: number): number {
  if (charCode >= 0 && charCode < 128) {
    const idx = ASCII_LOOKUP[charCode];
    return idx >= 0 ? idx : SPACE_CELL_INDEX;
  }
  const uIdx = UNICODE_LOOKUP.get(charCode);
  return uIdx !== undefined ? uIdx : SPACE_CELL_INDEX;
}

/**
 * Parses a hex color string (e.g. '#ffcc00' or '#fff') or number into a 24-bit RGB integer (0xRRGGBB)
 * without allocating substrings or arrays.
 */
export function parseHexColor(color?: string | number | null): number {
  if (typeof color === 'number') {
    return color & 0xffffff;
  }
  if (!color || typeof color !== 'string') {
    return 0xffffff;
  }
  const start = color.charCodeAt(0) === 35 ? 1 : 0; // '#'
  const len = color.length - start;
  let val = 0;
  for (let i = start; i < color.length; i++) {
    const c = color.charCodeAt(i);
    let nibble = 0;
    if (c >= 48 && c <= 57) nibble = c - 48;
    else if (c >= 65 && c <= 70) nibble = c - 55;
    else if (c >= 97 && c <= 102) nibble = c - 87;
    val = (val << 4) | nibble;
  }
  if (len === 3) {
    const r = (val >> 8) & 0xf;
    const g = (val >> 4) & 0xf;
    const b = val & 0xf;
    return (r << 20) | (r << 16) | (g << 12) | (g << 8) | (b << 4) | b;
  }
  return val & 0xffffff;
}

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

export interface PixelTextMetrics {
  width: number;
  height: number;
  scale: number;
  charAdvance: number;
  lineHeight: number;
}

// Reusable scratch metrics object to avoid per-call heap allocations in hot paths
const SCRATCH_METRICS: PixelTextMetrics = {
  width: 2,
  height: 2,
  scale: 1,
  charAdvance: RETRO_FONT_CHAR_ADVANCE,
  lineHeight: RETRO_FONT_CELL_HEIGHT,
};

/**
 * Converts a CSS fontSize (e.g. '9px', '10px', '22px') into an integer pixel scale factor
 * so 7x9 bitmap cells always snap to exact pixel multiples without sub-pixel distortion.
 */
export function getPixelFontScale(fontSize?: string | number): number {
  if (typeof fontSize === 'number') {
    return fontSize >= 14 ? 2 : 1;
  }
  if (!fontSize || typeof fontSize !== 'string') return 1;
  let num = 0;
  for (let i = 0; i < fontSize.length; i++) {
    const c = fontSize.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      num = num * 10 + (c - 48);
    } else {
      break;
    }
  }
  return num >= 14 ? 2 : 1;
}

/**
 * Measures a text string for the preloaded `retro_font.png` atlas with zero array allocations.
 * Guarantees even-integer width and height so `.setOrigin(0.5)` never produces `.5` sub-pixel offsets.
 */
export function measurePixelText(
  text: string,
  scale: number = 1,
  _strokeThickness: number = 2,
  lineSpacing: number = 0,
  padding?: { left?: number; right?: number; top?: number; bottom?: number },
  out: PixelTextMetrics = SCRATCH_METRICS
): PixelTextMetrics {
  const safeScale = scale >= 2 ? 2 : 1;
  const charAdvance = RETRO_FONT_CHAR_ADVANCE * safeScale;
  const lineHeight = RETRO_FONT_CELL_HEIGHT * safeScale;

  let lineCount = 1;
  let currentLineChars = 0;
  let maxLineChars = 0;
  const len = text ? text.length : 0;

  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code === 13) continue; // '\r'
    if (code === 10) {
      // '\n'
      if (currentLineChars > maxLineChars) maxLineChars = currentLineChars;
      currentLineChars = 0;
      lineCount++;
    } else {
      currentLineChars++;
    }
  }
  if (currentLineChars > maxLineChars) {
    maxLineChars = currentLineChars;
  }

  const maxLineWidth = maxLineChars > 0 ? maxLineChars * charAdvance + safeScale : 0;
  const padLeft = padding?.left ? Math.round(padding.left) : 0;
  const padRight = padding?.right ? Math.round(padding.right) : 0;
  const padTop = padding?.top ? Math.round(padding.top) : 0;
  const padBottom = padding?.bottom ? Math.round(padding.bottom) : 0;

  const totalLineSpacing = lineCount > 1 ? (lineCount - 1) * Math.round(lineSpacing) : 0;
  let width = Math.max(2, maxLineWidth + padLeft + padRight);
  let height = Math.max(2, lineCount * lineHeight + totalLineSpacing + padTop + padBottom);

  // Pad to even integer dimensions so origin 0.5 always lands on an exact integer pixel
  if ((width & 1) !== 0) width += 1;
  if ((height & 1) !== 0) height += 1;

  out.width = width;
  out.height = height;
  out.scale = safeScale;
  out.charAdvance = charAdvance;
  out.lineHeight = lineHeight;
  return out;
}

/**
 * Patches Phaser.GameObjects.Text.prototype so any Text using RETRO_FONT_FAMILY:
 * 1. Computes integer bounds and displayOrigin in `updateText()` with zero canvas drawing and zero GC.
 * 2. Renders glyphs in `renderWebGL()` directly from the preloaded `retro_font.png` GPU texture.
 */
export function installPixelTextRenderer(phaserNamespace: any = (globalThis as any).Phaser): void {
  const TextClass = phaserNamespace?.GameObjects?.Text;
  if (!TextClass || !TextClass.prototype) return;

  const proto = TextClass.prototype;
  if (proto.__pixelTextPatched) return;

  const origUpdateText = proto.updateText;
  const origRenderWebGL = proto.renderWebGL;

  proto.updateDisplayOrigin = function () {
    this._displayOriginX = Math.round(this.originX * this.width);
    this._displayOriginY = Math.round(this.originY * this.height);
    return this;
  };

  proto.updateText = function () {
    if (this.style && this.style.fontFamily === RETRO_FONT_FAMILY) {
      this.style.resolution = 1;
      const scale = getPixelFontScale(this.style.fontSize);
      const metrics = measurePixelText(
        this._text || '',
        scale,
        this.style.strokeThickness !== undefined ? this.style.strokeThickness : 2,
        this.lineSpacing || 0,
        this.padding,
        SCRATCH_METRICS
      );

      this.width = metrics.width;
      this.height = metrics.height;
      this.__retroScale = metrics.scale;
      this.__retroColorInt = parseHexColor(this.style.color);
      this.updateDisplayOrigin();

      if (this.frame && typeof this.frame.setSize === 'function') {
        this.frame.setSize(this.width, this.height);
      }

      if (this.input && !this.input.customHitArea && this.input.hitArea) {
        this.input.hitArea.width = this.width;
        this.input.hitArea.height = this.height;
      }

      return this;
    }

    return origUpdateText ? origUpdateText.call(this) : this;
  };

  proto.renderWebGL = function (renderer: any, src: any, camera: any, parentMatrix: any) {
    if (!src.style || src.style.fontFamily !== RETRO_FONT_FAMILY) {
      if (origRenderWebGL) {
        origRenderWebGL.call(this, renderer, src, camera, parentMatrix);
      }
      return;
    }

    const text: string = src._text || '';
    const len = text.length;
    if (len === 0 || src.width === 0 || src.height === 0) {
      return;
    }

    const textures = src.scene?.sys?.textures || renderer?.game?.textures;
    const fontTex = textures && typeof textures.get === 'function' ? textures.get('retro_font') : null;
    const glTexture = fontTex?.source?.[0]?.glTexture;

    if (!glTexture) {
      if (origRenderWebGL) {
        origRenderWebGL.call(this, renderer, src, camera, parentMatrix);
      }
      return;
    }

    camera.addToRenderList(src);

    const pipeline = renderer.pipelines.set(src.pipeline, src);
    const textureUnit = pipeline.setTexture2D(glTexture, src);

    const scale = src.__retroScale || getPixelFontScale(src.style.fontSize);
    const cellW = RETRO_FONT_CELL_WIDTH;
    const cellH = RETRO_FONT_CELL_HEIGHT;
    const drawW = cellW * scale;
    const drawH = cellH * scale;
    const charAdvance = RETRO_FONT_CHAR_ADVANCE * scale;
    const lineHeight = cellH * scale + Math.round(src.lineSpacing || 0);

    const colorInt = src.__retroColorInt !== undefined ? src.__retroColorInt : parseHexColor(src.style.color);
    const alpha = camera.alpha * (src._alphaTL !== undefined ? src._alphaTL : 1);
    const ua = ((alpha * 255) | 0) & 0xff;
    const packedTint = ((ua << 24) | colorInt) >>> 0;

    const padLeft = src.padding?.left ? Math.round(src.padding.left) : 0;
    const padTop = src.padding?.top ? Math.round(src.padding.top) : 0;

    let col = 0;
    let row = 0;

    for (let i = 0; i < len; i++) {
      const code = text.charCodeAt(i);
      if (code === 13) continue;
      if (code === 10) {
        col = 0;
        row++;
        continue;
      }

      if (code !== 32) {
        const cellIdx = getRetroFontCharIndex(code);
        const frameX = cellIdx * cellW;
        const charOffsetX = padLeft + col * charAdvance;
        const charOffsetY = padTop + row * lineHeight;

        pipeline.batchTexture(
          src,
          glTexture,
          RETRO_FONT_ATLAS_WIDTH,
          RETRO_FONT_ATLAS_HEIGHT,
          src.x,
          src.y,
          drawW,
          drawH,
          src.scaleX,
          src.scaleY,
          src.rotation,
          src.flipX,
          src.flipY,
          src.scrollFactorX,
          src.scrollFactorY,
          src.displayOriginX - charOffsetX,
          src.displayOriginY - charOffsetY,
          frameX,
          0,
          cellW,
          cellH,
          packedTint,
          packedTint,
          packedTint,
          packedTint,
          0,
          0,
          0,
          camera,
          parentMatrix,
          false,
          textureUnit
        );
      }

      col++;
    }
  };

  proto.__pixelTextPatched = true;
}

/**
 * Creates high-contrast, bold, non-blurry text styling optimized for
 * low-resolution pixel-art rendering (e.g. 512x288 viewports).
 */
export function createRetroTextStyle(
  options: RetroTextStyleOptions = {}
): Phaser.Types.GameObjects.Text.TextStyle {
  installPixelTextRenderer();
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
