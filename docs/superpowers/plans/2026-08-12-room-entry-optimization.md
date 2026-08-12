# Room Entry & Physics Group Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate frame hitches when entering new room cells by consolidating 56 individual physics colliders into a single `Phaser.Physics.Arcade.Group` collider and clamping camera bounds during room pan transitions.

**Architecture:** Initialize `enemyGroup` in `GameScene` for ground colliders; update `CameraManager.transitionToRoom()` to set union camera bounds during room transitions instead of calling `removeBounds()`.

**Tech Stack:** TypeScript, Phaser 3 Arcade Physics, Vitest.

## Global Constraints

- **Collider Limit**: Single `physics.add.collider(enemyGroup, groundLayer)` call for all enemies.
- **Headless Compatibility**: Optional chaining on Phaser camera methods in tests.
- **Testing**: All 16 existing Vitest test suites must pass (`npm test`).

---

### Task 1: Enemy Physics Group Consolidation

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/game-loop.test.ts`

**Interfaces:**
- Consumes: `GameScene.enemies`, `GameScene.enemyGroup`
- Produces: Single ground layer collider for all enemies via `this.enemyGroup`

- [ ] **Step 1: Write test verifying enemyGroup exists and collides**

Update `tests/game-loop.test.ts`:
```typescript
  it('should initialize enemyGroup for physics colliders', () => {
    const scene = new GameScene();
    scene.create();
    expect((scene as any).enemyGroup).toBeDefined();
  });
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/game-loop.test.ts`

- [ ] **Step 3: Update GameScene.ts**

In `src/scenes/GameScene.ts`:
Add `public enemyGroup?: Phaser.Physics.Arcade.Group;` property.
In `create()`:
```typescript
    if (this.physics && typeof this.physics.add?.group === 'function') {
      this.enemyGroup = this.physics.add.group();
    }
```
In `spawnRoomEnemies()`:
```typescript
          const trooper = new Trooper(this, roomX + 100, roomY + 180);
          this.enemies.push(trooper);
          if (this.enemyGroup) this.enemyGroup.add(trooper);

          const turret = new Turret(this, roomX + 240, roomY + 60);
          this.enemies.push(turret);

          const drone = new FalconDrone(this, roomX + 160, roomY + 100);
          this.enemies.push(drone);

          const jumper = new JumperMercenary(this, roomX + 280, roomY + 180);
          this.enemies.push(jumper);
          if (this.enemyGroup) this.enemyGroup.add(jumper);
```
And replace the per-enemy collider loop with a single group collider:
```typescript
    if (this.tilemapResult?.groundLayer && this.enemyGroup) {
      this.physics.add.collider(this.enemyGroup, this.tilemapResult.groundLayer);
    }
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/game-loop.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts tests/game-loop.test.ts
git commit -m "perf: consolidate individual enemy ground colliders into single Arcade Physics Group"
```

---

### Task 2: Union Viewport Camera Bounds During Room Transitions

**Files:**
- Modify: `src/core/CameraManager.ts`
- Modify: `tests/camera-manager-culling.test.ts`

**Interfaces:**
- Consumes: `CameraManager.transitionToRoom(gridX, gridY, duration)`
- Produces: Clamped union bounds during pan transitions

- [ ] **Step 1: Write test for union camera bounds during transition**

Add test to `tests/camera-manager-culling.test.ts`:
```typescript
  it('should set union camera bounds during room transitions', () => {
    let setBoundsCall: any = null;
    const customCameraMock: any = {
      setBounds: (x: number, y: number, w: number, h: number) => { setBoundsCall = { x, y, w, h }; },
      centerOn: () => {},
      pan: () => {},
      removeBounds: () => {}
    };

    const cm = new CameraManager(customCameraMock, 0, 0, 320, 240);
    cm.transitionToRoom(1, 0, 400);

    expect(setBoundsCall).toEqual({ x: 0, y: 0, w: 640, h: 240 });
  });
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/camera-manager-culling.test.ts`

- [ ] **Step 3: Update CameraManager.ts**

In `src/core/CameraManager.ts`, update `transitionToRoom`:
```typescript
  public transitionToRoom(gridX: number, gridY: number, duration: number = 400): void {
    const fromGridX = this.currentGridX;
    const fromGridY = this.currentGridY;

    this.currentGridX = gridX;
    this.currentGridY = gridY;

    const bounds = getRoomBounds(gridX, gridY, this.roomWidthPx, this.roomHeightPx);
    const targetCenterX = bounds.x + bounds.width / 2;
    const targetCenterY = bounds.y + bounds.height / 2;

    if (!this.camera) return;

    this.isTransitioningState = true;

    // Compute union bounds covering both source and target rooms
    const minGridX = Math.min(fromGridX, gridX);
    const maxGridX = Math.max(fromGridX, gridX);
    const minGridY = Math.min(fromGridY, gridY);
    const maxGridY = Math.max(fromGridY, gridY);

    const unionX = minGridX * this.roomWidthPx;
    const unionY = minGridY * this.roomHeightPx;
    const unionWidth = (maxGridX - minGridX + 1) * this.roomWidthPx;
    const unionHeight = (maxGridY - minGridY + 1) * this.roomHeightPx;

    if (typeof this.camera.setBounds === 'function') {
      this.camera.setBounds(unionX, unionY, unionWidth, unionHeight);
    }

    if (typeof this.camera.pan === 'function') {
      this.camera.pan(targetCenterX, targetCenterY, duration, 'Power2', false, (_cam: any, progress: number) => {
        if (progress === 1) {
          this.isTransitioningState = false;
          if (typeof this.camera.setBounds === 'function') {
            this.camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
          }
        }
      });
    } else {
      this.setRoom(gridX, gridY, true);
      this.isTransitioningState = false;
    }
  }
```

- [ ] **Step 4: Run full test suite and TypeScript check**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/CameraManager.ts tests/camera-manager-culling.test.ts
git commit -m "perf: set union viewport camera bounds during room transition pans"
```
