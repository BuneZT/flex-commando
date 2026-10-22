import { describe, it, expect, vi } from 'vitest';
import {
  createRetroTextStyle,
  RETRO_FONT_FAMILY,
  PIXEL_FONT_5X7,
  getPixelFontScale,
  measurePixelText,
  renderPixelTextToCanvas,
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

  it('should provide 5x7 pixel-art glyphs for all letters, digits, and HUD/menu symbols', () => {
    const requiredChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :![]/()%-❤∞★█░';
    for (const ch of requiredChars) {
      const glyph = PIXEL_FONT_5X7[ch];
      expect(glyph, `Missing glyph for "${ch}"`).toBeDefined();
      expect(glyph.length).toBe(7);
      for (const row of glyph) {
        expect(row.length).toBe(5);
        expect(row).toMatch(/^[01]{5}$/);
      }
    }
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

  it('should render pixel text using integer fillRect calls without anti-aliased fillText or strokeText', () => {
    const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const fillRectCalls: Array<[number, number, number, number]> = [];
    const context = {
      clearRect: vi.fn(),
      fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
        fillRectCalls.push([x, y, w, h]);
      }),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    const dims = renderPixelTextToCanvas(canvas, context, 'HI!', {
      fontSize: '10px',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    });

    expect(dims.width % 2).toBe(0);
    expect(dims.height % 2).toBe(0);
    expect(canvas.width).toBe(dims.width);
    expect(canvas.height).toBe(dims.height);
    expect(context.fillText).not.toHaveBeenCalled();
    expect(context.strokeText).not.toHaveBeenCalled();
    expect(fillRectCalls.length).toBeGreaterThan(0);

    for (const [x, y, w, h] of fillRectCalls) {
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
      expect(Number.isInteger(w)).toBe(true);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it('should patch Phaser Text prototype to use pixel-art rendering and integer displayOrigin', () => {
    const mockCanvas = { width: 0, height: 0 } as HTMLCanvasElement;
    const mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    class MockText {
      public canvas = mockCanvas;
      public context = mockContext;
      public _text = 'LIVES: ❤❤❤';
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
      public frame = { setSize: vi.fn(), source: { glTexture: {} } };
      public renderer = { gl: {}, canvasToTexture: vi.fn() };

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
    expect(mockContext.fillRect).toHaveBeenCalled();
    expect(textInstance.frame.setSize).toHaveBeenCalledWith(textInstance.width, textInstance.height);
    expect(textInstance.renderer.canvasToTexture).toHaveBeenCalled();
  });
});
