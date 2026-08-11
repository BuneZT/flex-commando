import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Boss } from '../entities/enemies/Boss';
import { GridCell } from '../core/GridGenerator';

export function formatHUDLives(lives: number): string {
  if (lives <= 0) return 'DEAD';
  return '❤'.repeat(lives);
}

export class HUD {
  private scene: Phaser.Scene;
  private livesText: Phaser.GameObjects.Text;
  private weaponText: Phaser.GameObjects.Text;
  private bossHpText: Phaser.GameObjects.Text;
  private minimapGraphics: Phaser.GameObjects.Graphics;

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

  public update(
    player: Player,
    grid: GridCell[][],
    currentGridX: number,
    currentGridY: number,
    boss?: Boss | null
  ): void {
    // 1. Update Lives
    this.livesText.setText(`LIVES: ${formatHUDLives(player.lives)}`);

    // 2. Update Weapon & Shield info
    let weaponStr = `WEAPON: ${player.currentWeapon}`;
    if (player.isBarrierActive) {
      weaponStr += ` [SHIELD:${player.barrierHits}]`;
    }
    this.weaponText.setText(weaponStr);

    // 3. Update Boss HP
    if (boss && boss.isAlive) {
      const pct = Math.max(0, Math.ceil((boss.health / boss.maxHealth) * 100));
      const barLen = 10;
      const filled = Math.max(0, Math.min(barLen, Math.ceil((boss.health / boss.maxHealth) * barLen)));
      const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
      this.bossHpText.setText(`BOSS HP: [${bar}] ${boss.health}/${boss.maxHealth} (${pct}%)`);
      this.bossHpText.setVisible(true);
    } else {
      this.bossHpText.setVisible(false);
    }

    // 4. Render 4x4 minimap grid
    this.renderMinimap(grid, currentGridX, currentGridY);
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
