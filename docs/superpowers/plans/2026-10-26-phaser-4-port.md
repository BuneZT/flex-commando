# Phaser 4.2.1 Migration & Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `flex-commando` from Phaser `^3.90.0` to Phaser `^4.2.1` on the `phaser-4` branch, fixing all Phaser 4 breaking API changes (`TintModes.FILL`, `TextureSource.updateSize` + `Frame.updateUVs`) and adding zero-GC Phaser 4 `Filters.Glow` support on focal game objects without regressions.

**Architecture:** Upgrade the `phaser` package to `^4.2.1`, adapt `CombatFX.applyHitFlash` to Phaser 4's `setTint(0xffffff)` + `setTintMode(Phaser.TintModes.FILL)` (with backwards-compatible fallback for minimal test mocks), update `installPixelTextRenderer` in `TextStyle.ts` to synchronize `frame.source.updateSize` and `frame.updateUVs`, and introduce a zero-allocation `CombatFX.attachGlowFilter` helper used by `GameScene` (laser lockdown barriers and exit portal) and `Boss` (telegraph/overheat states).

**Tech Stack:** TypeScript (`noEmit: true`), Vite, Phaser 4.2.1 (Arcade Physics, WebGL Filters & TintModes), Vitest (`happy-dom`).

## Global Constraints

- Work strictly on branch `phaser-4`; never commit or push to `master`.
- Zero runtime Garbage Collector (GC) allocations during gameplay (`AGENTS.md` Rule 4): never allocate or destroy textures or filter controllers per-frame.
- Preserve all 25 existing Vitest test suites and add targeted unit tests for every Phaser 4 behavior change.

---

### Task 1: Upgrade Phaser Dependency & Verify Headless Test / Build Setup

**Files:**
- Modify: `package.json`
- Modify: `tests/config.test.ts`

**Interfaces:**
- Consumes: `Phaser.VERSION`, `GameConfig`
- Produces: Installed `phaser@^4.2.1` package verified in Vitest (`happy-dom`) and TypeScript (`tsc --noEmit`)

- [ ] **Step 1: Write failing test asserting Phaser 4 version in `tests/config.test.ts`**

Add to `describe('GameConfig', ...)` in `tests/config.test.ts`:
```ts
  it('should run on Phaser 4.x runtime', () => {
    expect(Phaser.VERSION.startsWith('4.')).toBe(true);
    expect(Phaser.TintModes).toBeDefined();
    expect(Phaser.TintModes.FILL).toBe(1);
  });
```

- [ ] **Step 2: Run test to verify it fails on Phaser 3.90.0**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL (`expected '3.90.0' to start with '4.'`)

- [ ] **Step 3: Upgrade `phaser` in `package.json` to `^4.2.1` and install**

Update `package.json`:
```json
  "dependencies": {
    "phaser": "^4.2.1"
  },
```
Run `npm install`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/config.test.ts
git commit -m "build(deps): upgrade phaser to ^4.2.1"
```

---

### Task 2: Migrate `CombatFX.applyHitFlash` to Phaser 4 `TintModes.FILL` & Add `CombatFX.attachGlowFilter`

**Files:**
- Modify: `src/core/CombatFX.ts`
- Modify: `tests/combat-fx.test.ts`

**Interfaces:**
- Consumes: `Phaser.TintModes.FILL`, `Phaser.TintModes.MULTIPLY`, `target.enableFilters()`, `target.filters.internal.addGlow(...)`
- Produces:
  - `CombatFX.applyHitFlash(target: any, durationMs?: number): void`
  - `CombatFX.attachGlowFilter(target: any, color?: number, outerStrength?: number, quality?: number, distance?: number): any | null`

- [ ] **Step 1: Write failing tests in `tests/combat-fx.test.ts`**

Add tests to `tests/combat-fx.test.ts`:
```ts
  it('uses Phaser 4 setTint + setTintMode(Phaser.TintModes.FILL) without calling deprecated setTintFill when setTintMode is present', () => {
    let timerCallback: (() => void) | null = null;
    const setTintFillSpy = vi.fn();
    const spriteMock: any = {
      active: true,
      setTint: vi.fn().mockReturnThis(),
      setTintMode: vi.fn().mockReturnThis(),
      setTintFill: setTintFillSpy,
      clearTint: vi.fn().mockReturnThis(),
      scene: {
        time: {
          delayedCall: vi.fn((_ms: number, cb: () => void) => {
            timerCallback = cb;
          }),
        },
      },
    };

    CombatFX.applyHitFlash(spriteMock, 100);

    expect(spriteMock.setTint).toHaveBeenCalledWith(0xffffff);
    expect(spriteMock.setTintMode).toHaveBeenCalledWith(1); // Phaser.TintModes.FILL
    expect(setTintFillSpy).not.toHaveBeenCalled();

    if (timerCallback) {
      (timerCallback as Function)();
    }
    expect(spriteMock.clearTint).toHaveBeenCalled();
  });

  it('attaches a Phaser 4 internal Glow filter safely via attachGlowFilter and returns null on headless mocks', () => {
    const mockGlow = { color: 0x00ffff, outerStrength: 2, active: true };
    const addGlowSpy = vi.fn().mockReturnValue(mockGlow);
    const enableFiltersSpy = vi.fn();
    const webglSprite: any = {
      enableFilters: enableFiltersSpy,
      filters: {
        internal: {
          addGlow: addGlowSpy,
        },
      },
    };

    const glow = CombatFX.attachGlowFilter(webglSprite, 0x00ffff, 2, 6, 4);
    expect(enableFiltersSpy).toHaveBeenCalled();
    expect(addGlowSpy).toHaveBeenCalledWith(0x00ffff, 2, 0, 1, false, 6, 4);
    expect(glow).toBe(mockGlow);

    // Headless sprite without enableFilters or throwing inside enableFilters must return null safely
    expect(CombatFX.attachGlowFilter({} as any, 0xff0000)).toBeNull();
    expect(
      CombatFX.attachGlowFilter({
        enableFilters: () => {
          throw new Error('No WebGL context');
        },
      } as any)
    ).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/combat-fx.test.ts`
Expected: FAIL (`CombatFX.attachGlowFilter is not a function` / `setTint` not called)

- [ ] **Step 3: Implement Phaser 4 `applyHitFlash` and `attachGlowFilter` in `src/core/CombatFX.ts`**

Update `src/core/CombatFX.ts`:
```ts
  public static applyHitFlash(
    target: Phaser.GameObjects.Sprite | Phaser.Physics.Arcade.Sprite | any,
    durationMs: number = 90
  ): void {
    if (!target) return;

    const fillMode = (Phaser as any).TintModes?.FILL ?? 1;
    const multiplyMode = (Phaser as any).TintModes?.MULTIPLY ?? 0;

    if (typeof target.setTintMode === 'function' && typeof target.setTint === 'function') {
      target.setTint(0xffffff);
      target.setTintMode(fillMode);
    } else if (typeof target.setTintFill === 'function') {
      target.setTintFill(0xffffff);
    }

    const scene = target.scene;
    if (scene?.time && typeof scene.time.delayedCall === 'function') {
      scene.time.delayedCall(durationMs, () => {
        if (target && target.active) {
          if (typeof target.clearTint === 'function') {
            target.clearTint();
          }
          if (typeof target.setTintMode === 'function') {
            target.setTintMode(multiplyMode);
          }
        }
      });
    }
  }

  /**
   * Pre-allocates a Phaser 4 internal Glow filter on a sprite if WebGL filters are supported.
   * Returns null in headless / mocked test environments with zero runtime throw risk.
   */
  public static attachGlowFilter(
    target: Phaser.GameObjects.Sprite | any,
    color: number = 0xffffff,
    outerStrength: number = 2,
    quality: number = 6,
    distance: number = 4
  ): any | null {
    if (!target || typeof target.enableFilters !== 'function') {
      return null;
    }
    try {
      target.enableFilters();
      const internal = target.filters?.internal;
      if (internal && typeof internal.addGlow === 'function') {
        return internal.addGlow(color, outerStrength, 0, 1, false, quality, distance);
      }
    } catch {
      // Ignore in headless unit tests where Scene Camera / WebGL framebuffer is not initialized
    }
    return null;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/combat-fx.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/CombatFX.ts tests/combat-fx.test.ts
git commit -m "feat(vfx): migrate applyHitFlash to Phaser 4 TintModes.FILL and add attachGlowFilter"
```

---

### Task 3: Update Custom Pixel Text Renderer for Phaser 4 `TextureSource` & UVs

**Files:**
- Modify: `src/ui/TextStyle.ts`
- Modify: `tests/text-style.test.ts`

**Interfaces:**
- Consumes: `frame.setSize`, `frame.source.updateSize`, `frame.source.resolution`, `frame.updateUVs`, `renderer.canvasToTexture`
- Produces: `installPixelTextRenderer` compatible with Phaser 4's `Text` WebGL rendering pipeline

- [ ] **Step 1: Write failing test in `tests/text-style.test.ts`**

Update the `MockText` test in `tests/text-style.test.ts` to spy on `frame.source.updateSize` and `frame.updateUVs` and assert they are called with `(textInstance.width, textInstance.height)`:
```ts
      public frame = {
        setSize: vi.fn(),
        updateUVs: vi.fn(),
        source: { glTexture: {}, updateSize: vi.fn(), resolution: 1 },
      };
```
And assert:
```ts
    expect(textInstance.frame.setSize).toHaveBeenCalledWith(textInstance.width, textInstance.height);
    expect(textInstance.frame.source.updateSize).toHaveBeenCalledWith(textInstance.width, textInstance.height);
    expect(textInstance.frame.updateUVs).toHaveBeenCalled();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/text-style.test.ts`
Expected: FAIL (`expected "spy" to be called with arguments [ 74, 10 ]`)

- [ ] **Step 3: Update `installPixelTextRenderer` in `src/ui/TextStyle.ts`**

In `src/ui/TextStyle.ts`:
```ts
        if (this.frame) {
          if (typeof this.frame.setSize === 'function') {
            this.frame.setSize(this.width, this.height);
          }
          if (this.frame.source) {
            if (typeof this.frame.source.updateSize === 'function') {
              this.frame.source.updateSize(this.width, this.height);
            }
            this.frame.source.resolution = 1;
          }
          if (typeof this.frame.updateUVs === 'function') {
            this.frame.updateUVs();
          }
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/text-style.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/TextStyle.ts tests/text-style.test.ts
git commit -m "fix(ui): sync TextureSource size and frame UVs in Phaser 4 pixel text renderer"
```

---

### Task 4: Add Phaser 4 Glow Filters to Room Lockdown Barriers, Exit Portal, and Boss States

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `src/entities/enemies/Boss.ts`
- Modify: `tests/game-scene-lockdown.test.ts`
- Modify: `tests/enemy.test.ts`

**Interfaces:**
- Consumes: `CombatFX.attachGlowFilter`
- Produces:
  - Pre-allocated `glowFilter` on `GameScene` laser barriers and exit portal
  - Pre-allocated `glowFilter` on `Boss` toggled and tinted across `SWEEP_TELEGRAPH`, `LEAP_TELEGRAPH`, `CHARGE_TELEGRAPH`, and `OVERHEAT`

- [ ] **Step 1: Write failing tests in `tests/enemy.test.ts` and `tests/game-scene-lockdown.test.ts`**

1. In `tests/enemy.test.ts`, add a test verifying `Boss` updates its Phaser 4 glow filter state and color across telegraph, overheat, and patrol states:
```ts
  it('Boss should toggle pre-allocated Phaser 4 glow filter color and active state across telegraph and overheat states', () => {
    const scene = createMockScene();
    const boss = new Boss(scene, 200, 200);
    const mockGlow = { color: 0xffffff, outerStrength: 2, active: false };
    boss.glowFilter = mockGlow;

    boss.enterState('SWEEP_TELEGRAPH', { x: 300, y: 200 });
    expect(boss.glowFilter.active).toBe(true);
    expect(boss.glowFilter.color).toBe(0xff3333);

    boss.enterState('LEAP_TELEGRAPH', { x: 300, y: 200 });
    expect(boss.glowFilter.active).toBe(true);
    expect(boss.glowFilter.color).toBe(0xffaa00);

    boss.enterState('CHARGE_TELEGRAPH', { x: 300, y: 200 });
    expect(boss.glowFilter.active).toBe(true);
    expect(boss.glowFilter.color).toBe(0xff6600);

    boss.enterState('OVERHEAT', { x: 300, y: 200 });
    expect(boss.glowFilter.active).toBe(true);
    expect(boss.glowFilter.color).toBe(0x44ddff);

    boss.enterState('PATROL', { x: 300, y: 200 });
    expect(boss.glowFilter.active).toBe(false);
  });
```
2. In `tests/game-scene-lockdown.test.ts`, add a test verifying `unlockExitPortal` updates the exit door's glow filter from locked red (`0xff4444`) to unlocked green (`0x00ff88`):
```ts
  it('updates exit portal Phaser 4 glow filter color and strength when unlocked', () => {
    scene.create();
    const mockPortalGlow = { color: 0xff4444, outerStrength: 2, active: true };
    (scene as any).exitPortalGlow = mockPortalGlow;

    scene.unlockExitPortal();

    expect(mockPortalGlow.color).toBe(0x00ff88);
    expect(mockPortalGlow.outerStrength).toBe(3);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/enemy.test.ts tests/game-scene-lockdown.test.ts`
Expected: FAIL (`expected false to be true` for `boss.glowFilter.active` and `expected 16729156 to be 65416` for `mockPortalGlow.color`)

- [ ] **Step 3: Implement pre-allocated Phaser 4 glow filter integration in `Boss.ts` and `GameScene.ts`**

1. In `src/entities/enemies/Boss.ts`:
   - Add `public glowFilter: any | null = null;`
   - In `constructor`: initialize `this.glowFilter = CombatFX.attachGlowFilter(this, 0xff3333, 2, 6, 4); if (this.glowFilter) { this.glowFilter.active = false; }`
   - In `enterState(newState, player)`: update `this.glowFilter` active state and color:
     - `'SWEEP_TELEGRAPH'`: `active = true`, `color = 0xff3333`
     - `'LEAP_TELEGRAPH'`: `active = true`, `color = 0xffaa00`
     - `'CHARGE_TELEGRAPH'`: `active = true`, `color = 0xff6600`
     - `'OVERHEAT'`: `active = true`, `color = 0x44ddff`
     - Otherwise: `active = false`
2. In `src/scenes/GameScene.ts`:
   - Add `public exitPortalGlow: any | null = null;`
   - Attach glow filter to each room barrier on creation (`const glow = CombatFX.attachGlowFilter(barrier, 0x00ffff, 2, 6, 4); if (glow) { glow.active = false; (barrier as any).__glowFilter = glow; }`) and toggle `(barrier as any).__glowFilter.active` when barriers activate/deactivate.
   - Attach glow filter to `exitDoor` on creation (`this.exitPortalGlow = CombatFX.attachGlowFilter(portal, 0xff4444, 2, 6, 4);`) and update `this.exitPortalGlow.color = 0x00ff88; this.exitPortalGlow.outerStrength = 3;` in `unlockExitPortal()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/enemy.test.ts tests/game-scene-lockdown.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/entities/enemies/Boss.ts src/scenes/GameScene.ts tests/enemy.test.ts tests/game-scene-lockdown.test.ts
git commit -m "feat(vfx): add zero-GC Phaser 4 Glow filters to barriers, exit portal, and Boss states"
```

---

### Task 5: Update Documentation (`AGENTS.md`, `docs/GAME_MANUAL.md`) & Full Verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/GAME_MANUAL.md`

**Interfaces:**
- Consumes: Updated Phaser 4.2+ architecture
- Produces: Up-to-date project documentation and verified test/typecheck/build output

- [ ] **Step 1: Update Phaser version references in `AGENTS.md` and `docs/GAME_MANUAL.md`**

Update `Phaser 3.80+` / `Phaser 3` references in `AGENTS.md` and `docs/GAME_MANUAL.md` to `Phaser 4.2+`.

- [ ] **Step 2: Run full test suite, typecheck, and production build**

Run:
- `npm test`
- `npx tsc --noEmit`
- `npm run build`
Expected: All 25 test suites pass, `tsc --noEmit` exits 0, `vite build` succeeds with exit 0.

- [ ] **Step 3: Clean up scratch files and commit documentation**

```bash
git add AGENTS.md docs/GAME_MANUAL.md docs/superpowers/plans/2026-10-26-phaser-4-port.md
git commit -m "docs: update architecture docs and implementation plan for Phaser 4.2+"
```
