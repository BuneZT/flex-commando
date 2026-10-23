import Phaser from 'phaser';
import { GAME_CONSTANTS } from '../config/GameConstants';
import { generateRoomGrid, GridCell, selectCapsuleRoomCoords } from '../core/GridGenerator';
import { TilemapRenderer, TilemapRenderResult } from '../core/TilemapRenderer';
import { CameraManager } from '../core/CameraManager';
import { Player, shouldCollideWithTile } from '../entities/Player';
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
import { createRetroTextStyle } from '../ui/TextStyle';
import { ImpactFXPool } from '../core/ImpactFXPool';
import { CombatFX } from '../core/CombatFX';
import { ScoreManager, POWERUP_SCORE_VALUE } from '../core/ScoreManager';
import { getRoomDoorBarriers, isRoomCleared, clampPlayerInsideRoom } from '../core/RoomLockdown';

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
  public impactFXPool?: ImpactFXPool;
  public hud?: HUD;
  public parallaxBg?: Phaser.GameObjects.TileSprite;

  public enemies: EnemyBase[] = [];
  public enemyGroup?: Phaser.Physics.Arcade.Group;
  public activeEnemies: EnemyBase[] = [];
  public boss: Boss | null = null;
  public bossTriggered: boolean = false;

  public pickupCapsules: PickupCapsule[] = [];
  public activePickupCapsules: PickupCapsule[] = [];
  public pickupItems: PickupItem[] = [];
  public pickupItemGroup?: Phaser.Physics.Arcade.Group;
  public crosshair?: Phaser.GameObjects.Sprite;
  public exitDoor?: Phaser.GameObjects.Sprite;
  public exitDoors: Phaser.GameObjects.Sprite[] = [];
  public isPortalUnlocked: boolean = false;
  public exitPortalText?: Phaser.GameObjects.Text;
  public roomBarriers: Phaser.GameObjects.Sprite[] = [];
  public roomBarrierGroup?: Phaser.Physics.Arcade.StaticGroup | Phaser.Physics.Arcade.Group;
  public isRoomLockdownActive: boolean = false;

  public invulnerableTimer: number = 0;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;
  public score: number = 0;

  public lastCullGridX: number = -1;
  public lastCullGridY: number = -1;
  private activeBulletsBuffer: any[] = [];
  private tempWorldPoint: { x: number; y: number } = { x: 0, y: 0 };

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
    this.parallaxBg = undefined;
    this.enemies = [];
    this.enemyGroup = undefined;
    this.activeEnemies = [];
    this.boss = null;
    this.bossTriggered = false;
    this.pickupCapsules = [];
    this.activePickupCapsules = [];
    this.pickupItems = [];
    this.exitDoor = undefined;
    this.exitDoors = [];
    this.roomBarriers = [];
    this.roomBarrierGroup = undefined;
    this.isRoomLockdownActive = false;
    this.isPortalUnlocked = false;
    this.exitPortalText = undefined;
    this.crosshair = undefined;
    this.invulnerableTimer = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.score = 0;
    this.lastCullGridX = -1;
    this.lastCullGridY = -1;

    // Hide default OS cursor during gameplay
    if (this.input && typeof this.input.setDefaultCursor === 'function') {
      this.input.setDefaultCursor('none');
    }

    // 0. Set atmospheric background color & 4x4 grid physics world bounds
    if (this.cameras && this.cameras.main && typeof this.cameras.main.setBackgroundColor === 'function') {
      this.cameras.main.setBackgroundColor('#070914');
      if (typeof this.cameras.main.setRoundPixels === 'function') {
        this.cameras.main.setRoundPixels(true);
      }
    }
    if (this.physics && this.physics.world && typeof this.physics.world.setBounds === 'function') {
      this.physics.world.setBounds(0, 0, GAME_CONSTANTS.WORLD_WIDTH_PX, GAME_CONSTANTS.WORLD_HEIGHT_PX);
    }
    if (this.physics && typeof this.physics.add?.group === 'function') {
      this.enemyGroup = this.physics.add.group();
      this.pickupItemGroup = this.physics.add.group();
      if (typeof this.physics.add?.staticGroup === 'function') {
        this.roomBarrierGroup = this.physics.add.staticGroup();
      } else if (typeof this.physics.add?.group === 'function') {
        this.roomBarrierGroup = this.physics.add.group();
      }
    }

    // 0.5. Parallax cyber hangar background
    if (this.textures?.exists?.('cyber_hangar_bg') && typeof this.add?.tileSprite === 'function') {
      const bg = this.add.tileSprite(0, 0, GAME_CONSTANTS.VIEW_WIDTH_PX, GAME_CONSTANTS.VIEW_HEIGHT_PX, 'cyber_hangar_bg');
      if (bg && typeof bg.setOrigin === 'function') {
        bg.setOrigin(0, 0);
      }
      if (bg && typeof bg.setScrollFactor === 'function') {
        bg.setScrollFactor(0);
      }
      if (bg && typeof bg.setDepth === 'function') {
        bg.setDepth(-10);
      }
      this.parallaxBg = bg;
    }

    // 1. Generate room grid
    this.grid = generateRoomGrid(this.seed);

    // 2. Render tilemap
    this.tilemapResult = TilemapRenderer.renderLevel(this, this.grid);

    // 3. Find START room cell
    const startRoom = this.grid.flat().find((cell) => cell.type === 'START') || { x: 0, y: 0 };

    // 4. Position player in START room
    const startX = startRoom.x * GAME_CONSTANTS.VIEW_WIDTH_PX + 120;
    const startY = startRoom.y * GAME_CONSTANTS.VIEW_HEIGHT_PX + 220;
    this.player = new Player(this, startX, startY);
    if (this.tilemapResult?.groundLayer) {
      this.player.groundLayer = this.tilemapResult.groundLayer;
    }

    // 5. Setup collision with tilemap ground layer (drop through only for Tile 2 platforms)
    if (this.tilemapResult?.groundLayer) {
      this.physics.add.collider(
        this.player,
        this.tilemapResult.groundLayer,
        undefined,
        (playerObj: any, tileObj: any) => {
          return shouldCollideWithTile(
            (playerObj as Player).isDroppingThrough,
            (tileObj as Phaser.Tilemaps.Tile).index
          );
        },
        this
      );
    }

    // 5.5 Setup room barrier pool and collision with player
    this.roomBarriers = [];
    for (let i = 0; i < 4; i++) {
      let barrier: any = null;
      if (this.roomBarrierGroup && typeof this.roomBarrierGroup.create === 'function') {
        barrier = this.roomBarrierGroup.create(0, 0, 'tileset', 4);
      } else if (this.add && typeof this.add.sprite === 'function') {
        barrier = this.add.sprite(0, 0, 'tileset', 4);
        if (this.roomBarrierGroup && typeof this.roomBarrierGroup.add === 'function') {
          this.roomBarrierGroup.add(barrier);
        }
      }
      if (barrier) {
        if (typeof barrier.setTint === 'function') barrier.setTint(0xff3333);
        if (typeof barrier.setAlpha === 'function') barrier.setAlpha(0.85);
        if (typeof barrier.setDepth === 'function') barrier.setDepth(15);
        if (typeof barrier.setActive === 'function') barrier.setActive(false);
        if (typeof barrier.setVisible === 'function') barrier.setVisible(false);
        if (barrier.body) {
          barrier.body.enable = false;
          barrier.body.immovable = true;
          if (typeof barrier.body.setImmovable === 'function') {
            barrier.body.setImmovable(true);
          }
          if (typeof barrier.body.setAllowGravity === 'function') {
            barrier.body.setAllowGravity(false);
          }
        }
        this.roomBarriers.push(barrier);
      }
    }
    if (this.roomBarrierGroup && this.player && typeof this.physics?.add?.collider === 'function') {
      this.physics.add.collider(this.player, this.roomBarrierGroup);
    }

    // 6. Initialize camera manager focused on START room
    if (this.cameras?.main) {
      this.cameraManager = new CameraManager(this.cameras.main, startRoom.x, startRoom.y);
    }

    // 7. Initialize user controls
    if (this.input && this.input.keyboard) {
      this.controls = new Controls(this);
    }

    // 7.5 Initialize in-game crosshair sprite
    if (this.add && typeof this.add.sprite === 'function') {
      const crosshair = this.add.sprite(startX + 30, startY, 'tex_crosshair');
      if (crosshair) {
        if (typeof crosshair.setOrigin === 'function') {
          crosshair.setOrigin(0.5, 0.5);
        }
        if (typeof crosshair.setDepth === 'function') {
          crosshair.setDepth(100);
        }
        this.crosshair = crosshair;
      }
    }

    // 8. Initialize Impact FX and Projectile Pool
    this.impactFXPool = new ImpactFXPool(this);
    this.projectilePool = new ProjectilePool(this, 100, this.impactFXPool);

    // 9. Populate initial enemies in PATH / BRANCH rooms
    this.spawnRoomEnemies();

    // 10. Spawn Exit Door in final/BOSS room
    const exitCell = this.grid.flat().find((cell) => cell.type === 'BOSS') || { x: 3, y: 0 };
    const exitX = exitCell.x * GAME_CONSTANTS.VIEW_WIDTH_PX + 420;
    const exitY = exitCell.y * GAME_CONSTANTS.VIEW_HEIGHT_PX + 220;

    if (this.add && typeof this.add.sprite === 'function') {
      const portal = this.add.sprite(exitX, exitY, 'tileset', 4);
      if (typeof portal.setTint === 'function') {
        portal.setTint(0xff4444);
      }
      if (typeof portal.setAlpha === 'function') {
        portal.setAlpha(0.75);
      }
      this.exitDoor = portal;
      this.exitDoors.push(portal);
    }
    if (this.add && typeof this.add.text === 'function') {
      this.exitPortalText = this.add.text(
        exitX,
        exitY - 18,
        'PORTAL LOCKED',
        createRetroTextStyle({
          fontSize: '10px',
          color: '#ff4444',
          strokeThickness: 2,
        })
      ).setOrigin(0.5);
    }

    // 11. Initialize HUD overlay
    if (this.add && typeof this.add.text === 'function') {
      this.hud = new HUD(this);
    }

    // 12. Start BGM & setup M mute toggle key
    SoundManager.getInstance().startBGM('STAGE', this);
    if (typeof this.input?.keyboard?.on === 'function') {
      this.input.keyboard.on('keydown-M', () => {
        SoundManager.getInstance().toggleMute();
      });
    }

    // 13. Initial spatial culling for START room
    this.cullEntities(startRoom.x, startRoom.y);
  }

  private spawnRoomEnemies(): void {
    if (!this.grid) return;

    const capsuleRooms = this.grid ? selectCapsuleRoomCoords(this.grid) : [];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = this.grid[r][c];
        if (cell.type === 'PATH' || cell.type === 'BRANCH') {
          const roomX = c * GAME_CONSTANTS.VIEW_WIDTH_PX;
          const roomY = r * GAME_CONSTANTS.VIEW_HEIGHT_PX;

          // Spawn Trooper
          const trooper = new Trooper(this, roomX + 160, roomY + 220);
          this.enemies.push(trooper);
          if (this.enemyGroup) this.enemyGroup.add(trooper);

          // Spawn Turret on ceiling/wall
          const turret = new Turret(this, roomX + 380, roomY + 48);
          this.enemies.push(turret);

          // Spawn Falcon Drone flying
          const drone = new FalconDrone(this, roomX + 256, roomY + 120);
          this.enemies.push(drone);

          // Spawn Jumper Mercenary
          const jumper = new JumperMercenary(this, roomX + 420, roomY + 220);
          this.enemies.push(jumper);
          if (this.enemyGroup) this.enemyGroup.add(jumper);

          // Spawn flying weapon capsule in curated rooms
          const shouldSpawnCapsule = capsuleRooms.some((cr) => cr.x === c && cr.y === r);
          if (shouldSpawnCapsule) {
            const roomCapsuleWeapon = getRandomPickupWeapon();
            const roomCapsule = new PickupCapsule(this, roomX + 60, roomY + 90, roomCapsuleWeapon);
            this.pickupCapsules.push(roomCapsule);
          }
        }
      }
    }

    // Add ground colliders for ground enemies and dropped items
    if (this.tilemapResult?.groundLayer && this.enemyGroup) {
      this.physics.add.collider(this.enemyGroup, this.tilemapResult.groundLayer);
    }
    if (this.tilemapResult?.groundLayer && this.pickupItemGroup) {
      this.physics.add.collider(this.pickupItemGroup, this.tilemapResult.groundLayer);
    }
  }

  private triggerBossEncounter(gridX: number, gridY: number): void {
    this.bossTriggered = true;
    const bossX = gridX * GAME_CONSTANTS.VIEW_WIDTH_PX + 256;
    const bossY = gridY * GAME_CONSTANTS.VIEW_HEIGHT_PX + 144;

    this.boss = new Boss(this, bossX, bossY);
    this.enemies.push(this.boss);
    if (this.enemyGroup) this.enemyGroup.add(this.boss);

    if (this.tilemapResult?.groundLayer) {
      this.physics.add.collider(
        this.boss,
        this.tilemapResult.groundLayer,
        undefined,
        (bossObj: any, tileObj: any) => {
          return shouldCollideWithTile(
            (bossObj as Boss).isDroppingThrough,
            (tileObj as Phaser.Tilemaps.Tile).index
          );
        },
        this
      );
    }
    this.lastCullGridX = -1;
    this.updateRoomLockdown(gridX, gridY);
    SoundManager.getInstance().startBGM('BOSS', this);
  }

  public handlePlayerDamage(hitX?: number, hitY?: number): void {
    if (!this.player || this.invulnerableTimer > 0 || this.isGameOver) return;

    // Check barrier shield first
    const absorbed = this.player.hitBarrier();
    if (absorbed) {
      if (this.impactFXPool && typeof this.impactFXPool.spawn === 'function') {
        this.impactFXPool.spawn(hitX ?? this.player.x, hitY ?? this.player.y);
      }
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
      if (this.input && typeof this.input.setDefaultCursor === 'function') {
        this.input.setDefaultCursor('default');
      }
      if (this.crosshair && typeof this.crosshair.setVisible === 'function') {
        this.crosshair.setVisible(false);
      }
      SoundManager.getInstance().stopBGM();

      if (typeof this.player.triggerDeath === 'function') {
        this.player.triggerDeath(hitX);
      }
      CombatFX.spawnPlayerDeathSequence(this, this.player);

      if (this.hud && this.grid) {
        const room = this.cameraManager?.getCurrentRoom() ?? {
          gridX: Math.max(0, Math.min(3, Math.floor(this.player.x / GAME_CONSTANTS.VIEW_WIDTH_PX))),
          gridY: Math.max(0, Math.min(3, Math.floor(this.player.y / GAME_CONSTANTS.VIEW_HEIGHT_PX))),
        };
        this.hud.update(this.player, this.grid, room.gridX, room.gridY, this.boss, this.infiniteLives, this.score);
      }

      const currentHigh = ScoreManager.getHighScore();
      const payload = {
        victory: false,
        score: this.score,
        highScore: currentHigh,
        isNewHighScore: false,
      };

      if (this.time && typeof this.time.delayedCall === 'function') {
        this.time.delayedCall(700, () => {
          if (this.cameras?.main && typeof this.cameras.main.fadeOut === 'function') {
            this.cameras.main.fadeOut(500, 7, 9, 20);
          }
        });
        this.time.delayedCall(1200, () => {
          this.scene.start('GameOverScene', payload);
        });
      } else {
        this.scene.start('GameOverScene', payload);
      }
      return;
    }

    // Non-fatal hit feedback
    CombatFX.applyHitFlash(this.player, 120);
    CombatFX.triggerScreenShake(this, 120, 0.006);
    if (this.impactFXPool && typeof this.impactFXPool.spawn === 'function') {
      this.impactFXPool.spawn(hitX ?? this.player.x, hitY ?? this.player.y);
    }
    SoundManager.getInstance().playSfx('explosion');
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) {
      if (this.player && this.player.isDead && typeof this.player.updateDeath === 'function') {
        this.player.updateDeath(delta);
      }
      return;
    }

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
      const input = this.controls.getInputState(this.cameras?.main);
      this.player.updatePlayer(input, delta, this.projectilePool, this.tilemapResult?.groundLayer);

      if (this.crosshair && typeof this.crosshair.setPosition === 'function') {
        const cx = input.mouseX ?? this.input?.activePointer?.worldX ?? this.player.x;
        const cy = input.mouseY ?? this.input?.activePointer?.worldY ?? this.player.y;
        this.crosshair.setPosition(cx, cy);
      }
    } else if (this.crosshair && this.input?.activePointer && typeof this.crosshair.setPosition === 'function') {
      const pointer = this.input.activePointer;
      const worldPoint = (this.cameras?.main && typeof this.cameras.main.getWorldPoint === 'function')
        ? this.cameras.main.getWorldPoint(pointer.x, pointer.y, this.tempWorldPoint as any)
        : { x: pointer.worldX ?? pointer.x ?? 0, y: pointer.worldY ?? pointer.y ?? 0 };
      this.crosshair.setPosition(worldPoint.x, worldPoint.y);
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
        currentGridX = Math.max(0, Math.min(3, Math.floor(this.player.x / GAME_CONSTANTS.VIEW_WIDTH_PX)));
        currentGridY = Math.max(0, Math.min(3, Math.floor(this.player.y / GAME_CONSTANTS.VIEW_HEIGHT_PX)));
      }
    }

    if (this.cameraManager) {
      if (currentGridX !== this.lastCullGridX || currentGridY !== this.lastCullGridY) {
        this.cullEntities(currentGridX, currentGridY);
      }
    }

    // 3.5. Update parallax background scroll position
    if (this.parallaxBg && this.cameras?.main) {
      this.parallaxBg.tilePositionX = (this.cameras.main.scrollX || 0) * 0.15;
      this.parallaxBg.tilePositionY = (this.cameras.main.scrollY || 0) * 0.10;
    }

    // 4. Boss Room Trigger only in designated BOSS room cell
    if (!this.bossTriggered && this.grid && this.grid[currentGridY] && this.grid[currentGridY][currentGridX]?.type === 'BOSS') {
      this.triggerBossEncounter(currentGridX, currentGridY);
    }

    // 5. Update Projectile Pool
    if (this.projectilePool) {
      const bounds = this.cameraManager?.getActiveBounds();
      this.projectilePool.update(time, delta, bounds, this.tilemapResult?.groundLayer);
    }

    // 6. Update Active Pickup Capsules & Clean Dead Capsules
    for (let i = this.activePickupCapsules.length - 1; i >= 0; i--) {
      const capsule = this.activePickupCapsules[i];
      if (capsule.active) {
        capsule.updateCapsule(time, delta);
      }
    }
    for (let i = this.pickupCapsules.length - 1; i >= 0; i--) {
      const capsule = this.pickupCapsules[i];
      if (capsule.hp <= 0 || capsule.x < -50 || capsule.x > GAME_CONSTANTS.WORLD_WIDTH_PX + 100) {
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

    // 8. Collisions & Overlaps handling
    this.handleCollisions();

    // 9. Update HUD
    if (this.hud && this.player && this.grid) {
      this.hud.update(this.player, this.grid, currentGridX, currentGridY, this.boss, this.infiniteLives, this.score);
    }
  }

  public cullEntities(gridX: number, gridY: number): void {
    if (this.cameraManager) {
      this.activeEnemies = this.cameraManager.cullEnemies(this.enemies, this.activeEnemies);
    } else {
      this.activeEnemies = [...this.enemies];
    }
    this.activePickupCapsules = this.cullCapsules(this.pickupCapsules, gridX, gridY, this.activePickupCapsules);
    this.lastCullGridX = gridX;
    this.lastCullGridY = gridY;
    this.updateRoomLockdown(gridX, gridY);
  }

  public cullCapsules(
    capsules: PickupCapsule[],
    gridX: number,
    gridY: number,
    outArray?: PickupCapsule[]
  ): PickupCapsule[] {
    const activeCapsules = outArray || [];
    activeCapsules.length = 0;

    for (let i = 0; i < capsules.length; i++) {
      const capsule = capsules[i];
      if (!capsule.active && capsule.hp <= 0) continue;

      const capsuleGridX = Math.floor(capsule.x / GAME_CONSTANTS.VIEW_WIDTH_PX);
      const capsuleGridY = Math.floor(capsule.y / GAME_CONSTANTS.VIEW_HEIGHT_PX);
      const isActiveRoom = capsuleGridX === gridX && capsuleGridY === gridY;

      capsule.setActive(isActiveRoom);
      capsule.setVisible(isActiveRoom);
      if (capsule.body) {
        capsule.body.enable = isActiveRoom;
      }
      if (isActiveRoom) {
        activeCapsules.push(capsule);
      }
    }
    return activeCapsules;
  }

  public updateRoomLockdown(gridX: number, gridY: number): void {
    if (!this.grid || !this.grid[gridY] || !this.grid[gridY][gridX]) {
      return;
    }

    const cell = this.grid[gridY][gridX];
    const cleared = isRoomCleared(this.enemies, gridX, gridY);

    if (cleared) {
      this.isRoomLockdownActive = false;
      for (let i = 0; i < this.roomBarriers.length; i++) {
        const b = this.roomBarriers[i];
        if (typeof b.setActive === 'function') b.setActive(false);
        if (typeof b.setVisible === 'function') b.setVisible(false);
        if (b.body) b.body.enable = false;
      }
      return;
    }

    this.isRoomLockdownActive = true;
    const configs = getRoomDoorBarriers(gridX, gridY, cell.doors);

    for (let i = 0; i < this.roomBarriers.length; i++) {
      const barrier = this.roomBarriers[i];
      if (i < configs.length) {
        const cfg = configs[i];
        if (typeof barrier.setPosition === 'function') {
          barrier.setPosition(cfg.x, cfg.y);
        }
        if (typeof barrier.setDisplaySize === 'function') {
          barrier.setDisplaySize(cfg.width, cfg.height);
        }
        if (typeof barrier.setActive === 'function') {
          barrier.setActive(true);
        }
        if (typeof barrier.setVisible === 'function') {
          barrier.setVisible(true);
        }
        if (barrier.body) {
          barrier.body.enable = true;
          if (typeof barrier.body.setSize === 'function') {
            barrier.body.setSize(cfg.width, cfg.height);
          }
          if (typeof barrier.body.reset === 'function') {
            barrier.body.reset(cfg.x, cfg.y);
          }
        }
      } else {
        if (typeof barrier.setActive === 'function') barrier.setActive(false);
        if (typeof barrier.setVisible === 'function') barrier.setVisible(false);
        if (barrier.body) barrier.body.enable = false;
      }
    }

    if (this.player) {
      const clamped = clampPlayerInsideRoom(this.player.x, this.player.y, gridX, gridY);
      if (this.player.x !== clamped.x || this.player.y !== clamped.y) {
        this.player.setPosition(clamped.x, clamped.y);
        if (this.player.body && typeof this.player.body.reset === 'function') {
          this.player.body.reset(clamped.x, clamped.y);
        }
      }
    }
  }

  public unlockRoomBarriers(): void {
    if (!this.isRoomLockdownActive && this.roomBarriers.every((b) => !b.active)) {
      return;
    }
    this.isRoomLockdownActive = false;
    for (let i = 0; i < this.roomBarriers.length; i++) {
      const b = this.roomBarriers[i];
      if (typeof b.setActive === 'function') b.setActive(false);
      if (typeof b.setVisible === 'function') b.setVisible(false);
      if (b.body) b.body.enable = false;
    }
    SoundManager.getInstance().playSfx('pickup');
  }

  public unlockExitPortal(): void {
    this.isPortalUnlocked = true;
    for (let i = 0; i < this.exitDoors.length; i++) {
      const door = this.exitDoors[i];
      if (typeof door.clearTint === 'function') door.clearTint();
      if (typeof door.setTint === 'function') door.setTint(0x00ff88);
      if (typeof door.setAlpha === 'function') door.setAlpha(1.0);
    }
    if (this.exitDoor && !this.exitDoors.includes(this.exitDoor)) {
      if (typeof this.exitDoor.clearTint === 'function') this.exitDoor.clearTint();
      if (typeof this.exitDoor.setTint === 'function') this.exitDoor.setTint(0x00ff88);
      if (typeof this.exitDoor.setAlpha === 'function') this.exitDoor.setAlpha(1.0);
    }
    if (this.exitPortalText) {
      if (typeof this.exitPortalText.setText === 'function') {
        this.exitPortalText.setText('EXIT PORTAL');
      }
      if (typeof this.exitPortalText.setColor === 'function') {
        this.exitPortalText.setColor('#00ff88');
      }
    }
    SoundManager.getInstance().playSfx('pickup');
  }

  private triggerVictory(): void {
    if (this.isVictory) return;
    this.isVictory = true;
    this.isGameOver = true;
    if (this.input && typeof this.input.setDefaultCursor === 'function') {
      this.input.setDefaultCursor('default');
    }
    const result = ScoreManager.saveHighScore(this.score);
    const payload = {
      victory: true,
      score: this.score,
      highScore: result.highScore,
      isNewHighScore: result.isNewRecord,
    };
    if (this.time && typeof this.time.delayedCall === 'function') {
      if (this.cameras?.main && typeof this.cameras.main.fadeOut === 'function') {
        this.cameras.main.fadeOut(450, 7, 9, 20);
      }
      this.time.delayedCall(500, () => {
        this.scene.start('GameOverScene', payload);
      });
    } else {
      this.scene.start('GameOverScene', payload);
    }
  }

  private checkOverlap(
    a: { x: number; y: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number; body?: any },
    b: { x: number; y: number; width?: number; height?: number; displayWidth?: number; displayHeight?: number; body?: any },
    padding: number = 4
  ): boolean {
    let cx1 = a.x, cy1 = a.y, w1 = 16, h1 = 16;
    if (a.body && typeof a.body.x === 'number') {
      w1 = a.body.width || 16;
      h1 = a.body.height || 16;
      cx1 = a.body.x + w1 * 0.5;
      cy1 = a.body.y + h1 * 0.5;
    } else {
      w1 = a.displayWidth || a.width || 16;
      h1 = a.displayHeight || a.height || 16;
    }

    let cx2 = b.x, cy2 = b.y, w2 = 16, h2 = 16;
    if (b.body && typeof b.body.x === 'number') {
      w2 = b.body.width || 16;
      h2 = b.body.height || 16;
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

        // Bullets detonate on active energy barriers
        if (this.isRoomLockdownActive) {
          let hitBarrier = false;
          for (let b = 0; b < this.roomBarriers.length; b++) {
            const barrier = this.roomBarriers[b];
            if (barrier.active && this.checkOverlap(proj, barrier, 2)) {
              if (this.impactFXPool && typeof this.impactFXPool.spawn === 'function') {
                this.impactFXPool.spawn(proj.x, proj.y);
              }
              proj.deactivate();
              hitBarrier = true;
              break;
            }
          }
          if (hitBarrier || !proj.active) continue;
        }

        if (proj.isPlayerBullet) {
          // Player bullet vs Enemies
          for (let e = 0; e < this.activeEnemies.length; e++) {
            const enemy = this.activeEnemies[e];
            if (enemy.isAlive && enemy.active) {
              if (typeof proj.hasHitTarget === 'function' && proj.hasHitTarget(enemy)) {
                continue;
              }
              if (this.checkOverlap(proj, enemy, 4)) {
                if (typeof proj.recordTargetHit === 'function') {
                  proj.recordTargetHit(enemy);
                }
                const killed = enemy.takeDamage(proj.damage);
                if (!proj.piercing) {
                  proj.deactivate();
                }

                if (killed) {
                  this.score += enemy.scoreValue;
                  if (enemy === this.boss) {
                    this.unlockExitPortal();
                  }
                  const currentRoom = this.cameraManager?.getCurrentRoom() ?? {
                    gridX: Math.max(0, Math.min(3, Math.floor(this.player.x / GAME_CONSTANTS.VIEW_WIDTH_PX))),
                    gridY: Math.max(0, Math.min(3, Math.floor(this.player.y / GAME_CONSTANTS.VIEW_HEIGHT_PX))),
                  };
                  if (isRoomCleared(this.enemies, currentRoom.gridX, currentRoom.gridY)) {
                    this.unlockRoomBarriers();
                  }
                  // Regular enemies drop nothing
                }
                if (!proj.piercing) {
                  break;
                }
              }
            }
          }

          if (!proj.active) continue;

          // Player bullet vs Pickup Capsules (only active capsules in current room)
          for (let c = this.activePickupCapsules.length - 1; c >= 0; c--) {
            const capsule = this.activePickupCapsules[c];
            if (!capsule.active) continue;
            if (typeof proj.hasHitTarget === 'function' && proj.hasHitTarget(capsule)) {
              continue;
            }
            if (this.checkOverlap(proj, capsule, 4)) {
              if (typeof proj.recordTargetHit === 'function') {
                proj.recordTargetHit(capsule);
              }
              const droppedItem = capsule.hit();
              if (!proj.piercing) {
                proj.deactivate();
              }
              if (droppedItem) {
                this.pickupItems.push(droppedItem);
                if (this.pickupItemGroup) {
                  this.pickupItemGroup.add(droppedItem);
                }
              }
              if (!proj.piercing) {
                break;
              }
            }
          }
        } else {
          // Enemy bullet vs Player
          if (this.player && this.invulnerableTimer <= 0) {
            if (this.checkOverlap(proj, this.player, 2)) {
              const hitX = proj.x;
              const hitY = proj.y;
              proj.deactivate();
              this.handlePlayerDamage(hitX, hitY);
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
            this.handlePlayerDamage(enemy.x, enemy.y);
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
        this.score += POWERUP_SCORE_VALUE;
        this.pickupItems.splice(i, 1);
        if (typeof item.destroy === 'function') {
          item.destroy();
        }
      }
    }

    // D. Player vs Level Exit Doors / Portals (requires unlocked portal)
    if (this.isPortalUnlocked) {
      for (let i = 0; i < this.exitDoors.length; i++) {
        const door = this.exitDoors[i];
        if (this.checkOverlap(this.player, door, 8)) {
          this.triggerVictory();
          break;
        }
      }
    }
  }
}



