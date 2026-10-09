<p align="center">
  <img src="public/assets/ui/logo.png" alt="Flex Commando: Rogue Beef" width="480" />
</p>

<p align="center">
  <strong>A procedurally generated 2D retro run-and-gun action platformer inspired by <em>Contra</em>, built in Phaser 3 &amp; TypeScript.</strong>
</p>

<p align="center">
  <a href="https://github.com/BuneZT/flex-commando/actions/workflows/deploy.yml"><img src="https://github.com/BuneZT/flex-commando/actions/workflows/deploy.yml/badge.svg" alt="Deploy to GitHub Pages" /></a>
</p>

<p align="center">
  🎮 <strong><a href="https://bunezt.github.io/flex-commando/">Play Live in Browser</a></strong>
</p>

---

<p align="center">
  <img src="docs/assets/enemy_showcase_art.jpg" alt="Flex Commando Showcase Art" width="100%" />
</p>

---

## 🕹️ Game Overview

Step into the combat boots of an unstoppable action commando armed with an arsenal of sci-fi weaponry. Fight your way through a procedurally generated 4×4 cyber fortress, battle robotic commandos and aerial drones, and destroy the Level Exit Guardian Mech!

### Key Features
* **16-Bit Cyber-Arcade Aesthetics**: Authentic pixel-art sprites, glowing neon projectiles, animated tank-tread bosses, and dual-layer parallax cyber hangar backdrops.
* **Procedural 4×4 Room Matrix Engine**: Every run generates a unique level layout with a guaranteed critical route from entrance `(0, y)` to the Boss chamber `(3, y)` plus hazard/reward branches.
* **Smooth 360-Degree Mouse Aiming**: In-game crosshair reticle tracking mouse cursor with responsive auto-fire.
* **Weapon Upgrades & Recyclable Bullet Pool**:
  * **[Default] Pea-Shooter**: Starting rapid-fire golden energy darts.
  * **[S] Spread Shot**: 5-pellet wide fan spray (`[-30°, -15°, 0°, +15°, +30°]`).
  * **[L] Laser Beam**: Piercing high-velocity electric beam cutting through hordes.
  * **[M] Machine Gun**: Continuous high rate-of-fire bullet stream.
  * **[F] Flame Thrower**: Sinusoidal oscillating plasma fireball that burns and pierces.
  * **[B] Barrier Shield**: Protective energy bubble absorbing up to 3 enemy hits.
* **5 Hostile Enemy Archetypes**:
  * **Trooper**: Ground commando runner vaulting over obstacles to pursue you.
  * **Wall Turret**: Ceiling/wall rail defense battery with 360° tracking and muzzle flash.
  * **Falcon Drone**: Aerial drone swooping in sine-wave flight patterns.
  * **Jumper Mercenary**: Cyber soldier using rocket-boosted leaping ambushes.
  * **Level Boss (Mech Guardian)**: 2-phase war mech with moving treads, shoulder artillery, and enraged spread volleys.
* **Retro Arcade HUD & Minimap**: Real-time lives counter (`❤❤❤`), health bar, active weapon badge, shield hit counter, and dynamic 4×4 minimap.

---

## 🎮 How to Play & Controls

### Objective & Win Conditions
* **Primary Objective**: Infiltrate the fortress, enter the final Boss Room (Column 3), and defeat the 50 HP Level Exit Guardian Mech.
* **Alternative Win Conditions**:
  * Step directly through the glowing green **Exit Portal** in the boss chamber.
  * Achieve **Total Annihilation** by defeating every hostile enemy across all rooms.
* **Game Over**: You start with 3 lives. Taking hits without a barrier shield deducts 1 life and triggers brief invulnerability frames. Depleting all lives results in permadeath!

### Controls

| Action | Controls |
|---|---|
| **Move Left / Right** | `A` / `D` or `Left` / `Right` Arrow Keys |
| **Aim Weapon** | **Mouse Cursor** (360° Reticle) |
| **Fire Weapon** | **Left Mouse Button** (Hold for auto-fire) |
| **Jump** | `Space` bar |
| **Crouch** | `S` or `Down` Arrow |
| **Drop Through Platform** | `S` + `Space` or `Down` + `Space` |
| **Toggle Audio Mute** | `M` Key |
| **Infinite Lives (Dev)** | `I` Key on Main Menu |
| **Restart Game** | `Space` bar on Game Over / Victory |

---

## 🛠️ Development & Building

### Requirements
- [Node.js](https://nodejs.org/) v18 or v20
- npm v9+

### Commands
```bash
# Install dependencies
npm install

# Start local dev server with HMR
npm run dev

# Regenerate pixel-art PNG assets
npm run generate:assets

# Run automated unit test suite (100% green headless tests)
npm test

# Build production bundle
npm run build
```

---

## 📚 Documentation & Manual

- [**Game Manual & Architecture Guide**](docs/GAME_MANUAL.md) — Complete specifications for enemies, weapons, algorithms, and rendering architecture.
- [`AGENTS.md`](AGENTS.md) — Architectural boundaries and coding guidelines for AI agents.
