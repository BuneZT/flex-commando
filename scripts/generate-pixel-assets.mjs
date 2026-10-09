import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// --- CRC32 & PNG Encoding ---

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}
const CRC_TABLE = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function parseColor(c, defaultAlpha = 255) {
  if (typeof c === 'number') {
    return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff, defaultAlpha];
  }
  if (typeof c === 'string') {
    let hex = c.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map((ch) => ch + ch).join('');
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        defaultAlpha,
      ];
    }
    if (hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        parseInt(hex.slice(6, 8), 16),
      ];
    }
  }
  if (Array.isArray(c)) {
    return [c[0], c[1], c[2], c[3] !== undefined ? c[3] : defaultAlpha];
  }
  return [0, 0, 0, 0];
}

class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = Buffer.alloc(width * height * 4, 0);
  }

  setPixel(x, y, color, customAlpha) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const [r, g, b, baseA] = parseColor(color);
    const a = customAlpha !== undefined ? customAlpha : baseA;
    if (a <= 0) return;

    const idx = (y * this.width + x) * 4;
    if (a === 255) {
      this.buffer[idx] = r;
      this.buffer[idx + 1] = g;
      this.buffer[idx + 2] = b;
      this.buffer[idx + 3] = 255;
    } else {
      const srcA = a / 255;
      const dstA = this.buffer[idx + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);
      if (outA > 0) {
        this.buffer[idx] = Math.round((r * srcA + this.buffer[idx] * dstA * (1 - srcA)) / outA);
        this.buffer[idx + 1] = Math.round((g * srcA + this.buffer[idx + 1] * dstA * (1 - srcA)) / outA);
        this.buffer[idx + 2] = Math.round((b * srcA + this.buffer[idx + 2] * dstA * (1 - srcA)) / outA);
        this.buffer[idx + 3] = Math.round(outA * 255);
      }
    }
  }

  fillRect(x, y, w, h, color) {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setPixel(x + dx, y + dy, color);
      }
    }
  }

  strokeRect(x, y, w, h, color) {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    for (let dx = 0; dx < w; dx++) {
      this.setPixel(x + dx, y, color);
      this.setPixel(x + dx, y + h - 1, color);
    }
    for (let dy = 0; dy < h; dy++) {
      this.setPixel(x, y + dy, color);
      this.setPixel(x + w - 1, y + dy, color);
    }
  }

  fillCircle(cx, cy, radius, color) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    radius = Math.round(radius);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          this.setPixel(cx + dx, cy + dy, color);
        }
      }
    }
  }

  drawLine(x0, y0, x1, y1, color) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.setPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  drawBitmap(startX, startY, rows, palette) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const char = row[x];
        if (char !== '.' && char !== ' ' && palette[char]) {
          this.setPixel(startX + x, startY + y, palette[char]);
        }
      }
    }
  }

  drawText5x7(startX, startY, text, color, scale = 1, shadowColor = null) {
    const FONT_MAP = {
      A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
      B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
      C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
      D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
      E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
      F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
      G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
      L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
      M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
      N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
      O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
      R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
      S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
      U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
      X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
      ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    };

    let curX = startX;
    for (const char of text.toUpperCase()) {
      const glyph = FONT_MAP[char] || FONT_MAP[' '];
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (glyph[gy][gx] === '1') {
            if (shadowColor) {
              this.fillRect(curX + gx * scale + scale, startY + gy * scale + scale, scale, scale, shadowColor);
            }
            this.fillRect(curX + gx * scale, startY + gy * scale, scale, scale, color);
          }
        }
      }
      curX += (5 + 1) * scale;
    }
  }

  toPNG() {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(this.width, 0);
    ihdrData.writeUInt32BE(this.height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 6; // color type RGBA
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdrChunk = createChunk('IHDR', ihdrData);

    const rowLen = this.width * 4;
    const scanlines = Buffer.alloc(this.height * (rowLen + 1));
    for (let y = 0; y < this.height; y++) {
      scanlines[y * (rowLen + 1)] = 0;
      this.buffer.copy(scanlines, y * (rowLen + 1) + 1, y * rowLen, (y + 1) * rowLen);
    }

    const idatData = zlib.deflateSync(scanlines);
    const idatChunk = createChunk('IDAT', idatData);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  }
}

// ============================================================================
// ASSET BUILDERS
// ============================================================================

/**
 * 1. public/assets/ui/logo.png (200x50)
 * Fiery orange/yellow metallic title banner with cyan outer border
 */
function generateLogo() {
  const canvas = new PixelCanvas(200, 50);

  // Background banner shape
  canvas.fillRect(4, 4, 192, 42, '#0B0F1C');
  canvas.fillRect(6, 6, 188, 38, '#141E34');
  canvas.fillRect(8, 8, 184, 34, '#1C2A47');

  // Outer cyber border with cyan brackets
  canvas.strokeRect(4, 4, 192, 42, '#00E5FF');
  canvas.strokeRect(6, 6, 188, 38, '#007799');

  // Tech corner brackets
  const cornerColors = '#00FFFF';
  // Top-left
  canvas.fillRect(2, 2, 8, 3, cornerColors);
  canvas.fillRect(2, 2, 3, 8, cornerColors);
  // Top-right
  canvas.fillRect(190, 2, 8, 3, cornerColors);
  canvas.fillRect(195, 2, 3, 8, cornerColors);
  // Bottom-left
  canvas.fillRect(2, 45, 8, 3, cornerColors);
  canvas.fillRect(2, 40, 3, 8, cornerColors);
  // Bottom-right
  canvas.fillRect(190, 45, 8, 3, cornerColors);
  canvas.fillRect(195, 40, 3, 8, cornerColors);

  // Gradient metallic title: "FLEX COMMANDO"
  // 13 chars * 6 * 2 = 156 px wide. Center at (200 - 156) / 2 = 22
  const text1 = 'FLEX COMMANDO';
  const startX = 22;
  const startY = 11;

  // Multi-pass gradient with shadow
  // Shadow pass
  canvas.drawText5x7(startX + 2, startY + 2, text1, '#1A0000', 2);
  // Base outline pass
  canvas.drawText5x7(startX - 1, startY, text1, '#4A0D00', 2);
  canvas.drawText5x7(startX + 1, startY, text1, '#4A0D00', 2);
  canvas.drawText5x7(startX, startY - 1, text1, '#4A0D00', 2);
  canvas.drawText5x7(startX, startY + 1, text1, '#4A0D00', 2);

  // Main gradient text
  canvas.drawText5x7(startX, startY, text1, '#FF7700', 2);

  // Overwrite top half with fiery yellow/gold highlight
  for (let y = startY; y < startY + 7; y++) {
    for (let x = startX; x < startX + 156; x++) {
      const idx = (y * 200 + x) * 4;
      if (canvas.buffer[idx + 3] === 255 && canvas.buffer[idx] > 200 && canvas.buffer[idx + 1] > 80) {
        canvas.buffer[idx] = 255;
        canvas.buffer[idx + 1] = 220;
        canvas.buffer[idx + 2] = 50;
      }
    }
  }

  // Subtitle banner line & "ROGUE BEEF"
  canvas.drawLine(20, 30, 180, 30, '#00E5FF');
  canvas.drawLine(20, 31, 180, 31, '#004466');

  // "ROGUE BEEF" is 10 chars * 6 = 60px wide. Center at (200 - 60) / 2 = 70
  canvas.drawText5x7(70, 34, 'ROGUE BEEF', '#00FFFF', 1, '#001A24');

  return canvas.toPNG();
}

/**
 * 2. public/assets/bg/cyber_hangar_bg.png (320x240)
 * Dark indigo hangar interior with perspective grid floor and neon conduit cables
 */
function generateCyberHangarBg() {
  const canvas = new PixelCanvas(320, 240);

  // Wall gradient (y = 0 to 150)
  for (let y = 0; y < 150; y++) {
    const t = y / 150;
    const r = Math.round(8 + t * 14);
    const g = Math.round(10 + t * 18);
    const b = Math.round(24 + t * 45);
    canvas.fillRect(0, y, 320, 1, [r, g, b, 255]);
  }

  // Ceiling industrial trusses (y = 0 to 28)
  for (let x = 0; x < 320; x += 32) {
    canvas.drawLine(x, 0, x + 16, 24, '#1C2642');
    canvas.drawLine(x + 16, 24, x + 32, 0, '#1C2642');
    canvas.fillRect(x, 0, 32, 4, '#2A3860');
  }

  // Structural pillars repeating every 80px (x=20, 100, 180, 260)
  for (let px = 20; px < 320; px += 80) {
    canvas.fillRect(px, 16, 12, 134, '#162038');
    canvas.fillRect(px + 1, 16, 2, 134, '#243254');
    canvas.fillRect(px + 10, 16, 2, 134, '#0D1424');
    // Vertical LED indicator strip on pillar
    for (let ly = 30; ly < 140; ly += 16) {
      canvas.fillRect(px + 5, ly, 2, 4, ly % 32 === 0 ? '#00FF88' : '#00E5FF');
    }
  }

  // Neon conduit cables running horizontally across the hangar
  // Cyan upper conduit
  canvas.fillRect(0, 42, 320, 2, '#004866');
  canvas.fillRect(0, 43, 320, 1, '#00E5FF');
  // Magenta mid conduit
  canvas.fillRect(0, 78, 320, 2, '#66003A');
  canvas.fillRect(0, 79, 320, 1, '#FF0077');
  // Amber lower conduit
  canvas.fillRect(0, 114, 320, 2, '#664400');
  canvas.fillRect(0, 115, 320, 1, '#FFAA00');

  // Hazard stripe catwalk at horizon (y = 146 to 150)
  for (let x = 0; x < 320; x++) {
    const isStripe = (Math.floor(x / 8) + 0) % 2 === 0;
    canvas.setPixel(x, 147, isStripe ? '#FFB800' : '#1A1E2E');
    canvas.setPixel(x, 148, isStripe ? '#FF9900' : '#111420');
    canvas.setPixel(x, 149, '#00E5FF');
  }

  // Floor base gradient (y = 150 to 240)
  for (let y = 150; y < 240; y++) {
    const t = (y - 150) / 90;
    const r = Math.round(10 + t * 15);
    const g = Math.round(14 + t * 20);
    const b = Math.round(32 + t * 40);
    canvas.fillRect(0, y, 320, 1, [r, g, b, 255]);
  }

  // Perspective floor grid lines (horizontal)
  const gridRows = [153, 157, 163, 171, 181, 194, 210, 228];
  gridRows.forEach((gy, idx) => {
    const intensity = 0.3 + (idx / gridRows.length) * 0.7;
    const r = Math.round(0 * intensity);
    const g = Math.round(180 * intensity);
    const b = Math.round(255 * intensity);
    canvas.fillRect(0, gy, 320, idx >= 5 ? 2 : 1, [r, g, b, 220]);
  });

  // Perspective floor rays radiating from vanishing points
  // Seamless: span across 320px
  for (let vx = -160; vx < 480; vx += 32) {
    const xTop = vx;
    const xBottom = vx + (vx - 160) * 1.5;
    canvas.drawLine(xTop, 150, xBottom, 240, '#005588');
    // Wrap to canvas bounds cleanly
  }

  return canvas.toPNG();
}

/**
 * 3. public/assets/tiles/tileset.png (80x16)
 * 5 tiles of 16x16:
 * 0: Air (transparent)
 * 1: Steel Grid Floor
 * 2: Cyber Catwalk Girder
 * 3: Server Wall Pillar
 * 4: Green Exit Portal
 */
function generateTileset() {
  const canvas = new PixelCanvas(80, 16);

  // --- Tile 0 (0..15): Air (Transparent) ---
  // left transparent

  // --- Tile 1 (16..31): Steel Grid Floor ---
  const t1 = 16;
  canvas.fillRect(t1, 0, 16, 16, '#2E354F');
  // Top edge highlight
  canvas.fillRect(t1, 0, 16, 2, '#7A88B0');
  canvas.fillRect(t1, 2, 16, 1, '#4A5578');
  // Bottom shadow
  canvas.fillRect(t1, 14, 16, 2, '#141824');
  // Inner diamond / tread pattern
  for (let dy = 4; dy < 13; dy += 3) {
    for (let dx = 2; dx < 14; dx += 3) {
      canvas.setPixel(t1 + dx, dy, '#3E496C');
      canvas.setPixel(t1 + dx + 1, dy + 1, '#1E2335');
    }
  }
  // Corner rivets
  const rivets = [
    [2, 3], [13, 3],
    [2, 11], [13, 11],
  ];
  rivets.forEach(([rx, ry]) => {
    canvas.fillRect(t1 + rx, ry, 2, 2, '#8899BB');
    canvas.setPixel(t1 + rx, ry, '#DDEEFF');
    canvas.setPixel(t1 + rx + 1, ry + 1, '#202838');
  });

  // --- Tile 2 (32..47): Cyber Catwalk Girder ---
  const t2 = 32;
  // Glowing cyan top rail
  canvas.fillRect(t2, 0, 16, 1, '#00FFFF');
  canvas.fillRect(t2, 1, 16, 2, '#00A2B8');
  canvas.fillRect(t2, 3, 16, 2, '#384656');
  // Open girder trusses (diagonal struts)
  canvas.drawLine(t2 + 1, 5, t2 + 6, 14, '#48586C');
  canvas.drawLine(t2 + 2, 5, t2 + 7, 14, '#2B3542');
  canvas.drawLine(t2 + 14, 5, t2 + 9, 14, '#48586C');
  canvas.drawLine(t2 + 13, 5, t2 + 8, 14, '#2B3542');
  // Support posts
  canvas.fillRect(t2 + 1, 13, 14, 3, '#222B36');
  canvas.fillRect(t2 + 2, 14, 12, 1, '#5B6E85');

  // --- Tile 3 (48..63): Server Wall Pillar ---
  const t3 = 48;
  canvas.fillRect(t3, 0, 16, 16, '#3A2E48');
  // Outer armor bevels
  canvas.fillRect(t3, 0, 2, 16, '#5C4970');
  canvas.fillRect(t3 + 14, 0, 2, 16, '#241C2E');
  // Horizontal ventilation slots
  for (let dy = 2; dy < 14; dy += 3) {
    canvas.fillRect(t3 + 3, dy, 10, 1, '#1A1422');
    canvas.fillRect(t3 + 3, dy + 1, 10, 1, '#4A3B5C');
  }
  // Vertical blinking indicator LEDs
  canvas.fillRect(t3 + 4, 3, 2, 1, '#00E5FF');
  canvas.fillRect(t3 + 4, 6, 2, 1, '#00FF66');
  canvas.fillRect(t3 + 4, 9, 2, 1, '#FF2244');
  canvas.fillRect(t3 + 4, 12, 2, 1, '#FFFF00');

  // --- Tile 4 (64..79): Green Exit Portal ---
  const t4 = 64;
  canvas.fillRect(t4, 0, 16, 16, '#00FF88');
  canvas.fillRect(t4 + 1, 1, 14, 14, '#008844');
  // Tech door frame
  canvas.fillRect(t4 + 2, 2, 12, 12, '#FFFF44');
  canvas.fillRect(t4 + 3, 3, 10, 10, '#AA9900');
  // Swirling cyan vortex core
  canvas.fillRect(t4 + 4, 4, 8, 8, '#00FFFF');
  canvas.fillRect(t4 + 5, 5, 6, 6, '#40FFFF');
  canvas.fillRect(t4 + 6, 6, 4, 4, '#FFFFFF');
  // Energy sparks
  canvas.setPixel(t4 + 4, 2, '#FFFFFF');
  canvas.setPixel(t4 + 11, 13, '#FFFFFF');
  canvas.setPixel(t4 + 2, 12, '#00FFFF');
  canvas.setPixel(t4 + 13, 3, '#00FFFF');

  return canvas.toPNG();
}

/**
 * 4. public/assets/sprites/player.png (144x24)
 * 6 frames of 24x24:
 * 0: Idle, 1: Run1, 2: Run2, 3: Jump, 4: Crouch, 5: Shoot
 */
function generatePlayer() {
  const canvas = new PixelCanvas(144, 24);

  for (let f = 0; f < 6; f++) {
    const ox = f * 24;

    // Headband & hair
    canvas.fillRect(ox + 8, 2, 8, 3, '#E02020'); // Red headband
    canvas.fillRect(ox + 6, 3, 2, 2, '#FF4040'); // Trailing ribbon
    canvas.fillRect(ox + 4, 4, 2, 2, '#CC1111'); // Ribbon tail
    canvas.fillRect(ox + 8, 1, 7, 2, '#1E120A'); // Hair spikes

    // Face / skin
    canvas.fillRect(ox + 9, 5, 7, 4, '#FFCCA0'); // Face
    canvas.fillRect(ox + 12, 5, 2, 2, '#1A1A1A'); // Eye / visor
    canvas.fillRect(ox + 9, 8, 6, 1, '#D99570'); // Jaw shadow

    if (f === 4) {
      // --- CROUCH FRAME ---
      // Torso lowered
      canvas.fillRect(ox + 8, 10, 8, 6, '#2652B5'); // Tactical vest
      canvas.fillRect(ox + 9, 11, 6, 4, '#4477DD'); // Chest armor
      // Kneeling legs
      canvas.fillRect(ox + 6, 16, 12, 5, '#1C2840');
      canvas.fillRect(ox + 5, 19, 14, 4, '#101520'); // Boots
      // Weapon lowered forward
      canvas.fillRect(ox + 14, 12, 8, 3, '#505868'); // Barrel
      canvas.fillRect(ox + 19, 11, 2, 2, '#00E5FF'); // Cyan optic
    } else if (f === 3) {
      // --- JUMP FRAME ---
      // Torso angled
      canvas.fillRect(ox + 8, 9, 8, 7, '#2652B5');
      canvas.fillRect(ox + 9, 10, 6, 5, '#4477DD');
      // Legs tucked up
      canvas.fillRect(ox + 7, 16, 5, 5, '#1C2840');
      canvas.fillRect(ox + 13, 15, 5, 5, '#1C2840');
      canvas.fillRect(ox + 6, 18, 5, 4, '#101520');
      canvas.fillRect(ox + 13, 18, 5, 4, '#101520');
      // Weapon aimed
      canvas.fillRect(ox + 14, 10, 8, 3, '#505868');
      canvas.fillRect(ox + 19, 9, 2, 2, '#00E5FF');
    } else {
      // --- STANDING / RUNNING / SHOOTING FRAMES ---
      // Torso
      canvas.fillRect(ox + 8, 9, 8, 7, '#2652B5');
      canvas.fillRect(ox + 9, 10, 6, 5, '#4477DD');
      canvas.fillRect(ox + 8, 15, 8, 2, '#182030'); // Belt

      // Legs animation
      if (f === 1) {
        // Run 1: left forward, right back
        canvas.fillRect(ox + 6, 16, 4, 5, '#1C2840');
        canvas.fillRect(ox + 14, 16, 4, 4, '#1C2840');
        canvas.fillRect(ox + 5, 20, 5, 4, '#101520');
        canvas.fillRect(ox + 15, 19, 5, 4, '#101520');
      } else if (f === 2) {
        // Run 2: right forward, left back
        canvas.fillRect(ox + 6, 16, 4, 4, '#1C2840');
        canvas.fillRect(ox + 14, 16, 4, 5, '#1C2840');
        canvas.fillRect(ox + 5, 19, 5, 4, '#101520');
        canvas.fillRect(ox + 15, 20, 5, 4, '#101520');
      } else {
        // Idle / Shoot: solid stance
        canvas.fillRect(ox + 7, 16, 4, 5, '#1C2840');
        canvas.fillRect(ox + 13, 16, 4, 5, '#1C2840');
        canvas.fillRect(ox + 6, 20, 5, 4, '#101520');
        canvas.fillRect(ox + 13, 20, 5, 4, '#101520');
      }

      // Arms & Weapon
      canvas.fillRect(ox + 11, 11, 5, 4, '#FFCCA0'); // Muscular arm
      canvas.fillRect(ox + 14, 11, 8, 3, '#505868'); // Rifle barrel
      canvas.fillRect(ox + 19, 10, 2, 2, '#00E5FF'); // Cyan optic

      if (f === 5) {
        // Shoot frame: muzzle flash flare!
        canvas.fillRect(ox + 22, 10, 2, 5, '#FFCC00');
        canvas.fillRect(ox + 21, 11, 3, 3, '#FFFFFF');
        canvas.setPixel(ox + 23, 12, '#FF4400');
      }
    }
  }

  return canvas.toPNG();
}

/**
 * 5. public/assets/sprites/trooper.png (96x24)
 * 4 frames of 24x24:
 * 0: run1, 1: run2, 2: jump, 3: shoot
 */
function generateTrooper() {
  const canvas = new PixelCanvas(96, 24);

  for (let f = 0; f < 4; f++) {
    const ox = f * 24;

    // Crimson Alien Helmet
    canvas.fillRect(ox + 8, 2, 8, 6, '#D01818');
    canvas.fillRect(ox + 9, 3, 6, 2, '#FF4545'); // Highlight
    // Visor
    canvas.fillRect(ox + 9, 5, 6, 2, '#1A1A1A');
    canvas.fillRect(ox + 11, 5, 3, 2, '#FF9900'); // Glowing orange visor eye

    // Torso armor
    canvas.fillRect(ox + 7, 8, 9, 8, '#B81414');
    canvas.fillRect(ox + 8, 9, 7, 5, '#E02020');
    canvas.fillRect(ox + 8, 15, 8, 2, '#20222A'); // Belt

    if (f === 2) {
      // Jump
      canvas.fillRect(ox + 6, 16, 5, 4, '#20222A');
      canvas.fillRect(ox + 13, 15, 5, 4, '#20222A');
      canvas.fillRect(ox + 5, 19, 5, 4, '#121418');
      canvas.fillRect(ox + 14, 18, 5, 4, '#121418');
    } else if (f === 0) {
      // Run 1
      canvas.fillRect(ox + 6, 16, 4, 5, '#20222A');
      canvas.fillRect(ox + 13, 16, 4, 4, '#20222A');
      canvas.fillRect(ox + 5, 20, 5, 4, '#121418');
      canvas.fillRect(ox + 14, 19, 5, 4, '#121418');
    } else if (f === 1) {
      // Run 2
      canvas.fillRect(ox + 6, 16, 4, 4, '#20222A');
      canvas.fillRect(ox + 13, 16, 4, 5, '#20222A');
      canvas.fillRect(ox + 5, 19, 5, 4, '#121418');
      canvas.fillRect(ox + 14, 20, 5, 4, '#121418');
    } else {
      // Shoot stance
      canvas.fillRect(ox + 7, 16, 4, 5, '#20222A');
      canvas.fillRect(ox + 13, 16, 4, 5, '#20222A');
      canvas.fillRect(ox + 6, 20, 5, 4, '#121418');
      canvas.fillRect(ox + 13, 20, 5, 4, '#121418');
    }

    // Alien energy rifle
    canvas.fillRect(ox + 13, 10, 8, 4, '#3B4252');
    canvas.fillRect(ox + 18, 9, 2, 2, '#FF0033'); // Red laser sight

    if (f === 3) {
      // Muzzle flash
      canvas.fillRect(ox + 21, 9, 3, 5, '#FF3300');
      canvas.fillRect(ox + 20, 10, 3, 3, '#FFAA00');
      canvas.fillRect(ox + 21, 11, 2, 1, '#FFFFFF');
    }
  }

  return canvas.toPNG();
}

/**
 * 6. public/assets/sprites/turret.png (64x24)
 * 2 frames of 32x24:
 * 0: idle, 1: muzzle flash
 */
function generateTurret() {
  const canvas = new PixelCanvas(64, 24);

  for (let f = 0; f < 2; f++) {
    const ox = f * 32;

    // Mounting wall base (on left side)
    canvas.fillRect(ox + 2, 4, 6, 16, '#28303C');
    canvas.fillRect(ox + 3, 5, 4, 14, '#445062');
    canvas.fillRect(ox + 4, 7, 2, 10, '#667890');
    // Rivets on base
    canvas.setPixel(ox + 3, 5, '#A0B4C8');
    canvas.setPixel(ox + 3, 17, '#A0B4C8');

    // Turret swivel dome
    canvas.fillRect(ox + 8, 6, 12, 12, '#384454');
    canvas.fillRect(ox + 10, 8, 8, 8, '#586A82');
    // Glowing red targeting sensor / optic
    canvas.fillCircle(ox + 14, 12, 3, '#FF1830');
    canvas.fillCircle(ox + 14, 12, 1, '#FFA0A0');

    // Twin gun barrels extending right
    canvas.fillRect(ox + 18, 8, 8, 3, '#222832');
    canvas.fillRect(ox + 18, 13, 8, 3, '#222832');
    canvas.fillRect(ox + 24, 7, 3, 5, '#526074');
    canvas.fillRect(ox + 24, 12, 3, 5, '#526074');

    if (f === 1) {
      // Heavy twin muzzle flash
      canvas.fillRect(ox + 27, 7, 4, 5, '#FF9900');
      canvas.fillRect(ox + 28, 8, 3, 3, '#FFFFFF');
      canvas.fillRect(ox + 27, 12, 4, 5, '#FF9900');
      canvas.fillRect(ox + 28, 13, 3, 3, '#FFFFFF');
      canvas.setPixel(ox + 31, 9, '#FF3300');
      canvas.setPixel(ox + 31, 14, '#FF3300');
    }
  }

  return canvas.toPNG();
}

/**
 * 7. public/assets/sprites/drone.png (128x20)
 * 4 frames of 32x20:
 * Wing flap & rotor spin
 */
function generateDrone() {
  const canvas = new PixelCanvas(128, 20);

  for (let f = 0; f < 4; f++) {
    const ox = f * 32;

    // Golden-yellow aerodynamic chassis
    canvas.fillRect(ox + 10, 5, 12, 10, '#C29300');
    canvas.fillRect(ox + 11, 6, 10, 8, '#FFD700');
    canvas.fillRect(ox + 13, 7, 6, 5, '#FFF066'); // Highlight top

    // Central glowing cyan optic eye
    canvas.fillCircle(ox + 16, 10, 3, '#00FFFF');
    canvas.fillCircle(ox + 16, 10, 1, '#FFFFFF');

    // Undercarriage weapon pod / thruster
    canvas.fillRect(ox + 14, 15, 4, 2, '#333333');
    canvas.fillRect(ox + 15, 17, 2, 2, f % 2 === 0 ? '#00E5FF' : '#40FFFF'); // Jet glow

    // Twin robotic wing rotors (animated cycle)
    const wingY = f === 0 ? 6 : f === 1 ? 4 : f === 2 ? 5 : 7;
    const rotorOffset = (f * 2) % 4;

    // Left wing
    canvas.fillRect(ox + 4, wingY, 6, 3, '#4A5666');
    canvas.fillRect(ox + 2, wingY - 1, 8, 2, '#8898AA');
    canvas.setPixel(ox + 3 + rotorOffset, wingY - 2, '#00FFFF'); // Rotor tip blur

    // Right wing
    canvas.fillRect(ox + 22, wingY, 6, 3, '#4A5666');
    canvas.fillRect(ox + 22, wingY - 1, 8, 2, '#8898AA');
    canvas.setPixel(ox + 23 + (3 - rotorOffset), wingY - 2, '#00FFFF');
  }

  return canvas.toPNG();
}

/**
 * 8. public/assets/sprites/jumper.png (96x28)
 * 4 frames of 24x28:
 * 0: stance, 1: leap, 2: jet flare 1, 3: jet flare 2
 */
function generateJumper() {
  const canvas = new PixelCanvas(96, 28);

  for (let f = 0; f < 4; f++) {
    const ox = f * 24;

    // Purple cyber helmet
    canvas.fillRect(ox + 8, 3, 8, 6, '#6B1DA8');
    canvas.fillRect(ox + 9, 4, 6, 3, '#9D4EDD'); // Highlight
    // Neon emerald green visor
    canvas.fillRect(ox + 9, 6, 6, 2, '#00FF88');
    canvas.fillRect(ox + 11, 6, 3, 1, '#88FFAA');

    // Back-mounted jetpack
    canvas.fillRect(ox + 5, 8, 3, 9, '#301048');
    canvas.fillRect(ox + 6, 9, 2, 7, '#502070');

    // Cyber armor torso
    canvas.fillRect(ox + 8, 9, 8, 8, '#521482');
    canvas.fillRect(ox + 9, 10, 6, 5, '#7B2CBF');
    canvas.fillRect(ox + 8, 17, 8, 2, '#200533'); // Belt

    if (f === 0) {
      // Stance
      canvas.fillRect(ox + 7, 18, 4, 6, '#401060');
      canvas.fillRect(ox + 13, 18, 4, 6, '#401060');
      canvas.fillRect(ox + 6, 23, 5, 4, '#180424');
      canvas.fillRect(ox + 13, 23, 5, 4, '#180424');
    } else if (f === 1) {
      // Leap / launch
      canvas.fillRect(ox + 7, 18, 5, 5, '#401060');
      canvas.fillRect(ox + 12, 17, 5, 5, '#401060');
      canvas.fillRect(ox + 6, 22, 5, 4, '#180424');
      canvas.fillRect(ox + 13, 21, 5, 4, '#180424');
    } else {
      // Jet flare airborne poses (f === 2 or 3)
      canvas.fillRect(ox + 8, 17, 4, 5, '#401060');
      canvas.fillRect(ox + 12, 17, 4, 5, '#401060');
      canvas.fillRect(ox + 7, 21, 4, 4, '#180424');
      canvas.fillRect(ox + 13, 21, 4, 4, '#180424');

      // Roaring jetpack thruster fire!
      const flameLen = f === 2 ? 7 : 9;
      canvas.fillRect(ox + 5, 17, 3, flameLen, '#FF6600');
      canvas.fillRect(ox + 6, 17, 1, flameLen - 2, '#FFDD00');
      canvas.setPixel(ox + 6, 18, '#FFFFFF'); // Plasma core
    }

    // Arm holding blaster
    canvas.fillRect(ox + 13, 11, 7, 3, '#301048');
    canvas.fillRect(ox + 18, 10, 2, 2, '#00FF88'); // Green blaster optics
  }

  return canvas.toPNG();
}

/**
 * 9. public/assets/sprites/boss.png (256x64)
 * 4 frames of 64x64:
 * Tread movement, pulsing red core, twin cannons
 */
function generateBoss() {
  const canvas = new PixelCanvas(256, 64);

  for (let f = 0; f < 4; f++) {
    const ox = f * 64;

    // --- Tank Chassis Treads (y = 44 to 62) ---
    canvas.fillRect(ox + 4, 46, 56, 16, '#1E222A');
    canvas.fillRect(ox + 6, 48, 52, 12, '#2C323E');

    // Tread wheels
    for (let wx = 10; wx <= 46; wx += 9) {
      canvas.fillCircle(ox + wx, 54, 4, '#14171D');
      canvas.fillCircle(ox + wx, 54, 2, '#485264');
      canvas.setPixel(ox + wx, 54, '#A0B0C4');
    }

    // Animated caterpillar tread teeth (shift with frame f)
    for (let tx = 4; tx < 60; tx += 4) {
      const shiftedTx = ((tx + f * 2 - 4) % 56) + 4;
      canvas.fillRect(ox + shiftedTx, 45, 2, 2, '#556072');
      canvas.fillRect(ox + shiftedTx, 60, 2, 2, '#556072');
    }

    // --- Heavy Armored Main Hull (y = 16 to 46) ---
    canvas.fillRect(ox + 8, 20, 48, 26, '#384252');
    canvas.fillRect(ox + 10, 22, 44, 22, '#4D5B70');
    canvas.fillRect(ox + 12, 24, 40, 18, '#63758F');

    // Sloped armor plate highlights & seams
    canvas.strokeRect(ox + 10, 22, 44, 22, '#202630');
    canvas.drawLine(ox + 10, 32, ox + 54, 32, '#242C38');
    canvas.drawLine(ox + 10, 33, ox + 54, 33, '#7E94B4'); // Highlight line

    // Rivet rows
    for (let rx = 12; rx <= 52; rx += 8) {
      canvas.setPixel(ox + rx, 23, '#A8BCDA');
      canvas.setPixel(ox + rx, 43, '#A8BCDA');
    }

    // --- Twin Super-Heavy Cannons (Left: 2..16, Right: 48..62) ---
    // Left Cannon
    canvas.fillRect(ox + 1, 26, 12, 8, '#20242C');
    canvas.fillRect(ox + 0, 27, 4, 6, '#3D4554');
    canvas.fillRect(ox + 4, 28, 8, 4, '#5C687E');
    // Right Cannon
    canvas.fillRect(ox + 51, 26, 12, 8, '#20242C');
    canvas.fillRect(ox + 60, 27, 4, 6, '#3D4554');
    canvas.fillRect(ox + 52, 28, 8, 4, '#5C687E');

    // --- Commander Bridge / Scanner Slits (y = 8 to 18) ---
    canvas.fillRect(ox + 20, 10, 24, 10, '#2C3440');
    canvas.fillRect(ox + 22, 12, 20, 7, '#445062');
    // Amber scanner slits
    canvas.fillRect(ox + 25, 14, 14, 2, '#FFB000');
    canvas.fillRect(ox + 28, 14, 8, 2, '#FFEE66');

    // --- Central Glowing Reactor Core (Center at x=32, y=34) ---
    const coreColors = [
      ['#FF0044', '#FF3366', '#FF88AA'],
      ['#FF3300', '#FF7700', '#FFAA33'],
      ['#FF8800', '#FFCC00', '#FFFF66'],
      ['#FF0033', '#FFAA00', '#FFFFFF'],
    ][f];

    canvas.fillCircle(ox + 32, 34, 7, '#1A0408');
    canvas.fillCircle(ox + 32, 34, 6, coreColors[0]);
    canvas.fillCircle(ox + 32, 34, 4, coreColors[1]);
    canvas.fillCircle(ox + 32, 34, 2, coreColors[2]);

    // Energy discharge sparks on frame 3
    if (f === 3) {
      canvas.setPixel(ox + 0, 29, '#FFCC00');
      canvas.setPixel(ox + 0, 30, '#FFFFFF');
      canvas.setPixel(ox + 63, 29, '#FFCC00');
      canvas.setPixel(ox + 63, 30, '#FFFFFF');
    }
  }

  return canvas.toPNG();
}

/**
 * 10. public/assets/vfx/projectiles.png (80x16)
 * Five 16x16 slots:
 * 0: Pea Bullet (yellow energy sphere)
 * 1: Spread Bullet (cyan diamond bolt)
 * 2: Laser Beam (blue/white plasma rod)
 * 3: Flame Shot (fireball)
 * 4: Enemy Bullet (crimson orb)
 */
function generateProjectiles() {
  const canvas = new PixelCanvas(80, 16);

  // 0: Pea Bullet (0..15)
  canvas.fillCircle(8, 8, 4, '#FF8800');
  canvas.fillCircle(8, 8, 3, '#FFCC00');
  canvas.fillCircle(8, 8, 1, '#FFFFFF');

  // 1: Spread Bullet (16..31)
  const sX = 24;
  canvas.fillRect(sX - 3, 8 - 3, 7, 7, '#0088CC');
  canvas.fillRect(sX - 2, 8 - 2, 5, 5, '#00E5FF');
  canvas.fillRect(sX - 1, 8 - 1, 3, 3, '#FFFFFF');
  // Cyan sparkles
  canvas.setPixel(sX - 4, 8, '#00FFFF');
  canvas.setPixel(sX + 4, 8, '#00FFFF');
  canvas.setPixel(sX, 8 - 4, '#00FFFF');
  canvas.setPixel(sX, 8 + 4, '#00FFFF');

  // 2: Laser Beam (32..47)
  const lX = 40;
  canvas.fillRect(lX - 7, 6, 15, 5, '#1A55CC');
  canvas.fillRect(lX - 6, 7, 13, 3, '#33A2FF');
  canvas.fillRect(lX - 5, 8, 11, 1, '#FFFFFF');

  // 3: Flame Shot (48..63)
  const fX = 56;
  canvas.fillCircle(fX, 8, 5, '#AA1100');
  canvas.fillCircle(fX, 8, 4, '#FF4400');
  canvas.fillCircle(fX, 8, 2, '#FFAA00');
  canvas.fillCircle(fX, 8, 1, '#FFFFFF');
  // Trailing embers
  canvas.setPixel(fX - 6, 6, '#FF3300');
  canvas.setPixel(fX - 5, 10, '#FFAA00');

  // 4: Enemy Bullet (64..79)
  const eX = 72;
  canvas.fillCircle(eX, 8, 4, '#660011');
  canvas.fillCircle(eX, 8, 3, '#FF0033');
  canvas.fillCircle(eX, 8, 1, '#FFAAAA');

  return canvas.toPNG();
}

/**
 * 11. public/assets/vfx/pickups.png (96x16)
 * Six 16x16 frames:
 * 0: Capsule 1, 1: Capsule 2, 2: Badge 'S', 3: Badge 'L', 4: Badge 'F', 5: Badge 'M'
 */
function generatePickups() {
  const canvas = new PixelCanvas(96, 16);

  // --- Capsule Frames (0 & 1) ---
  for (let f = 0; f < 2; f++) {
    const ox = f * 16;
    // Chrome pod body
    canvas.fillRect(ox + 2, 4, 12, 8, '#8898AA');
    canvas.fillRect(ox + 3, 5, 10, 6, '#D0D8E4');
    canvas.fillRect(ox + 4, 6, 8, 4, '#FFFFFF');
    // Pulsing red sensor strip in center
    const stripColor = f === 0 ? '#FF1830' : '#FF6688';
    canvas.fillRect(ox + 7, 4, 2, 8, stripColor);
    // Outer caps
    canvas.fillRect(ox + 1, 6, 1, 4, '#586474');
    canvas.fillRect(ox + 14, 6, 1, 4, '#586474');
  }

  // --- Badges: S, L, F, M ---
  const badges = [
    { key: 'S', color: '#00FFFF', bg: '#003A4D' },
    { key: 'L', color: '#3388FF', bg: '#0D2452' },
    { key: 'F', color: '#FF5500', bg: '#541700' },
    { key: 'M', color: '#FFD700', bg: '#524000' },
  ];

  badges.forEach((b, idx) => {
    const ox = (idx + 2) * 16;
    // Outer metal border
    canvas.fillRect(ox + 1, 1, 14, 14, '#1C2430');
    canvas.strokeRect(ox + 2, 2, 12, 12, b.color);
    canvas.fillRect(ox + 3, 3, 10, 10, b.bg);

    // Letter
    canvas.drawText5x7(ox + 5, 4, b.key, b.color, 1, '#000000');
    // Top highlight bevel
    canvas.fillRect(ox + 2, 2, 12, 1, '#FFFFFF');
  });

  return canvas.toPNG();
}

/**
 * 12. Crosshair: public/assets/vfx/crosshair.png (16x16)
 */
function generateCrosshair() {
  const canvas = new PixelCanvas(16, 16);
  const cx = 8;
  const cy = 8;

  // Dark shadow outline
  canvas.fillRect(cx - 1, cy - 6, 3, 13, '#001A24');
  canvas.fillRect(cx - 6, cy - 1, 13, 3, '#001A24');

  // Glowing neon cyan reticle ticks
  canvas.drawLine(cx, cy - 5, cx, cy - 2, '#00FFFF');
  canvas.drawLine(cx, cy + 2, cx, cy + 5, '#00FFFF');
  canvas.drawLine(cx - 5, cy, cx - 2, cy, '#00FFFF');
  canvas.drawLine(cx + 2, cy, cx + 5, cy, '#00FFFF');

  // Center targeting dot
  canvas.setPixel(cx, cy, '#FFFFFF');

  return canvas.toPNG();
}

// ============================================================================
// MAIN GENERATOR PIPELINE
// ============================================================================

const ASSET_REGISTRY = [
  { path: 'public/assets/ui/logo.png', build: generateLogo },
  { path: 'public/assets/bg/cyber_hangar_bg.png', build: generateCyberHangarBg },
  { path: 'public/assets/tiles/tileset.png', build: generateTileset },
  { path: 'public/assets/sprites/player.png', build: generatePlayer },
  { path: 'public/assets/sprites/trooper.png', build: generateTrooper },
  { path: 'public/assets/sprites/turret.png', build: generateTurret },
  { path: 'public/assets/sprites/drone.png', build: generateDrone },
  { path: 'public/assets/sprites/jumper.png', build: generateJumper },
  { path: 'public/assets/sprites/boss.png', build: generateBoss },
  { path: 'public/assets/vfx/projectiles.png', build: generateProjectiles },
  { path: 'public/assets/vfx/pickups.png', build: generatePickups },
  { path: 'public/assets/vfx/crosshair.png', build: generateCrosshair },
];

function main() {
  console.log('Generating 16-bit arcade pixel-art PNG assets...');
  let count = 0;

  for (const asset of ASSET_REGISTRY) {
    const fullPath = path.resolve(process.cwd(), asset.path);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const pngBuffer = asset.build();
    fs.writeFileSync(fullPath, pngBuffer);
    console.log(`[OK] Generated: ${asset.path} (${pngBuffer.length} bytes)`);
    count++;
  }

  console.log(`Successfully generated ${count} pixel-art assets!`);
}

main();
