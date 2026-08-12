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
import { getRandomPickupWeapon } from '../weapons/WeaponTypes';
import { HUD } from '../ui/HUD';
import { SoundManager } from '../core/SoundManager';

export interface GameSceneInitData {
  infiniteLives?: boolean;
  seed?: number;
}

export class GameScene extends Phaser.Scene {
  public infiniteLives: boolean = false;
  public seed: number = 0;
  public grid?: GridCell[][];
  public tilemapResult?: TilemapRenderResult | null;
  public cameraManager?: CameraManager;
  public player?: Player;
  public controls?: Controls;
  public projectilePool?: ProjectilePool;
  public hud?: HUD;

  public enemies: EnemyBase[] = [];
  public enemyGroup?: Phaser.Physics.Arcade.Group;
  public activeEnemies: EnemyBase[] = [];
  public boss: Boss | null = null;
  public bossTriggered: boolean = false;

  public pickupCapsules: PickupCapsule[] = [];
  public pickupItems: PickupItem[] = [];
  public exitDoor?: Phaser.GameObjects.Sprite;
  public exitDoors: Phaser.GameObjects.Sprite[] = [];

  public invulnerableTimer: number = 0;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;

  public lastCullGridX: number = -1;
  public lastCullGridY: number = -1;
  private activeBulletsBuffer: any[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: GameSceneInitData): void {
    this.infiniteLives = !!data?.infiniteLives;
    this.seed = (data?.seed !== undefined && data?.seed !== null)
      ? data.seed
      : Math.floor(Math.random() * 2147483647);
  }

  create(): void {
    this.enemies = [];
    this.enemyGroup = undefined;
    this.activeEnemies = [];
    this.boss = null;
    this.bossTriggered = false;
    this.pickupCapsules = [];
    this.pickupItems = [];
    this.exitDoor = undefined;
    this.exitDoors = [];
    this.invulnerableTimer = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.lastCullGridX = -1;
    this.lastCullGridY = -1;

    // 0. Set atmospheric background color & 4x4 grid physics world bounds
    if (this.cameras && this.cameras.main && typeof this.cameras.main.setBackgroundColor === 'function') {
      this.cameras.main.setBackgroundColor('#121726');
    }
    if (this.physics && this.physics.world && typeof this.physics.world.setBounds === 'function') {
      this.physics.world.setBounds(0, 0, 1280, 960);
    }
    if (this.physics && typeof this.physics.add?.group === 'function') {
      this.enemyGroup = this.physics.add.group();
    }

    // 1. Generate room grid
    this.grid = generateRoomGrid(this.seed);

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
    const startWeapon = getRandomPickupWeapon();
    const capsule = new PickupCapsule(this, startX + 100, startY - 80, startWeapon);
    this.pickupCapsules.push(capsule);

    // 11. Spawn Exit Door in final/BOSS room
    const exitCell = this.grid.flat().find((cell) => cell.type === 'BOSS') || { x: 3, y: 0 };
    const exitX = exitCell.x * 320 + 260;
    const exitY = exitCell.y * 240 + 180;

    if (this.add && typeof this.add.sprite === 'function') {
      const portal = this.add.sprite(exitX, exitY, 'tileset', 4);
      this.exitDoor = portal;
      this.exitDoors.push(portal);
    }
    if (this.add && typeof this.add.text === 'function') {
      this.add.text(exitX, exitY - 18, 'EXIT PORTAL', {
        fontSize: '9px',
        color: '#00ff88',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // 12. Initialize HUD overlay
    this.hud = new HUD(this);

    // 13. Start BGM & setup M mute toggle key
    SoundManager.getInstance().startBGM();
    if (typeof this.input?.keyboard?.on === 'function') {
      this.input.keyboard.on('keydown-M', () => {
        SoundManager.getInstance().toggleMute();
      });
    }
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
          if (this.enemyGroup) this.enemyGroup.add(trooper);

          // Spawn Turret on ceiling/wall
          const turret = new Turret(this, roomX + 240, roomY + 60);
          this.enemies.push(turret);

          // Spawn Falcon Drone flying
          const drone = new FalconDrone(this, roomX + 160, roomY + 100);
          this.enemies.push(drone);

          // Spawn Jumper Mercenary
          const jumper = new JumperMercenary(this, roomX + 280, roomY + 180);
          this.enemies.push(jumper);
          if (this.enemyGroup) this.enemyGroup.add(jumper);

          // Spawn flying weapon capsule per room
          const roomCapsuleWeapon = getRandomPickupWeapon();
          const roomCapsule = new PickupCapsule(this, roomX + 40, roomY + 70, roomCapsuleWeapon);
          this.pickupCapsules.push(roomCapsule);
        }
      }
    }

    // Add ground colliders for ground enemies
    if (this.tilemapResult?.groundLayer && this.enemyGroup) {
      this.physics.add.collider(this.enemyGroup, this.tilemapResult.groundLayer);
    }
  }

  private triggerBossEncounter(gridX: number, gridY: number): void {
    this.bossTriggered = true;
    const bossX = gridX * 320 + 160;
    const bossY = gridY * 240 + 120;

    this.boss = new Boss(this, bossX, bossY);
    this.enemies.push(this.boss);
    if (this.enemyGroup) this.enemyGroup.add(this.boss);

    if (this.tilemapResult?.groundLayer) {
      this.physics.add.collider(this.boss, this.tilemapResult.groundLayer);
    }
    this.lastCullGridX = -1;
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
    if (!this.infiniteLives) {
      this.player.lives -= 1;
    }
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

    let currentGridX = 0;
    let currentGridY = 0;

    if (this.player) {
      if (this.cameraManager) {
        this.cameraManager.update(this.player.x, this.player.y);
        const room = this.cameraManager.getCurrentRoom();
        currentGridX = room.gridX;
        currentGridY = room.gridY;
      } else {
        currentGridX = Math.max(0, Math.min(3, Math.floor(this.player.x / 320)));
        currentGridY = Math.max(0, Math.min(3, Math.floor(this.player.y / 240)));
      }
    }

    if (this.cameraManager) {
      if (currentGridX !== this.lastCullGridX || currentGridY !== this.lastCullGridY) {
        this.activeEnemies = this.cameraManager.cullEnemies(this.enemies, this.activeEnemies);
        this.lastCullGridX = currentGridX;
        this.lastCullGridY = currentGridY;
      }
    }

    // 4. Boss Room Trigger on Column 3 or BOSS room cell
    if (!this.bossTriggered && this.grid && (currentGridX === 3 || this.grid[currentGridY][currentGridX].type === 'BOSS')) {
      this.triggerBossEncounter(currentGridX, currentGridY);
    }

    // 5. Update Projectile Pool
    if (this.projectilePool) {
      const bounds = this.cameraManager?.getActiveBounds();
      this.projectilePool.update(time, delta, bounds, this.tilemapResult?.groundLayer);
    }

    // 6. Update Pickup Capsules & Items
    for (let i = this.pickupCapsules.length - 1; i >= 0; i--) {
      const capsule = this.pickupCapsules[i];
      if (capsule.active) {
        capsule.updateCapsule(time, delta);
      } else {
        this.pickupCapsules.splice(i, 1);
      }
    }

    // 7. Update Active Enemy AI Only
    for (let i = 0; i < this.activeEnemies.length; i++) {
      const enemy = this.activeEnemies[i];
      if (enemy.isAlive && enemy.active) {
        enemy.updateAI(time, delta, this.player, this.projectilePool);
      }
    }

    // 7.5 Check All Enemies Defeated Victory Condition
    if (!this.isVictory && this.enemies.length > 0) {
      let allDead = true;
      for (let i = 0; i < this.enemies.length; i++) {
        if (this.enemies[i].isAlive) {
          allDead = false;
          break;
        }
      }
      if (allDead) {
        this.triggerVictory();
      }
    }

    // 8. Collisions & Overlaps handling
    this.handleCollisions();

    // 9. Update HUD
    if (this.hud && this.player && this.grid) {
      this.hud.update(this.player, this.grid, currentGridX, currentGridY, this.boss, this.infiniteLives);
    }
  }

  private triggerVictory(): void {
    if (this.isVictory) return;
    this.isVictory = true;
    this.isGameOver = true;
    if (this.time && typeof this.time.delayedCall === 'function') {
      this.time.delayedCall(500, () => {
        this.scene.start('GameOverScene', { victory: true });
      });
    } else {
      this.scene.start('GameOverScene', { victory: true });
    }
  }

  private checkOverlap(
    a: { x: number; y: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number; body?: any },
    b: { x: number; y: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number; body?: any },
    padding: number = 4
  ): boolean {
    let cx1 = a.x, cy1 = a.y, w1 = 16, h1 = 16;
    if (a.body) {
      w1 = a.body.width;
      h1 = a.body.height;
      cx1 = a.body.x + w1 * 0.5;
      cy1 = a.body.y + h1 * 0.5;
    } else {
      w1 = a.displayWidth || a.width || 16;
      h1 = a.displayHeight || a.height || 16;
    }

    let cx2 = b.x, cy2 = b.y, w2 = 16, h2 = 16;
    if (b.body) {
      w2 = b.body.width;
      h2 = b.body.height;
      cx2 = b.body.x + w2 * 0.5;
      cy2 = b.body.y + h2 * 0.5;
    } else {
      w2 = b.displayWidth || b.width || 16;
      h2 = b.displayHeight || b.height || 16;
    }

    const halfW = (w1 + w2) * 0.5 + padding;
    const halfH = (h1 + h2) * 0.5 + padding;
    const dx = cx1 - cx2;
    const dy = cy1 - cy2;

    return (dx < 0 ? -dx : dx) <= halfW && (dy < 0 ? -dy : dy) <= halfH;
  }

  private handleCollisions(): void {
    if (!this.player || !this.projectilePool || this.isGameOver) return;

    // A. Player Bullets vs Enemies / Boss / Capsules
    const activeBullets = this.projectilePool.getActiveProjectiles(this.activeBulletsBuffer);

    if (activeBullets.length > 0) {
      for (let p = 0; p < activeBullets.length; p++) {
        const proj = activeBullets[p];
        if (!proj.active) continue;

        if (proj.isPlayerBullet) {
          // Player bullet vs Enemies
          for (let e = 0; e < this.activeEnemies.length; e++) {
            const enemy = this.activeEnemies[e];
            if (enemy.isAlive && enemy.active) {
              if (this.checkOverlap(proj, enemy, 4)) {
                const killed = enemy.takeDamage(proj.damage);
                if (!proj.piercing) {
                  proj.deactivate();
                }

                if (killed) {
                  if (enemy === this.boss) {
                    this.triggerVictory();
                  } else if (Math.random() < 0.2) {
                    const droppedItem = new PickupItem(this, enemy.x, enemy.y, getRandomPickupWeapon());
                    this.pickupItems.push(droppedItem);
                    if (this.tilemapResult?.groundLayer) {
                      this.physics.add.collider(droppedItem, this.tilemapResult.groundLayer);
                    }
                  }
                }
                break;
              }
            }
          }

          // Player bullet vs Pickup Capsules
          for (let c = this.pickupCapsules.length - 1; c >= 0; c--) {
            const capsule = this.pickupCapsules[c];
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
        } else {
          // Enemy bullet vs Player
          if (this.player && this.invulnerableTimer <= 0) {
            if (this.checkOverlap(proj, this.player, 2)) {
              proj.deactivate();
              this.handlePlayerDamage();
            }
          }
        }
      }
    }

    // B. Player Contact Damage vs Enemies / Boss
    if (this.invulnerableTimer <= 0) {
      for (let i = 0; i < this.activeEnemies.length; i++) {
        const enemy = this.activeEnemies[i];
        if (enemy.isAlive && enemy.active) {
          if (this.checkOverlap(this.player, enemy, 2)) {
            this.handlePlayerDamage();
            break;
          }
        }
      }
    }

    // C. Player vs Pickup Items
    for (let i = this.pickupItems.length - 1; i >= 0; i--) {
      const item = this.pickupItems[i];
      if (!item.active) {
        this.pickupItems.splice(i, 1);
        continue;
      }
      if (this.checkOverlap(this.player, item, 4)) {
        const weapon = item.collect();
        this.player.equipWeapon(weapon);
        this.pickupItems.splice(i, 1);
      }
    }

    // D. Player vs Level Exit Doors / Portals
    for (let i = 0; i < this.exitDoors.length; i++) {
      const door = this.exitDoors[i];
      if (this.checkOverlap(this.player, door, 8)) {
        this.triggerVictory();
        break;
      }
    }
    if (this.exitDoor && this.checkOverlap(this.player, this.exitDoor, 8)) {
      this.triggerVictory();
    }
  }
}



