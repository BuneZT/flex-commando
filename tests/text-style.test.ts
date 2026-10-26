import { describe, it, expect, vi } from 'vitest';
import {
  createRetroTextStyle,
  RETRO_FONT_FAMILY,
  RETRO_FONT_CHARS,
  RETRO_FONT_CELL_WIDTH,
  RETRO_FONT_CELL_HEIGHT,
  RETRO_FONT_ATLAS_WIDTH,
  RETRO_FONT_ATLAS_HEIGHT,
  getRetroFontCharIndex,
  getPixelFontScale,
  measurePixelText,
  renderRetroFontAtlasToCanvas,
  installPixelTextRenderer,
} from '../src/ui/TextStyle';

describe('TextStyle', () => {
  it('should generate default retro text style with crisp bold font and dark stroke', () => {
    const style = createRetroTextStyle();
    expect(style.fontFamily).toBe(RETRO_FONT_FAMILY);
    expect(style.fontSize).toBe('10px');
    expect(style.fontStyle).toBe('bold');
    expect(style.color).toBe('#ffffff');
    expect(style.stroke).toBe('#000000');
    expect(style.strokeThickness).toBe(2);
    expect(style.align).toBe('center');
  });

  it('should allow custom overrides for font size, color, stroke, and alignments', () => {
    const custom = createRetroTextStyle({
      fontSize: '14px',
      color: '#ffcc00',
      strokeThickness: 3,
      align: 'left',
      backgroundColor: '#222222',
    });
    expect(custom.fontFamily).toBe(RETRO_FONT_FAMILY);
    expect(custom.fontSize).toBe('14px');
    expect(custom.fontStyle).toBe('bold');
    expect(custom.color).toBe('#ffcc00');
    expect(custom.strokeThickness).toBe(3);
    expect(custom.align).toBe('left');
    expect(custom.backgroundColor).toBe('#222222');
  });

  it('should include Consolas in the font stack for Windows clarity', () => {
    expect(RETRO_FONT_FAMILY).toContain('Consolas');
  });

  it('should map all letters, digits, and HUD/menu symbols to valid cell indices in retro_font.png', () => {
    expect(RETRO_FONT_CELL_WIDTH).toBe(7);
    expect(RETRO_FONT_CELL_HEIGHT).toBe(9);
    expect(RETRO_FONT_ATLAS_WIDTH).toBe(406);
    expect(RETRO_FONT_ATLAS_HEIGHT).toBe(18);

    const requiredChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :![]/()%-❤∞★█░';
    for (let i = 0; i < requiredChars.length; i++) {
      const code = requiredChars.charCodeAt(i);
      const idx = getRetroFontCharIndex(code);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(RETRO_FONT_CHARS.length);
      expect(RETRO_FONT_CHARS.charCodeAt(idx)).toBe(code);
    }

    expect(getRetroFontCharIndex('a'.charCodeAt(0))).toBe(getRetroFontCharIndex('A'.charCodeAt(0)));
    expect(getRetroFontCharIndex('z'.charCodeAt(0))).toBe(getRetroFontCharIndex('Z'.charCodeAt(0)));
  });

  it('should compute integer pixel font scale from fontSize string', () => {
    expect(getPixelFontScale('9px')).toBe(1);
    expect(getPixelFontScale('10px')).toBe(1);
    expect(getPixelFontScale('11px')).toBe(1);
    expect(getPixelFontScale('13px')).toBe(1);
    expect(getPixelFontScale('14px')).toBe(2);
    expect(getPixelFontScale('22px')).toBe(2);
  });

  it('should measure pixel text with even integer dimensions so 0.5 origin never lands on half-pixels', () => {
    const m1 = measurePixelText('PRESS SPACE TO START', 1, 2);
    expect(m1.width % 2).toBe(0);
    expect(m1.height % 2).toBe(0);
    expect((m1.width * 0.5) % 1).toBe(0);
    expect((m1.height * 0.5) % 1).toBe(0);

    const m2 = measurePixelText('GAME OVER', 2, 3);
    expect(m2.width % 2).toBe(0);
    expect(m2.height % 2).toBe(0);
    expect((m2.width * 0.5) % 1).toBe(0);
    expect((m2.height * 0.5) % 1).toBe(0);
  });

  it('should blit glyphs from preloaded retro_font image using integer drawImage calls without fillText or strokeText', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const drawImageCalls: Array<number[]> = [];
    const context = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn((_img: any, ...coords: number[]) => {
        drawImageCalls.push(coords);
      }),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D;

    const fakeFontImg = {} as CanvasImageSource;
    const dims = renderRetroFontAtlasToCanvas(canvas, context, fakeFontImg, 'HI!', {
      fontSize: '10px',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    });

    expect(dims.width % 2).toBe(0);
    expect(dims.height % 2).toBe(0);
    expect(context.imageSmoothingEnabled).toBe(false);
    expect(context.fillText).not.toHaveBeenCalled();
    expect(context.strokeText).not.toHaveBeenCalled();
    expect(drawImageCalls.length).toBe(6); // 3 foreground cells + 3 outline cells

    for (const coords of drawImageCalls) {
      for (const n of coords) {
        expect(Number.isInteger(n)).toBe(true);
      }
    }
  });

  it('should patch Phaser Text prototype to blit from preloaded retro_font texture and upload to glTexture', () => {
    const mockCanvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D;
    const fakeFontImg = {} as HTMLImageElement;

    class MockText {
      public canvas = mockCanvas;
      public context = mockContext;
      public _text = 'LIVES: ❤❤❤';
      public scene = {
        sys: {
          textures: {
            exists: vi.fn((key: string) => key === 'retro_font'),
            get: vi.fn(() => ({
              getSourceImage: () => fakeFontImg,
            })),
          },
        },
      };
      public style = {
        fontFamily: RETRO_FONT_FAMILY,
        fontSize: '10px',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'left',
        resolution: 1,
      };
      public padding = { left: 0, right: 0, top: 0, bottom: 0 };
      public lineSpacing = 0;
      public width = 0;
      public height = 0;
      public originX = 0.5;
      public originY = 0.5;
      public _displayOriginX = 0;
      public _displayOriginY = 0;
      public frame = {
        setSize: vi.fn(),
        updateUVs: vi.fn(),
        source: { glTexture: {}, updateSize: vi.fn(), resolution: 1 },
      };
      public renderer = { gl: {}, canvasToTexture: vi.fn().mockReturnValue({ id: 'gl_tex' }) };

      updateDisplayOrigin() {
        this._displayOriginX = this.originX * this.width;
        this._displayOriginY = this.originY * this.height;
        return this;
      }

      updateText() {
        return this;
      }
    }

    const fakePhaser = {
      GameObjects: {
        Text: MockText,
      },
    } as any;

    installPixelTextRenderer(fakePhaser);

    const textInstance = new MockText();
    textInstance.updateText();

    expect(textInstance.width % 2).toBe(0);
    expect(textInstance.height % 2).toBe(0);
    expect(Number.isInteger(textInstance._displayOriginX)).toBe(true);
    expect(Number.isInteger(textInstance._displayOriginY)).toBe(true);
    expect(mockContext.drawImage).toHaveBeenCalled();
    expect(textInstance.frame.setSize).toHaveBeenCalledWith(textInstance.width, textInstance.height);
    expect(textInstance.frame.source.updateSize).toHaveBeenCalledWith(textInstance.width, textInstance.height);
    expect(textInstance.frame.updateUVs).toHaveBeenCalled();
    expect(textInstance.renderer.canvasToTexture).toHaveBeenCalled();
  });
});
