import type Phaser from 'phaser';

/**
 * Standard retro arcade font stack:
 * Prioritizes crisp sans-serif monospace fonts (Consolas on Windows, Monaco/Menlo on macOS,
 * Liberation Mono on Linux) with heavy, uniform stems for razor-sharp pixel art rendering.
 */
export const RETRO_FONT_FAMILY = 'Consolas, "Lucida Console", "Liberation Mono", "DejaVu Sans Mono", monospace';

/**
 * 5x7 pixel-art bitmap font map (zero anti-aliasing, integer grid aligned).
 * Every glyph is 5 columns wide by 7 rows high ('1' = solid pixel, '0' = transparent).
 */
export const PIXEL_FONT_5X7: Readonly<Record<string, readonly string[]>> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['10010', '10010', '10010', '11111', '00010', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01111', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '00100', '00100', '00100'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '11110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00010', '00100', '00100', '00000', '00100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00100', '00100'],
  ',': ['00000', '00000', '00000', '00000', '00100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  '(': ['00110', '01000', '01000', '01000', '01000', '01000', '00110'],
  ')': ['01100', '00010', '00010', '00010', '00010', '00010', '01100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  "'": ['00100', '00100', '00000', '00000', '00000', '00000', '00000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '❤': ['01010', '11111', '11111', '11111', '01110', '00100', '00000'],
  '∞': ['00000', '01010', '10101', '10101', '01010', '00000', '00000'],
  '★': ['00100', '00100', '11111', '01110', '01010', '10001', '00000'],
  '█': ['11111', '11111', '11111', '11111', '11111', '11111', '11111'],
  '░': ['10101', '01010', '10101', '01010', '10101', '01010', '10101'],
};

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
  lines: string[];
  lineWidths: number[];
  scale: number;
  outline: number;
  charAdvance: number;
  lineHeight: number;
}

/**
 * Converts a CSS fontSize (e.g. '9px', '10px', '22px') into an integer pixel scale factor
 * so 5x7 bitmap glyphs always snap to exact pixel multiples without sub-pixel distortion.
 */
export function getPixelFontScale(fontSize?: string | number): number {
  if (typeof fontSize === 'number') {
    return fontSize >= 14 ? 2 : 1;
  }
  const parsed = parseInt(String(fontSize || '10px'), 10);
  if (Number.isNaN(parsed)) return 1;
  return parsed >= 14 ? 2 : 1;
}

/**
 * Measures a text string rendered with the 5x7 pixel-art bitmap font.
 * Guarantees even-integer width and height so `.setOrigin(0.5)` never produces `.5` sub-pixel offsets.
 */
export function measurePixelText(
  text: string,
  scale: number = 1,
  strokeThickness: number = 2,
  lineSpacing: number = 0,
  padding: { left?: number; right?: number; top?: number; bottom?: number } = {}
): PixelTextMetrics {
  const safeScale = Math.max(1, Math.round(scale));
  const hasOutline = strokeThickness > 0;
  const outline = hasOutline ? safeScale : 0;
  const charWidth = 5 * safeScale;
  const charGap = 1 * safeScale;
  const charAdvance = charWidth + charGap;
  const charHeight = 7 * safeScale;
  const lineHeight = charHeight + outline * 2;

  const rawText = String(text ?? '');
  const lines = rawText.length > 0 ? rawText.split(/\r?\n/) : [''];
  const lineWidths: number[] = [];
  let maxLineWidth = 0;

  for (let i = 0; i < lines.length; i++) {
    const len = Array.from(lines[i]).length;
    const w = len > 0 ? len * charAdvance - charGap + outline * 2 : 0;
    lineWidths.push(w);
    if (w > maxLineWidth) {
      maxLineWidth = w;
    }
  }

  const padLeft = Math.round(padding.left || 0);
  const padRight = Math.round(padding.right || 0);
  const padTop = Math.round(padding.top || 0);
  const padBottom = Math.round(padding.bottom || 0);

  const totalLineSpacing = lines.length > 1 ? (lines.length - 1) * Math.round(lineSpacing) : 0;
  let width = Math.max(2, maxLineWidth + padLeft + padRight);
  let height = Math.max(2, lines.length * lineHeight + totalLineSpacing + padTop + padBottom);

  // Pad to even integer dimensions so origin 0.5 always lands on an exact integer pixel
  if (width % 2 !== 0) width += 1;
  if (height % 2 !== 0) height += 1;

  return {
    width,
    height,
    lines,
    lineWidths,
    scale: safeScale,
    outline,
    charAdvance,
    lineHeight,
  };
}

function isGlyphPixelSet(glyph: readonly string[], gx: number, gy: number): boolean {
  if (gy < 0 || gy >= 7 || gx < 0 || gx >= 5) return false;
  return glyph[gy][gx] === '1';
}

function isOutlinePixel(glyph: readonly string[], gx: number, gy: number): boolean {
  if (isGlyphPixelSet(glyph, gx, gy)) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (isGlyphPixelSet(glyph, gx + dx, gy + dy)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Renders crisp, non-antialiased 5x7 pixel-art glyphs directly onto a 2D canvas context
 * using integer `fillRect` calls (zero browser `fillText`/`strokeText` font smoothing).
 */
export function renderPixelTextToCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  text: string,
  style: {
    fontSize?: string | number;
    color?: string;
    stroke?: string;
    strokeThickness?: number;
    align?: string;
    backgroundColor?: string | null;
  },
  padding: { left?: number; right?: number; top?: number; bottom?: number } = {},
  lineSpacing: number = 0
): PixelTextMetrics {
  const scale = getPixelFontScale(style.fontSize);
  const strokeThickness = style.strokeThickness !== undefined ? style.strokeThickness : 2;
  const metrics = measurePixelText(text, scale, strokeThickness, lineSpacing, padding);

  if (canvas.width !== metrics.width || canvas.height !== metrics.height) {
    canvas.width = metrics.width;
    canvas.height = metrics.height;
  } else {
    context.clearRect(0, 0, metrics.width, metrics.height);
  }

  if (style.backgroundColor) {
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, metrics.width, metrics.height);
  }

  if (!text || text.length === 0) {
    return metrics;
  }

  const padLeft = Math.round(padding.left || 0);
  const padRight = Math.round(padding.right || 0);
  const padTop = Math.round(padding.top || 0);
  const innerWidth = metrics.width - padLeft - padRight;
  const outline = metrics.outline;
  const hasOutline = outline > 0 && !!style.stroke;
  const fgColor = style.color || '#ffffff';
  const strokeColor = style.stroke || '#000000';

  for (let lineIdx = 0; lineIdx < metrics.lines.length; lineIdx++) {
    const chars = Array.from(metrics.lines[lineIdx].toUpperCase());
    const lineW = metrics.lineWidths[lineIdx];

    let lineStartX = padLeft;
    if (style.align === 'center') {
      lineStartX = padLeft + Math.floor((innerWidth - lineW) / 2);
    } else if (style.align === 'right') {
      lineStartX = padLeft + (innerWidth - lineW);
    }

    const lineStartY = padTop + lineIdx * (metrics.lineHeight + Math.round(lineSpacing));

    // Pass 1: Crisp 1-unit pixel outline
    if (hasOutline) {
      context.fillStyle = strokeColor;
      for (let c = 0; c < chars.length; c++) {
        const glyph = PIXEL_FONT_5X7[chars[c]] || PIXEL_FONT_5X7[' '];
        const charX = lineStartX + c * metrics.charAdvance;
        for (let gy = -1; gy <= 7; gy++) {
          for (let gx = -1; gx <= 5; gx++) {
            if (isOutlinePixel(glyph, gx, gy)) {
              context.fillRect(
                charX + gx * scale + outline,
                lineStartY + gy * scale + outline,
                scale,
                scale
              );
            }
          }
        }
      }
    }

    // Pass 2: Crisp foreground glyph pixels
    context.fillStyle = fgColor;
    for (let c = 0; c < chars.length; c++) {
      const glyph = PIXEL_FONT_5X7[chars[c]] || PIXEL_FONT_5X7[' '];
      const charX = lineStartX + c * metrics.charAdvance;
      for (let gy = 0; gy < 7; gy++) {
        const row = glyph[gy];
        for (let gx = 0; gx < 5; gx++) {
          if (row[gx] === '1') {
            context.fillRect(
              charX + gx * scale + outline,
              lineStartY + gy * scale + outline,
              scale,
              scale
            );
          }
        }
      }
    }
  }

  return metrics;
}

/**
 * Patches Phaser.GameObjects.Text.prototype so any Text using RETRO_FONT_FAMILY
 * renders via `renderPixelTextToCanvas` with integer display origins.
 */
export function installPixelTextRenderer(phaserNamespace: any = (globalThis as any).Phaser): void {
  const TextClass = phaserNamespace?.GameObjects?.Text;
  if (!TextClass || !TextClass.prototype) return;

  const proto = TextClass.prototype;
  if (proto.__pixelTextPatched) return;

  const origUpdateText = proto.updateText;

  proto.updateDisplayOrigin = function () {
    this._displayOriginX = Math.round(this.originX * this.width);
    this._displayOriginY = Math.round(this.originY * this.height);
    return this;
  };

  proto.updateText = function () {
    if (this.style && this.style.fontFamily === RETRO_FONT_FAMILY && this.canvas && this.context) {
      this.style.resolution = 1;
      const metrics = renderPixelTextToCanvas(
        this.canvas,
        this.context,
        this._text,
        this.style,
        this.padding || {},
        this.lineSpacing || 0
      );

      this.width = metrics.width;
      this.height = metrics.height;
      this.updateDisplayOrigin();

      if (this.frame && typeof this.frame.setSize === 'function') {
        this.frame.setSize(this.width, this.height);
      }

      if (this.renderer && this.renderer.gl && typeof this.renderer.canvasToTexture === 'function' && this.frame?.source) {
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
