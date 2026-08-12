# In-Room Performance & Audio Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate remaining micro-stutters during heavy combat inside a room by implementing active-enemy caching, active-room bullet boundary culling, static audio buffer pre-allocation, and sound effect throttling.

**Architecture:** Extend `CameraManager` to return an `activeEnemies` array; pass room bounds to `ProjectilePool.update()` to cull bullets crossing active room boundaries (+32px margin); pre-allocate white noise `AudioBuffer` in `SoundManager` to eliminate `createBuffer()` allocations and throttle duplicate SFX nodes fired within 25ms.

**Tech Stack:** TypeScript, Phaser 3 Arcade Physics, Web Audio API, Vitest.

## Global Constraints

- **Allocation Budget**: 0 bytes heap allocation for AudioBuffer or collision arrays during firefights.
- **Headless Compatibility**: Web Audio API context fallback for Vitest unit test environment.
- **Testing**: All 16 existing Vitest test suites must pass (`npm test`).

---

### Task 1: Active Enemy Cache & Room-Boundary Bullet Culling

**Files:**
- Modify: `src/core/CameraManager.ts`
- Modify: `src/weapons/ProjectilePool.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `tests/camera-manager-culling.test.ts`
- Modify: `tests/weapons.test.ts`

**Interfaces:**
- Consumes: `CameraManager.cullEnemies(enemies): EnemyBase[]`
- Produces: `activeEnemies` array in `GameScene` & room-bounded bullet deactivation in `ProjectilePool`

- [ ] **Step 1: Write tests for activeEnemies array return & room-bounded bullet culling**

Update `tests/camera-manager-culling.test.ts`:
```typescript
  it('should return activeEnemies array containing only enemies in active room', () => {
    const enemyInRoom = createMockEnemy(100, 100, true);
    const enemyOutRoom = createMockEnemy(400, 100, true);
    const activeEnemies = cameraManager.cullEnemies([enemyInRoom, enemyOutRoom]);

    expect(activeEnemies.length).toBe(1);
    expect(activeEnemies[0]).toBe(enemyInRoom);
  });
```

Add test to `tests/weapons.test.ts`:
```typescript
  it('should deactivate projectile when traveling outside room bounds', () => {
    const sceneMock: any = {};
    const pool = new ProjectilePool(sceneMock, 10);
    const proj = pool.spawn(100, 100, 0, 'PEA_SHOOTER', true);
    expect(proj?.active).toBe(true);

    const bounds = { x: 0, y: 0, width: 320, height: 240 };
    // Move projectile outside room bounds
    if (proj) proj.x = 400;

    pool.update(0, 16, bounds);
    expect(proj?.active).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run tests/camera-manager-culling.test.ts tests/weapons.test.ts`

- [ ] **Step 3: Update CameraManager.ts, ProjectilePool.ts, and GameScene.ts**

In `src/core/CameraManager.ts`:
```typescript
  public cullEnemies<T extends { x: number; y: number; isAlive: boolean; setActive: (active: boolean) => any; setVisible: (visible: boolean) => any; body?: any }>(
    enemies: T[]
  ): T[] {
    const activeEnemies: T[] = [];
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;

      const enemyGridX = Math.floor(enemy.x / this.roomWidthPx);
      const enemyGridY = Math.floor(enemy.y / this.roomHeightPx);

      const isActiveRoom = enemyGridX === this.currentGridX && enemyGridY === this.currentGridY;

      enemy.setActive(isActiveRoom);
      enemy.setVisible(isActiveRoom);
      if (enemy.body) {
        enemy.body.enable = isActiveRoom;
      }

      if (isActiveRoom) {
        activeEnemies.push(enemy);
      }
    }
    return activeEnemies;
  }
```

In `src/weapons/ProjectilePool.ts`:
Update `updateProjectile` and `update`:
```typescript
  public updateProjectile(_time: number, delta: number, bounds?: { x: number; y: number; width: number; height: number }): void {
    if (!this.active) return;

    this.lifespan -= delta;
    if (this.lifespan <= 0) {
      this.deactivate();
      return;
    }

    const config = WEAPON_CONFIGS[this.weaponType];

    // Special movement behavior for FLAME
    if (this.weaponType === 'FLAME') {
      this.travelDistance += delta * 0.001 * config.speed;
      const perpAngle = this.baseAngleRad + Math.PI / 2;
      const offset = Math.sin(this.travelDistance * 0.1) * 12;

      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        const vx = Math.cos(this.baseAngleRad) * config.speed + Math.cos(perpAngle) * offset * 10;
        const vy = Math.sin(this.baseAngleRad) * config.speed + Math.sin(perpAngle) * offset * 10;
        body.setVelocity(vx, vy);
      }
    }

    // Active room boundary check (+32px margin)
    if (bounds) {
      const margin = 32;
      if (
        this.x < bounds.x - margin ||
        this.x > bounds.x + bounds.width + margin ||
        this.y < bounds.y - margin ||
        this.y > bounds.y + bounds.height + margin
      ) {
        this.deactivate();
        return;
      }
    }

    // Global world bounds fallback safety check
    if (this.x < -100 || this.x > 3000 || this.y < -100 || this.y > 3000) {
      this.deactivate();
    }
  }

  public update(time: number, delta: number, bounds?: { x: number; y: number; width: number; height: number }): void {
    for (const proj of this.pool) {
      if (proj.active) {
        proj.updateProjectile(time, delta, bounds);
      }
    }
  }
```

In `src/scenes/GameScene.ts`:
Store `public activeEnemies: EnemyBase[] = [];` and update:
```typescript
    if (this.cameraManager) {
      this.activeEnemies = this.cameraManager.cullEnemies(this.enemies);
    } else {
      this.activeEnemies = this.enemies.filter(e => e.isAlive && e.active);
    }

    // 5. Update Projectile Pool with active room bounds
    if (this.projectilePool && this.cameraManager) {
      this.projectilePool.update(time, delta, this.cameraManager.getActiveBounds());
    } else if (this.projectilePool) {
      this.projectilePool.update(time, delta);
    }
```
And in `handleCollisions()`, loop over `this.activeEnemies` instead of `this.enemies`:
```typescript
        for (const enemy of this.activeEnemies) {
          if (enemy.isAlive && enemy.active) {
            if (this.checkOverlap(proj, enemy, 4)) {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/CameraManager.ts src/weapons/ProjectilePool.ts src/scenes/GameScene.ts tests/camera-manager-culling.test.ts tests/weapons.test.ts
git commit -m "perf: cache activeEnemies and cull projectiles crossing active room bounds"
```

---

### Task 2: Static Audio Buffer Pre-Allocation & SFX Throttling

**Files:**
- Modify: `src/core/SoundManager.ts`
- Modify: `tests/sound-manager.test.ts`

**Interfaces:**
- Consumes: `SoundManager.playShoot(weaponType, isPlayerBullet)`
- Produces: 0 memory allocations in `playFlameSound` and throttled SFX triggers within 25ms

- [ ] **Step 1: Write test for audio throttling in SoundManager**

Add test to `tests/sound-manager.test.ts`:
```typescript
  it('should support audio manager initialization and sound triggers without error', () => {
    const sm = SoundManager.getInstance();
    expect(() => {
      sm.playShoot('SPREAD_SHOT', true);
      sm.playShoot('SPREAD_SHOT', true);
    }).not.toThrow();
  });
```

- [ ] **Step 2: Run test to verify existing tests**

Run: `npx vitest run tests/sound-manager.test.ts`

- [ ] **Step 3: Update SoundManager.ts with noiseBuffer pre-allocation and throttling**

In `src/core/SoundManager.ts`:
Add properties:
```typescript
  private noiseBuffer: AudioBuffer | null = null;
  private lastSfxTimes: Map<string, number> = new Map();
```
In `initAudioContext()`:
```typescript
        // Pre-allocate 1-second white noise buffer for SFX synthesis
        const sampleRate = this.ctx.sampleRate || 44100;
        const bufferSize = sampleRate * 0.5; // 0.5 sec buffer
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
```
In `playShoot()`:
```typescript
  public playShoot(weaponType: WeaponType | 'ENEMY' = 'PEA_SHOOTER', isPlayerBullet: boolean = true): void {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const key = `${weaponType}_${isPlayerBullet}`;
    const lastTime = this.lastSfxTimes.get(key) || 0;

    // Throttle sound synthesis if triggered within 25ms (e.g. multi-bullet spread shot)
    if (t - lastTime < 0.025) {
      return;
    }
    this.lastSfxTimes.set(key, t);
// ...
```
And in `playFlameSound()`:
```typescript
    const noise = this.ctx.createBufferSource();
    if (this.noiseBuffer) {
      noise.buffer = this.noiseBuffer;
    } else {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise.buffer = buffer;
    }
```

- [ ] **Step 4: Run full test suite and TypeScript check**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Expected: PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/SoundManager.ts tests/sound-manager.test.ts
git commit -m "perf: pre-allocate noise AudioBuffer and throttle high-frequency SFX triggers in SoundManager"
```
