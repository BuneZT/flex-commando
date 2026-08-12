# Deep Engine Performance & HUD Memoization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate remaining micro-stutters by adding HUD string memoization, native FalconDrone physics velocity calculation, active pickup capsule filtering, and bulk tilemap collision indexing.

**Architecture:** Add dirty-state caching to `HUD.ts`; update `FalconDrone.ts` to use `body.setVelocityY()`; filter inactive pickup items early in `GameScene.ts`; use `map.setCollision()` bulk methods in `TilemapRenderer.ts`.

**Tech Stack:** TypeScript, Phaser 3 Arcade Physics, Vitest.

## Global Constraints

- **Rendering Budget**: 0 text canvas texture redraws when HUD state is unchanged.
- **Headless Compatibility**: Retain optional chaining on scene graphics and text methods.
- **Testing**: All 16 existing Vitest test suites must pass (`npm test`).

---

### Task 1: HUD Memoization & Dirty-State Guarding

**Files:**
- Modify: `src/ui/HUD.ts`
- Modify: `tests/hud.test.ts`

**Interfaces:**
- Consumes: `HUD.update(...)`
- Produces: Memoized text updates and minimap rendering

- [ ] **Step 1: Write test for memoized HUD updates**

Update `tests/hud.test.ts`:
```typescript
  it('should format HUD lives correctly and update text without throwing', () => {
    const sceneMock: any = {
      add: {
        text: () => ({ setScrollFactor: () => ({ setDepth: () => ({ setText: () => {}, setVisible: () => {} }) }), setOrigin: () => ({ setScrollFactor: () => ({ setDepth: () => ({ setText: () => {}, setVisible: () => {} }) }) }) }),
        graphics: () => ({ setScrollFactor: () => ({ setDepth: () => ({ clear: () => {}, fillStyle: () => {}, fillRect: () => {}, lineStyle: () => {}, strokeRect: () => {} }) }) }),
      },
    };
    const hud = new HUD(sceneMock);
    const playerMock: any = { lives: 3, currentWeapon: 'PEA_SHOOTER', isBarrierActive: false, barrierHits: 0 };
    const gridMock: any = [[{ type: 'START' }]];
    expect(() => hud.update(playerMock, gridMock, 0, 0)).not.toThrow();
  });
```

- [ ] **Step 2: Run test to verify existing HUD test passes**

Run: `npx vitest run tests/hud.test.ts`

- [ ] **Step 3: Update HUD.ts with dirty-state memoization**

In `src/ui/HUD.ts`:
```typescript
export class HUD {
  private scene: Phaser.Scene;
  private livesText: Phaser.GameObjects.Text;
  private weaponText: Phaser.GameObjects.Text;
  private bossHpText: Phaser.GameObjects.Text;
  private minimapGraphics: Phaser.GameObjects.Graphics;

  private lastLivesStr: string = '';
  private lastWeaponStr: string = '';
  private lastBossHpStr: string = '';
  private lastMinimapGridX: number = -1;
  private lastMinimapGridY: number = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.livesText = this.scene.add.text(8, 6, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ff4444',
    }).setScrollFactor(0).setDepth(100);

    this.weaponText = this.scene.add.text(8, 16, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#00ffff',
    }).setScrollFactor(0).setDepth(100);

    this.bossHpText = this.scene.add.text(160, 6, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ff0055',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    this.minimapGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(100);
  }

  public update(
    player: Player,
    grid: GridCell[][],
    currentGridX: number,
    currentGridY: number,
    boss?: Boss | null,
    infiniteLives?: boolean
  ): void {
    // 1. Update Lives (dirty checked)
    const livesStr = `LIVES: ${formatHUDLives(player.lives, infiniteLives)}`;
    if (livesStr !== this.lastLivesStr) {
      this.livesText.setText(livesStr);
      this.lastLivesStr = livesStr;
    }

    // 2. Update Weapon & Shield info (dirty checked)
    let weaponStr = `WEAPON: ${player.currentWeapon}`;
    if (player.isBarrierActive) {
      weaponStr += ` [SHIELD:${player.barrierHits}]`;
    }
    if (weaponStr !== this.lastWeaponStr) {
      this.weaponText.setText(weaponStr);
      this.lastWeaponStr = weaponStr;
    }

    // 3. Update Boss HP (dirty checked)
    if (boss && boss.isAlive) {
      const pct = Math.max(0, Math.ceil((boss.health / boss.maxHealth) * 100));
      const barLen = 10;
      const filled = Math.max(0, Math.min(barLen, Math.ceil((boss.health / boss.maxHealth) * barLen)));
      const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
      const bossHpStr = `BOSS HP: [${bar}] ${boss.health}/${boss.maxHealth} (${pct}%)`;
      if (bossHpStr !== this.lastBossHpStr) {
        this.bossHpText.setText(bossHpStr);
        this.lastBossHpStr = bossHpStr;
      }
      this.bossHpText.setVisible(true);
    } else {
      if (this.lastBossHpStr !== '') {
        this.bossHpText.setVisible(false);
        this.lastBossHpStr = '';
      }
    }

    // 4. Render 4x4 minimap grid (dirty checked)
    if (currentGridX !== this.lastMinimapGridX || currentGridY !== this.lastMinimapGridY) {
      this.renderMinimap(grid, currentGridX, currentGridY);
      this.lastMinimapGridX = currentGridX;
      this.lastMinimapGridY = currentGridY;
    }
  }
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/hud.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/HUD.ts tests/hud.test.ts
git commit -m "perf: memoize HUD text updates and dirty-check minimap rendering"
```

---

### Task 2: FalconDrone Physics Velocity & Bulk Tilemap Collision Indexing

**Files:**
- Modify: `src/entities/enemies/FalconDrone.ts`
- Modify: `src/core/TilemapRenderer.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/enemy.test.ts`
- Modify: `tests/tilemap-renderer.test.ts`

**Interfaces:**
- Consumes: `FalconDrone.updateAI()`, `TilemapRenderer.renderLevel()`
- Produces: Direct Arcade Physics velocity for FalconDrone & fast bulk tile collision indexing

- [ ] **Step 1: Update FalconDrone.ts**

In `src/entities/enemies/FalconDrone.ts`:
Replace manual `this.y = ...` and `updateFromGameObject()` with direct velocity integration:
```typescript
  public updateAI(
    _time: number,
    delta: number,
    player?: { x: number; y: number },
    _projectilePool?: ProjectilePool
  ): void {
    if (!this.isAlive) return;

    this.elapsedTime += delta;

    if (player) {
      this.facingLeft = player.x < this.x;
    }

    if (typeof this.setFlipX === 'function') {
      this.setFlipX(this.facingLeft);
    }

    if (this.anims && typeof this.anims.play === 'function') {
      this.anims.play('drone_fly', true);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      const vx = this.facingLeft ? -this.moveSpeed : this.moveSpeed;
      // Compute vertical velocity derivative for smooth sine wave movement
      const vy = Math.cos(this.elapsedTime * this.frequency) * this.amplitude * this.frequency * 1000;
      body.setVelocity(vx, vy);
    }
  }
```

- [ ] **Step 2: Update TilemapRenderer.ts with bulk collision setup**

In `src/core/TilemapRenderer.ts`:
```typescript
    const groundLayer = map.createLayer(0, tileset || tilesetKey, 0, 0);
    if (groundLayer && typeof map.setCollision === 'function') {
      // Solid walls and floors (tiles 1 and 3)
      map.setCollision([1, 3], true, true, groundLayer);
      // One-way platforms (tile 2)
      map.setCollision(2, true, false, groundLayer);
    } else if (groundLayer) {
      groundLayer.setCollisionByExclusion([0]);
    }
```

- [ ] **Step 3: Update GameScene.ts pickup collision loops**

In `src/scenes/GameScene.ts` inside `handleCollisions()`:
```typescript
        // Player bullet vs Pickup Capsules
        for (const capsule of this.pickupCapsules) {
          if (!capsule.active) continue;
          if (this.checkOverlap(proj, capsule, 4)) {
            const droppedItem = capsule.hit();
            if (!proj.piercing) {
              proj.deactivate();
            }
            if (droppedItem) {
              this.pickupItems.push(droppedItem);
              if (this.tilemapResult?.groundLayer) {
                this.physics.add.collider(droppedItem, this.tilemapResult.groundLayer);
              }
            }
            break;
          }
        }
```

- [ ] **Step 4: Run full test suite and TypeScript check**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/entities/enemies/FalconDrone.ts src/core/TilemapRenderer.ts src/scenes/GameScene.ts tests/enemy.test.ts tests/tilemap-renderer.test.ts
git commit -m "perf: set FalconDrone direct physics velocity and bulk tilemap collision indexing"
```
