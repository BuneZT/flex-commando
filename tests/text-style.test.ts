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
  parseHexColor,
  getPixelFontScale,
  measurePixelText,
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
    expect(RETRO_FONT_ATLAS_HEIGHT).toBe(9);

    const requiredChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :![]/()%-❤∞★█░';
    for (let i = 0; i < requiredChars.length; i++) {
      const code = requiredChars.charCodeAt(i);
      const idx = getRetroFontCharIndex(code);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(RETRO_FONT_CHARS.length);
      expect(RETRO_FONT_CHARS.charCodeAt(idx)).toBe(code);
    }

    // Lowercase a-z maps to uppercase A-Z cell indices
    expect(getRetroFontCharIndex('a'.charCodeAt(0))).toBe(getRetroFontCharIndex('A'.charCodeAt(0)));
    expect(getRetroFontCharIndex('z'.charCodeAt(0))).toBe(getRetroFontCharIndex('Z'.charCodeAt(0)));
  });

  it('should parse hex colors to 24-bit RGB integers without allocations', () => {
    expect(parseHexColor('#ffcc00')).toBe(0xffcc00);
    expect(parseHexColor('#00ffff')).toBe(0x00ffff);
    expect(parseHexColor('#ff4444')).toBe(0xff4444);
    expect(parseHexColor('#fff')).toBe(0xffffff);
    expect(parseHexColor(0x00ff88)).toBe(0x00ff88);
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

  it('should patch Phaser Text prototype to batch glyphs directly from preloaded retro_font texture with zero canvas drawing', () => {
    const mockGlTexture = { id: 'gl_retro_font' };
    const batchTextureSpy = vi.fn();
    const setTexture2DSpy = vi.fn().mockReturnValue(0);
    const mockPipeline = {
      setTexture2D: setTexture2DSpy,
      batchTexture: batchTextureSpy,
    };
    const mockRenderer = {
      pipelines: {
        set: vi.fn().mockReturnValue(mockPipeline),
      },
      canvasToTexture: vi.fn(),
    };
    const mockCamera = {
      addToRenderList: vi.fn(),
      alpha: 1,
    };

    class MockText {
      public _text = 'HI!';
      public style = {
        fontFamily: RETRO_FONT_FAMILY,
        fontSize: '10px',
        color: '#ffcc00',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center',
        resolution: 1,
      };
      public scene = {
        sys: {
          textures: {
            get: vi.fn((key: string) =>
              key === 'retro_font' ? { source: [{ glTexture: mockGlTexture }] } : null
            ),
          },
        },
      };
      public padding = { left: 0, right: 0, top: 0, bottom: 0 };
      public lineSpacing = 0;
      public width = 0;
      public height = 0;
      public x = 256;
      public y = 144;
      public scaleX = 1;
      public scaleY = 1;
      public rotation = 0;
      public flipX = false;
      public flipY = false;
      public scrollFactorX = 0;
      public scrollFactorY = 0;
      public originX = 0.5;
      public originY = 0.5;
      public _displayOriginX = 0;
      public _displayOriginY = 0;
      public _alphaTL = 1;
      public pipeline = {};
      public frame = { setSize: vi.fn(), source: { glTexture: {} } };
      public renderer = mockRenderer;

      get displayOriginX() {
        return this._displayOriginX;
      }

      get displayOriginY() {
        return this._displayOriginY;
      }

      updateDisplayOrigin() {
        this._displayOriginX = this.originX * this.width;
        this._displayOriginY = this.originY * this.height;
        return this;
      }

      updateText() {
        return this;
      }

      renderWebGL(_renderer: any, _src: any, _camera: any, _parentMatrix: any) {}
    }

    const fakePhaser = {
      GameObjects: {
        Text: MockText,
      },
    } as any;

    installPixelTextRenderer(fakePhaser);

    const textInstance = new MockText();
    textInstance.updateText();

    // Verify zero canvas upload during updateText()
    expect(mockRenderer.canvasToTexture).not.toHaveBeenCalled();
    expect(textInstance.width % 2).toBe(0);
    expect(textInstance.height % 2).toBe(0);
    expect(Number.isInteger(textInstance._displayOriginX)).toBe(true);
    expect(Number.isInteger(textInstance._displayOriginY)).toBe(true);

    // Verify WebGL rendering batches character quads from preloaded retro_font texture
    textInstance.renderWebGL(mockRenderer, textInstance, mockCamera, null);
    expect(mockCamera.addToRenderList).toHaveBeenCalledWith(textInstance);
    expect(setTexture2DSpy).toHaveBeenCalledWith(mockGlTexture, textInstance);
    expect(batchTextureSpy).toHaveBeenCalledTimes(3); // 'H', 'I', '!'
  });
});
