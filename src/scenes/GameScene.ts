import Phaser from 'phaser';
import { generateRoomGrid, GridCell } from '../core/GridGenerator';
import { TilemapRenderer, TilemapRenderResult } from '../core/TilemapRenderer';
import { CameraManager } from '../core/CameraManager';
import { Player } from '../entities/Player';
import { Controls } from '../config/Controls';
import { ProjectilePool } from '../weapons/ProjectilePool';
import { EnemyBase } from '../entities/enemies/EnemyBase';
import { Trooper } from '../entities/enemies/Trooper';
import { Turret } from '../entities/enemies/Turret';
import { FalconDrone } from '../entities/enemies/FalconDrone';
import { JumperMercenary } from '../entities/enemies/JumperMercenary';
import { Boss } from '../entities/enemies/Boss';
import { PickupCapsule, PickupItem } from '../entities/PickupCapsule';
import { HUD } from '../ui/HUD';

export class GameScene extends Phaser.Scene {
  public grid?: GridCell[][];
  public tilemapResult?: TilemapRenderResult | null;
  public cameraManager?: CameraManager;
  public player?: Player;
  public controls?: Controls;
  public projectilePool?: ProjectilePool;
  public hud?: HUD;

  public enemies: EnemyBase[] = [];
  public boss: Boss | null = null;
  public bossTriggered: boolean = false;

  public pickupCapsules: PickupCapsule[] = [];
  public pickupItems: PickupItem[] = [];

  public invulnerableTimer: number = 0;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.enemies = [];
    this.boss = null;
    this.bossTriggered = false;
    this.pickupCapsules = [];
    this.pickupItems = [];
    this.invulnerableTimer = 0;
    this.isGameOver = false;
    this.isVictory = false;

    // 1. Generate room grid
    this.grid = generateRoomGrid(12345);

    // 2. Render tilemap
    this.tilemapResult = TilemapRenderer.renderLevel(this, this.grid);

    // 3. Find START room cell
    const startRoom = this.grid.flat().find((cell) => cell.type === 'START') || { x: 0, y: 0 };

    // 4. Position player in START room
    const startX = startRoom.x * 320 + 160;
    const startY = startRoom.y * 240 + 180;
    this.player = new Player(this, startX, startY);

    // 5. Setup collision with tilemap ground layer
    if (this.tilemapResult?.groundLayer) {
      this.physics.add.collider(this.player, this.tilemapResult.groundLayer);
    }

    // 6. Initialize camera manager focused on START room
    this.cameraManager = new CameraManager(this.cameras.main, startRoom.x, startRoom.y);

    // 7. Initialize user controls
    if (this.input && this.input.keyboard) {
      this.controls = new Controls(this);
    }

    // 8. Initialize Projectile Pool
    this.projectilePool = new ProjectilePool(this);

    // 9. Populate initial enemies in PATH / BRANCH rooms
    this.spawnRoomEnemies();

    // 10. Spawn flying weapon pickup capsule in starting area
    const capsule = new PickupCapsule(this, startX + 100, startY - 80, 'SPREAD_SHOT');
    this.pickupCapsules.push(capsule);

    // 11. Initialize HUD overlay
    this.hud = new HUD(this);
  }

  private spawnRoomEnemies(): void {
    if (!this.grid) return;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = this.grid[r][c];
        if (cell.type === 'PATH' || cell.type === 'BRANCH') {
          const roomX = c * 320;
          const roomY = r * 240;

          // Spawn Trooper
          const trooper = new Trooper(this, roomX + 100, roomY + 180);
          this.enemies.push(trooper);

          // Spawn Turret on ceiling/wall
          const turret = new Turret(this, roomX + 240, roomY + 60);
          this.enemies.push(turret);

          // Spawn Falcon Drone flying
          const drone = new FalconDrone(this, roomX + 160, roomY + 100);
          this.enemies.push(drone);

          // Spawn Jumper Mercenary
          const jumper = new JumperMercenary(this, roomX + 280, roomY + 180);
          this.enemies.push(jumper);
        }
      }
    }

    // Add ground colliders for ground enemies
    if (this.tilemapResult?.groundLayer) {
      for (const enemy of this.enemies) {
        this.physics.add.collider(enemy, this.tilemapResult.groundLayer);
      }
    }
  }

  private triggerBossEncounter(gridX: number, gridY: number): void {
    this.bossTriggered = true;
    const bossX = gridX * 320 + 160;
    const bossY = gridY * 240 + 120;

    this.boss = new Boss(this, bossX, bossY);
    this.enemies.push(this.boss);

    if (this.tilemapResult?.groundLayer) {
      this.physics.add.collider(this.boss, this.tilemapResult.groundLayer);
    }
  }

  public handlePlayerDamage(): void {
    if (!this.player || this.invulnerableTimer > 0 || this.isGameOver) return;

    // Check barrier shield first
    const absorbed = this.player.hitBarrier();
    if (absorbed) {
      this.invulnerableTimer = 500; // Brief invincibility when barrier hit
      return;
    }

    // Direct damage to player lives
    this.player.lives -= 1;
    this.invulnerableTimer = 1500; // 1.5s invulnerability frames

    if (this.player.lives <= 0) {
      this.isGameOver = true;
      this.scene.start('GameOverScene', { victory: false });
    }
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    // 1. Invulnerability flash timer update
    if (this.invulnerableTimer > 0 && this.player) {
      this.invulnerableTimer -= delta;
      this.player.setAlpha(Math.floor(time / 100) % 2 === 0 ? 0.4 : 1.0);
      if (this.invulnerableTimer <= 0) {
        this.invulnerableTimer = 0;
        this.player.setAlpha(1.0);
      }
    }

    // 2. Player input & movement
    if (this.controls && this.player) {
      const input = this.controls.getInputState();
      this.player.updatePlayer(input, delta, this.projectilePool);
    }

    // 3. Camera update & current grid cell tracking
    let currentGridX = 0;
    let currentGridY = 0;

    if (this.player) {
      currentGridX = Math.max(0, Math.min(3, Math.floor(this.player.x / 320)));
      currentGridY = Math.max(0, Math.min(3, Math.floor(this.player.y / 240)));

      if (this.cameraManager) {
        this.cameraManager.update(this.player.x, this.player.y);
      }
    }

    // 4. Boss Room Trigger on Column 3 or BOSS room cell
    if (!this.bossTriggered && this.grid && (currentGridX === 3 || this.grid[currentGridY][currentGridX].type === 'BOSS')) {
      this.triggerBossEncounter(currentGridX, currentGridY);
    }

    // 5. Update Projectile Pool
    if (this.projectilePool) {
      this.projectilePool.update(time, delta);
    }

    // 6. Update Pickup Capsules & Items
    for (const capsule of this.pickupCapsules) {
      if (capsule.active) {
        capsule.updateCapsule(time, delta);
      }
    }

    // 7. Update Enemy AI
    for (const enemy of this.enemies) {
      if (enemy.isAlive && enemy.active) {
        enemy.updateAI(time, delta, this.player, this.projectilePool);
      }
    }

    // 8. Collisions & Overlaps handling
    this.handleCollisions();

    // 9. Update HUD
    if (this.hud && this.player && this.grid) {
      this.hud.update(this.player, this.grid, currentGridX, currentGridY, this.boss);
    }
  }

  private handleCollisions(): void {
    if (!this.player || !this.projectilePool || this.isGameOver) return;

    const activeProjectiles = this.projectilePool.getActiveProjectiles();

    // A. Player Bullets vs Enemies / Boss / Capsules
    for (const proj of activeProjectiles) {
      if (!proj.active) continue;

      if (proj.isPlayerBullet) {
        // Player bullet vs Enemies
        for (const enemy of this.enemies) {
          if (enemy.isAlive && enemy.active) {
            const dist = Phaser.Math.Distance.Between(proj.x, proj.y, enemy.x, enemy.y);
            if (dist < 20) {
              const killed = enemy.takeDamage(proj.damage);
              if (!proj.piercing) {
                proj.deactivate();
              }

              if (killed && enemy === this.boss) {
                // Boss defeated! Trigger Victory!
                this.isVictory = true;
                this.isGameOver = true;
                this.time.delayedCall(500, () => {
                  this.scene.start('GameOverScene', { victory: true });
                });
              }
              break;
            }
          }
        }

        // Player bullet vs Pickup Capsules
        for (const capsule of this.pickupCapsules) {
          if (capsule.active) {
            const dist = Phaser.Math.Distance.Between(proj.x, proj.y, capsule.x, capsule.y);
            if (dist < 16) {
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
        }
      } else {
        // Enemy bullet vs Player
        if (this.player && this.invulnerableTimer <= 0) {
          const dist = Phaser.Math.Distance.Between(proj.x, proj.y, this.player.x, this.player.y);
          if (dist < 14) {
            proj.deactivate();
            this.handlePlayerDamage();
          }
        }
      }
    }

    // B. Player Contact Damage vs Enemies / Boss
    if (this.invulnerableTimer <= 0) {
      for (const enemy of this.enemies) {
        if (enemy.isAlive && enemy.active) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
          if (dist < 18) {
            this.handlePlayerDamage();
            break;
          }
        }
      }
    }

    // C. Player vs Pickup Items
    for (const item of this.pickupItems) {
      if (item.active) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
        if (dist < 20) {
          const weapon = item.collect();
          this.player.equipWeapon(weapon);
        }
      }
    }
  }
}
