# Cosmic Background Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the high-contrast cyber hangar background with a seamless 512x288 cosmic nebula backdrop to eliminate visual confusion between platforms and background elements.

**Architecture:** A deterministic 512x288 pixel-art backdrop with toroidal distance wrapping for seamless parallax scrolling is synthesized via `scripts/generate-pixel-assets.mjs` to `public/assets/bg/cyber_hangar_bg.png`. A matching procedural fallback is updated in `TextureFactory.ts`, while `GameScene.ts` applies gentle `0.15x / 0.10y` parallax scrolling to provide infinite depth behind foreground platform tiles.

**Tech Stack:** TypeScript, Phaser 3.80+, Node.js PNG encoder script, Vitest (`happy-dom`).

## Global Constraints

* View resolution: 512x288 pixels (16:9 ratio, `GAME_CONSTANTS.VIEW_WIDTH_PX` x `GAME_CONSTANTS.VIEW_HEIGHT_PX`).
* Texture key must remain `'cyber_hangar_bg'` for backward compatibility across scenes, loaders, and test suites.
* Value budget: background nebula dust and dark void must remain below 25% brightness to keep foreground platform tiles (Tile 1: `#2E354F`, Tile 2: `#00FFFF`, Tile 3: `#3A2E48`) and projectiles clearly distinguishable.
* All 20 Vitest test suites must pass (`npm test`) with zero TypeScript diagnostics (`npx tsc --noEmit`).

---

### Task 1: Update Asset Integrity Test for 512x288 Background Dimensions

**Files:**
- Modify: `tests/assets-integrity.test.ts:6-10`

**Interfaces:**
- Consumes: `assetSpecs` table in `tests/assets-integrity.test.ts`
- Produces: Failing test assertion expecting `public/assets/bg/cyber_hangar_bg.png` width=512, height=288

- [ ] **Step 1: Write the failing test expectation**

Update line 8 of `tests/assets-integrity.test.ts` from 320x240 to 512x288:
```typescript
    { path: 'public/assets/bg/cyber_hangar_bg.png', width: 512, height: 288 },
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/assets-integrity.test.ts`  
Expected output: FAIL with `expected 320 to be 512` (or height `expected 240 to be 288`).

- [ ] **Step 3: Commit the failing test specification**

```powershell
git add tests/assets-integrity.test.ts
git commit -m "test: update asset integrity test for 512x288 background dimensions"
```

---

### Task 2: Implement Cosmic Nebula Generator & Regenerate Asset

**Files:**
- Modify: `scripts/generate-pixel-assets.mjs:324-406` and `scripts/generate-pixel-assets.mjs:1072-1076`
- Output: `public/assets/bg/cyber_hangar_bg.png`
- Test: `tests/assets-integrity.test.ts`

**Interfaces:**
- Consumes: `PixelCanvas` class in `scripts/generate-pixel-assets.mjs`
- Produces: `public/assets/bg/cyber_hangar_bg.png` (512x288 PNG)

- [ ] **Step 1: Replace `generateCyberHangarBg` with cosmic nebula generator**

In `scripts/generate-pixel-assets.mjs`, update `generateCyberHangarBg` and the asset specification list:
```javascript
/**
 * 2. public/assets/bg/cyber_hangar_bg.png (512x288)
 * Cosmic deep space nebula backdrop with toroidal wrapping and 3-tier starfield
 */
function generateCyberHangarBg() {
  const width = 512;
  const height = 288;
  const canvas = new PixelCanvas(width, height);

  // Simple deterministic Mulberry32 PRNG
  let seed = 42891;
  function rnd() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // 1. Base void gradient (deep indigo to dark violet void)
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const r = Math.round(6 + t * 4);
    const g = Math.round(8 + t * 5);
    const b = Math.round(18 + t * 10);
    canvas.fillRect(0, y, width, 1, [r, g, b, 255]);
  }

  // 2. Toroidal distance helper for seamless wrapping
  function torusDistSq(x1, y1, x2, y2) {
    let dx = Math.abs(x1 - x2);
    if (dx > width / 2) dx = width - dx;
    let dy = Math.abs(y1 - y2);
    if (dy > height / 2) dy = height - dy;
    return dx * dx + dy * dy;
  }

  // 3. Cosmic nebula dust clouds (subtle, soft-edge clusters)
  const nebulaClusters = [
    // Deep violet / purple core
    { cx: 120, cy: 90, r: 85, color: [38, 20, 56], maxAlpha: 130 },
    { cx: 380, cy: 190, r: 100, color: [43, 24, 66], maxAlpha: 140 },
    { cx: 260, cy: 60, r: 70, color: [30, 18, 48], maxAlpha: 110 },
    // Muted indigo shadow dust
    { cx: 40, cy: 220, r: 75, color: [20, 24, 50], maxAlpha: 120 },
    { cx: 480, cy: 80, r: 90, color: [22, 28, 55], maxAlpha: 130 },
    // Soft ethereal teal wisp (very dark, non-clashing with platform cyan)
    { cx: 220, cy: 180, r: 65, color: [12, 38, 45], maxAlpha: 100 },
    { cx: 340, cy: 100, r: 55, color: [10, 32, 40], maxAlpha: 90 },
  ];

  for (const cluster of nebulaClusters) {
    const radiusSq = cluster.r * cluster.r;
    const minX = Math.floor(cluster.cx - cluster.r);
    const maxX = Math.ceil(cluster.cx + cluster.r);
    const minY = Math.floor(cluster.cy - cluster.r);
    const maxY = Math.ceil(cluster.cy + cluster.r);

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dSq = torusDistSq(px, py, cluster.cx, cluster.cy);
        if (dSq < radiusSq) {
          const falloff = 1 - Math.sqrt(dSq) / cluster.r;
          const alpha = Math.round(falloff * falloff * cluster.maxAlpha);
          const wrapX = ((px % width) + width) % width;
          const wrapY = ((py % height) + height) % height;
          canvas.setPixel(wrapX, wrapY, cluster.color, alpha);
        }
      }
    }
  }

  // 4. Three-Tier Starfield
  // Tier 1: Faint distant stars (~130 stars, 1x1, dim cool grey/blue)
  for (let i = 0; i < 130; i++) {
    const sx = Math.floor(rnd() * width);
    const sy = Math.floor(rnd() * height);
    const bright = 60 + Math.floor(rnd() * 60);
    canvas.setPixel(sx, sy, [bright, bright + 10, bright + 30, 255]);
  }

  // Tier 2: Mid-field stars (~50 stars, 1x1, crisp soft white / pastel violet)
  for (let i = 0; i < 50; i++) {
    const sx = Math.floor(rnd() * width);
    const sy = Math.floor(rnd() * height);
    const isViolet = rnd() > 0.6;
    const color = isViolet ? [215, 195, 255, 255] : [195, 215, 245, 255];
    canvas.setPixel(sx, sy, color);
  }

  // Tier 3: Focal sparkling stars (12 stars, 3x3 micro cross)
  for (let i = 0; i < 12; i++) {
    const sx = Math.floor(rnd() * width);
    const sy = Math.floor(rnd() * height);
    const glow = rnd() > 0.5 ? [140, 220, 255, 200] : [240, 170, 255, 200];
    // Center bright core
    canvas.setPixel(sx, sy, [255, 255, 255, 255]);
    // 1px cross points with toroidal wrap
    canvas.setPixel((sx + 1) % width, sy, glow);
    canvas.setPixel((sx - 1 + width) % width, sy, glow);
    canvas.setPixel(sx, (sy + 1) % height, glow);
    canvas.setPixel(sx, (sy - 1 + height) % height, glow);
  }

  return canvas.toPNG();
}
```

And in `scripts/generate-pixel-assets.mjs` asset list, update width and height:
```javascript
  { path: 'public/assets/bg/cyber_hangar_bg.png', build: generateCyberHangarBg, width: 512, height: 288 },
```

- [ ] **Step 2: Generate pixel asset**

Run: `node scripts/generate-pixel-assets.mjs`  
Expected output: Generated `public/assets/bg/cyber_hangar_bg.png` (512x288).

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run tests/assets-integrity.test.ts`  
Expected output: PASS (2 tests passed).

- [ ] **Step 4: Commit generated asset and generator script**

```powershell
git add scripts/generate-pixel-assets.mjs public/assets/bg/cyber_hangar_bg.png
git commit -m "feat: synthesize 512x288 seamless cosmic nebula background asset"
```

---

### Task 3: Update Procedural Fallback in TextureFactory

**Files:**
- Modify: `src/core/TextureFactory.ts:511-519`
- Test: `tests/texture-factory.test.ts`

**Interfaces:**
- Consumes: `GAME_CONSTANTS.VIEW_WIDTH_PX`, `GAME_CONSTANTS.VIEW_HEIGHT_PX`
- Produces: Phaser Texture `'cyber_hangar_bg'` (512x288 Graphics texture)

- [ ] **Step 1: Update `createCyberHangarBgTexture` in `TextureFactory.ts`**

Update `createCyberHangarBgTexture` in `src/core/TextureFactory.ts`:
```typescript
  private static createCyberHangarBgTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists('cyber_hangar_bg')) return;
    const g = scene.add.graphics();
    const w = GAME_CONSTANTS.VIEW_WIDTH_PX;
    const h = GAME_CONSTANTS.VIEW_HEIGHT_PX;

    // Dark cosmic base void
    g.fillStyle(0x070914, 1);
    g.fillRect(0, 0, w, h);

    // Subtle cosmic nebula clouds (deep violet and muted teal)
    g.fillStyle(0x231436, 0.5);
    g.fillCircle(120, 90, 80);
    g.fillCircle(380, 190, 90);
    g.fillStyle(0x0e242c, 0.4);
    g.fillCircle(240, 150, 65);

    // Subtle star clusters
    g.fillStyle(0x7788aa, 0.8);
    for (let i = 0; i < 40; i++) {
      const x = (i * 73 + 17) % w;
      const y = (i * 47 + 23) % h;
      g.fillRect(x, y, 1, 1);
    }
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 15; i++) {
      const x = (i * 137 + 41) % w;
      const y = (i * 89 + 11) % h;
      g.fillRect(x, y, 1, 1);
    }

    g.generateTexture('cyber_hangar_bg', w, h);
    g.destroy();
  }
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/texture-factory.test.ts`  
Expected output: PASS (3 tests passed).

- [ ] **Step 3: Commit TextureFactory update**

```powershell
git add src/core/TextureFactory.ts
git commit -m "feat: update procedural fallback texture for cosmic background in TextureFactory"
```

---

### Task 4: Tune Parallax Scroll in GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts:369-373`
- Test: `tests/game-loop.test.ts`

**Interfaces:**
- Consumes: `this.parallaxBg`, `this.cameras.main.scrollX`, `this.cameras.main.scrollY`
- Produces: Smooth parallax offset `tilePositionX` / `tilePositionY`

- [ ] **Step 1: Update scroll factor multipliers in `GameScene.ts`**

In `src/scenes/GameScene.ts` around line 370:
```typescript
    // 3.5. Update parallax background scroll position
    if (this.parallaxBg && this.cameras?.main) {
      this.parallaxBg.tilePositionX = (this.cameras.main.scrollX || 0) * 0.15;
      this.parallaxBg.tilePositionY = (this.cameras.main.scrollY || 0) * 0.10;
    }
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/game-loop.test.ts`  
Expected output: PASS (25 tests passed).

- [ ] **Step 3: Commit GameScene parallax tuning**

```powershell
git add src/scenes/GameScene.ts
git commit -m "feat: tune parallax scroll factor for deep cosmic space backdrop"
```

---

### Task 5: End-to-End Verification & Build

**Files:**
- Test all test suites and production build

- [ ] **Step 1: Run complete test suite**

Run: `npm test`  
Expected output: 20 passed (175 tests passed).

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npx tsc --noEmit`  
Expected output: Exits with code 0 (no type errors).

- [ ] **Step 3: Run production build**

Run: `npm run build`  
Expected output: Build completed successfully in `dist/`.
