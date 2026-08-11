# Flex Commando: Rogue Beef 🎮💥 (WIP)

> A procedurally generated 2D retro run-and-gun action platformer inspired by *Contra*, built in Phaser 3 & TypeScript.

[![Deploy to GitHub Pages](https://github.com/BuneZT/flex-commando/actions/workflows/deploy.yml/badge.svg)](https://github.com/BuneZT/flex-commando/actions/workflows/deploy.yml)

🎮 **Play Live in Browser:** [https://bunezt.github.io/flex-commando/](https://bunezt.github.io/flex-commando/)

---

## 🕹️ Game Features

* **Procedural 4x4 Room Matrix Engine**: Every run generates a unique level layout with a guaranteed main path from the Start Room `(0, y)` to the Boss Room `(3, y)` plus optional side reward/hazard branches.
* **Classic 8-Directional Keyboard Aiming**: Full 8-way directional aiming state machine (Running Forward, Up, Diagonal Up, Diagonal Down, Air Downwards, and Crouching low profile).
* **Arcade Weapon Arsenal & Projectile Pooling**:
  * **[Default] Pea-Shooter**: Burst fire single bullets.
  * **[S] Spread Shot**: 5-pellet wide arc spray (`[-30°, -15°, 0°, 15°, 30°]`).
  * **[L] Laser Beam**: High-velocity piercing beam.
  * **[M] Machine Gun**: Continuous high rate-of-fire stream.
  * **[F] Flame Thrower**: Expanding spiraling fire orb pattern.
  * **[B] Barrier Shield**: Temporary invincibility bubble absorbing 3 hits.
* **4 Enemy AI Archetypes + Boss Encounter**:
  * **Trooper**: Ground runner/jumper tracking player coordinates.
  * **Wall Turret**: 360-degree rotating turret aiming directly at player.
  * **Falcon Drone**: Flying aerial drone moving in a sinusoidal wave pattern dropping items.
  * **Jumper Mercenary**: Platform hopping mercenary.
  * **Level Boss**: 2-phase boss guarding the exit grid cell.
* **Retro Arcade HUD & Minimap**: Real-time lives counter (`❤❤❤`), health bar, active weapon badge, shield hit indicator, and dynamic 4x4 room minimap overlay.

---

## 🎮 Controls

| Action | Key(s) |
|---|---|
| **Move Left / Right** | `A` / `D` or `Left` / `Right` Arrow Keys |
| **Aim Up / Down / Crouch** | `W` / `S` or `Up` / `Down` Arrow Keys |
| **Jump** | `Space` bar |
| **Drop Through Platform** | `S` + `Space` or `Down` + `Space` |
| **Shoot** | `X` or `J` key (Hold for auto-fire) |
| **Restart Game** | `Space` bar on Game Over / Victory screen |

---

## 🛠️ Development & Building

### Requirements
- [Node.js](https://nodejs.org/) v18 or v20
- npm v9+

### Setup Commands
```bash
# Install dependencies
npm install

# Start local dev server with HMR
npm run dev

# Run unit test suite (Vitest)
npm test

# Build production bundle
npm run build
```

---

## 📚 Specifications & Plans

Detailed design specifications and architectural implementation plans are available in:
- [`docs/superpowers/specs/2026-08-11-flex-commando-design.md`](file:///C:/Users/marci/Documents/game_dev/flex-commando/docs/superpowers/specs/2026-08-11-flex-commando-design.md)
- [`docs/superpowers/plans/2026-08-11-flex-commando-implementation.md`](file:///C:/Users/marci/Documents/game_dev/flex-commando/docs/superpowers/plans/2026-08-11-flex-commando-implementation.md)
- [`AGENTS.md`](file:///C:/Users/marci/Documents/game_dev/flex-commando/AGENTS.md) (Context guide for AI agents)
