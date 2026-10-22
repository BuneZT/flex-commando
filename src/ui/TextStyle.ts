import type Phaser from 'phaser';

/**
 * Standard retro arcade font stack:
 * Prioritizes crisp sans-serif monospace fonts (Consolas on Windows, Monaco/Menlo on macOS,
 * Liberation Mono on Linux) with heavy, uniform stems for razor-sharp pixel art rendering.
 */
export const RETRO_FONT_FAMILY = 'Consolas, "Lucida Console", "Liberation Mono", "DejaVu Sans Mono", monospace';

/**
 * Character order matching the preloaded static sprite atlas `public/assets/ui/retro_font.png` (406x18).
 * Row 0 (y = 0..8): 1px black (#000000) outline for each 7x9 cell.
 * Row 1 (y = 9..17): 5x7 white (#ffffff) foreground glyph for each 7x9 cell.
 */
export const RETRO_FONT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :!?.,-+_/[]()%\'"❤∞★█░';
export const RETRO_FONT_CELL_WIDTH = 7;
export const RETRO_FONT_CELL_HEIGHT = 9;
export const RETRO_FONT_CHAR_ADVANCE = 6;
export const RETRO_FONT_ATLAS_WIDTH = RETRO_FONT_CHARS.length * RETRO_FONT_CELL_WIDTH; // 406
export const RETRO_FONT_ATLAS_HEIGHT = RETRO_FONT_CELL_HEIGHT * 2; // 18

// Precomputed O(1) lookup table from charCode to glyph cell index in `retro_font.png`
const ASCII_LOOKUP = new Int16Array(128).fill(-1);
const UNICODE_LOOKUP = new Map<number, number>();
const SPACE_CELL_INDEX = RETRO_FONT_CHARS.indexOf(' ');

for (let i = 0; i < RETRO_FONT_CHARS.length; i++) {
  const code = RETRO_FONT_CHARS.charCodeAt(i);
  if (code < 128) {
    ASCII_LOOKUP[code] = i;
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
 * Blits characters from the preloaded `retro_font.png` atlas onto the Text's 2D canvas
 * with zero heap allocations and zero font anti-aliasing.
 */
export function renderRetroFontAtlasToCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  fontImage: CanvasImageSource,
  text: string,
  style: {
    fontSize?: string | number;
    color?: string;
    stroke?: string;
    strokeThickness?: number;
    align?: string;
    backgroundColor?: string | null;
  },
  padding?: { left?: number; right?: number; top?: number; bottom?: number },
  lineSpacing: number = 0
): PixelTextMetrics {
  const scale = getPixelFontScale(style.fontSize);
  const strokeThickness = style.strokeThickness !== undefined ? style.strokeThickness : 2;
  const metrics = measurePixelText(text, scale, strokeThickness, lineSpacing, padding, SCRATCH_METRICS);

  if (canvas.width !== metrics.width || canvas.height !== metrics.height) {
    canvas.width = metrics.width;
    canvas.height = metrics.height;
  } else {
    context.clearRect(0, 0, metrics.width, metrics.height);
  }

  const len = text ? text.length : 0;
  if (len === 0) {
    if (style.backgroundColor) {
      context.fillStyle = style.backgroundColor;
      context.fillRect(0, 0, metrics.width, metrics.height);
    }
    return metrics;
  }

  context.imageSmoothingEnabled = false;

  const padLeft = padding?.left ? Math.round(padding.left) : 0;
  const padTop = padding?.top ? Math.round(padding.top) : 0;
  const cellW = RETRO_FONT_CELL_WIDTH;
  const cellH = RETRO_FONT_CELL_HEIGHT;
  const drawW = cellW * metrics.scale;
  const drawH = cellH * metrics.scale;
  const advance = metrics.charAdvance;
  const rowAdvance = metrics.lineHeight + Math.round(lineSpacing);

  // Pass 1: Blit white foreground glyphs (Row 1: sy = 9)
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
      context.drawImage(
        fontImage,
        cellIdx * cellW,
        cellH,
        cellW,
        cellH,
        padLeft + col * advance,
        padTop + row * rowAdvance,
        drawW,
        drawH
      );
    }
    col++;
  }

  // Pass 2: Tint foreground glyphs to exact `style.color` in a single composite operation
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = style.color || '#ffffff';
  context.fillRect(0, 0, metrics.width, metrics.height);
  context.globalCompositeOperation = 'source-over';

  // Pass 3: Blit 1px black pixel outline (Row 0: sy = 0)
  if (strokeThickness > 0 && style.stroke !== '') {
    col = 0;
    row = 0;
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
        context.drawImage(
          fontImage,
          cellIdx * cellW,
          0,
          cellW,
          cellH,
          padLeft + col * advance,
          padTop + row * rowAdvance,
          drawW,
          drawH
        );
      }
      col++;
    }
  }

  // Optional solid background behind text
  if (style.backgroundColor) {
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, metrics.width, metrics.height);
    context.globalCompositeOperation = 'source-over';
  }

  return metrics;
}

// Fallback image loader if HMR reloads a scene before BootScene preloads `retro_font`
let fallbackFontImg: HTMLImageElement | null = null;
let fallbackFontLoaded = false;
const pendingTextInstances = new Set<any>();

function getFontSourceImage(textObj: any): CanvasImageSource | null {
  const textures = textObj.scene?.sys?.textures;
  if (textures && typeof textures.exists === 'function' && textures.exists('retro_font')) {
    const tex = textures.get('retro_font');
    const img = tex && typeof tex.getSourceImage === 'function' ? tex.getSourceImage() : null;
    if (img) return img as CanvasImageSource;
  }

  if (fallbackFontLoaded && fallbackFontImg) {
    return fallbackFontImg;
  }

  if (typeof Image !== 'undefined' && !fallbackFontImg) {
    fallbackFontImg = new Image();
    fallbackFontImg.onload = () => {
      fallbackFontLoaded = true;
      pendingTextInstances.forEach((inst) => {
        if (inst && inst.canvas && inst.context && typeof inst.updateText === 'function') {
          inst.updateText();
        }
      });
      pendingTextInstances.clear();
    };
    fallbackFontImg.src = 'assets/ui/retro_font.png';
  }

  if (fallbackFontImg && !fallbackFontLoaded) {
    pendingTextInstances.add(textObj);
  }

  return null;
}

/**
 * Patches Phaser.GameObjects.Text.prototype so any Text using RETRO_FONT_FAMILY
 * blits glyphs from the preloaded `retro_font.png` atlas with even-integer bounds and integer displayOrigins.
 */
export function installPixelTextRenderer(phaserNamespace: any = (globalThis as any).Phaser): void {
  const TextClass = phaserNamespace?.GameObjects?.Text;
  if (!TextClass || !TextClass.prototype) return;

  const proto = TextClass.prototype;

  if (!proto.__origUpdateText) {
    proto.__origUpdateText = proto.updateText;
  }
  if (!proto.__origRenderWebGL && proto.renderWebGL) {
    proto.__origRenderWebGL = proto.renderWebGL;
  } else if (proto.__origRenderWebGL) {
    // Restore native Phaser TextWebGLRenderer if HMR previously replaced renderWebGL
    proto.renderWebGL = proto.__origRenderWebGL;
  }

  const origUpdateText = proto.__origUpdateText;

  proto.updateDisplayOrigin = function () {
    this._displayOriginX = Math.round(this.originX * this.width);
    this._displayOriginY = Math.round(this.originY * this.height);
    return this;
  };

  proto.updateText = function () {
    if (this.style && this.style.fontFamily === RETRO_FONT_FAMILY && this.canvas && this.context) {
      const fontImg = getFontSourceImage(this);
      if (fontImg) {
        this.style.resolution = 1;
        const metrics = renderRetroFontAtlasToCanvas(
          this.canvas,
          this.context,
          fontImg,
          this._text || '',
          this.style,
          this.padding,
          this.lineSpacing || 0
        );

        this.width = metrics.width;
        this.height = metrics.height;
        this.updateDisplayOrigin();

        if (this.frame && typeof this.frame.setSize === 'function') {
          this.frame.setSize(this.width, this.height);
        }

        if (
          this.renderer &&
          this.renderer.gl &&
          typeof this.renderer.canvasToTexture === 'function' &&
          this.frame?.source
        ) {
          this.frame.source.glTexture = this.renderer.canvasToTexture(
            this.canvas,
            this.frame.source.glTexture,
            true
          );
        }

        if (this.input && !this.input.customHitArea && this.input.hitArea) {
          this.input.hitArea.width = this.width;
          this.input.hitArea.height = this.height;
        }

        return this;
      }
    }

    return origUpdateText ? origUpdateText.call(this) : this;
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
