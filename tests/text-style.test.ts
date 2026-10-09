import { describe, it, expect } from 'vitest';
import { createRetroTextStyle, RETRO_FONT_FAMILY } from '../src/ui/TextStyle';

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
});
