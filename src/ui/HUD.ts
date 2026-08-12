import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Boss } from '../entities/enemies/Boss';
import { GridCell } from '../core/GridGenerator';

export function formatHUDLives(lives: number, infiniteLives?: boolean): string {
  if (infiniteLives) return '∞';
  if (lives <= 0) return 'DEAD';
  return '❤'.repeat(lives);
}

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

    // Top-left: Lives display
    this.livesText = this.scene.add.text(8, 6, 'LIVES: ❤❤❤', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ff4444',
    }).setScrollFactor(0).setDepth(100);

    // Top-left: Weapon display
    this.weaponText = this.scene.add.text(8, 16, 'WEAPON: PEA_SHOOTER', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#00ffff',
    }).setScrollFactor(0).setDepth(100);

    // Top-center: Boss HP text
    this.bossHpText = this.scene.add.text(160, 6, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ff0055',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // Top-right: Minimap graphics
    this.minimapGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(100);
  }

  private lastLives: number = -999;
  private lastWeapon: string = '';
  private lastBarrierHits: number = -1;
  private lastIsBarrierActive: boolean = false;

  public update(
    player: Player,
    grid: GridCell[][],
    currentGridX: number,
    currentGridY: number,
    boss?: Boss | null,
    infiniteLives?: boolean
  ): void {
    // 1. Update Lives
    if (player.lives !== this.lastLives) {
      const livesStr = `LIVES: ${formatHUDLives(player.lives, infiniteLives)}`;
      this.livesText.setText(livesStr);
      this.lastLives = player.lives;
    }

    // 2. Update Weapon & Shield info
    if (
      player.currentWeapon !== this.lastWeapon ||
      player.barrierHits !== this.lastBarrierHits ||
      player.isBarrierActive !== this.lastIsBarrierActive
    ) {
      let weaponStr = `WEAPON: ${player.currentWeapon}`;
      if (player.isBarrierActive) {
        weaponStr += ` [SHIELD:${player.barrierHits}]`;
      }
      this.weaponText.setText(weaponStr);
      this.lastWeapon = player.currentWeapon;
      this.lastBarrierHits = player.barrierHits;
      this.lastIsBarrierActive = player.isBarrierActive;
    }

    // 3. Update Boss HP
    let bossHpStr = '';
    if (boss && boss.isAlive) {
      const pct = Math.max(0, Math.ceil((boss.health / boss.maxHealth) * 100));
      const barLen = 10;
      const filled = Math.max(0, Math.min(barLen, Math.ceil((boss.health / boss.maxHealth) * barLen)));
      const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
      bossHpStr = `BOSS HP: [${bar}] ${boss.health}/${boss.maxHealth} (${pct}%)`;
    }

    if (bossHpStr !== this.lastBossHpStr) {
      if (bossHpStr !== '') {
        this.bossHpText.setText(bossHpStr);
        this.bossHpText.setVisible(true);
      } else {
        this.bossHpText.setVisible(false);
      }
      this.lastBossHpStr = bossHpStr;
    }

    // 4. Render 4x4 minimap grid
    if (currentGridX !== this.lastMinimapGridX || currentGridY !== this.lastMinimapGridY) {
      this.renderMinimap(grid, currentGridX, currentGridY);
      this.lastMinimapGridX = currentGridX;
      this.lastMinimapGridY = currentGridY;
    }
  }

  private renderMinimap(grid: GridCell[][], currentGridX: number, currentGridY: number): void {
    this.minimapGraphics.clear();
    const startX = 270;
    const startY = 6;
    const cellSize = 8;
    const gap = 1;

    // Draw background panel
    this.minimapGraphics.fillStyle(0x000000, 0.6);
    this.minimapGraphics.fillRect(
      startX - 2,
      startY - 2,
      4 * (cellSize + gap) + 3,
      4 * (cellSize + gap) + 3
    );

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = startX + c * (cellSize + gap);
        const y = startY + r * (cellSize + gap);

        const cell = grid[r] && grid[r][c];
        let color = 0x333333; // Default empty

        if (cell) {
          if (cell.type === 'START') color = 0x0088ff;
          else if (cell.type === 'BOSS') color = 0xff0044;
          else if (cell.type === 'PATH' || cell.type === 'BRANCH') color = 0x666666;
        }

        // Highlight player location
        if (c === currentGridX && r === currentGridY) {
          color = 0x00ff00;
        }

        this.minimapGraphics.fillStyle(color, 0.9);
        this.minimapGraphics.fillRect(x, y, cellSize, cellSize);

        // Active room border
        if (c === currentGridX && r === currentGridY) {
          this.minimapGraphics.lineStyle(1, 0xffffff, 1);
          this.minimapGraphics.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }
  }

  public destroy(): void {
    this.livesText.destroy();
    this.weaponText.destroy();
    this.bossHpText.destroy();
    this.minimapGraphics.destroy();
  }
}
