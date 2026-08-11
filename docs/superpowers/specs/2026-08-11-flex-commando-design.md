# Flex Commando: Rogue Beef — Design Specification

**Date:** 2026-08-11  
**Project:** `flex-commando`  
**Tech Stack:** TypeScript + Vite + Phaser 3 (Arcade Physics)  
**Target:** Web / Desktop Browsers  

---

## 1. Overview & Concept

*Flex Commando: Rogue Beef* is a tongue-in-cheek 2D retro action run-and-gun platformer heavily inspired by *Contra*, featuring procedural multi-directional grid level layouts (similar to *Spelunky* / *Rogue Legacy*).

Players take control of an over-the-top 80s action hero fighting through procedurally assembled room grids filled with hostile troopers, turrets, flying drones, and boss threats.

---

## 2. Core Game Loop & Gameplay Mechanics

### 2.1 Controls & Aiming
* **Keyboard-Only Arcade Layout**:
  * **Movement & Aiming**: `WASD` or Arrow Keys (Left, Right, Aim Up, Aim Down / Crouch).
  * **Jump**: `Space` bar (Hold for height variance; press Down + `Space` to drop through one-way platforms).
  * **Shoot**: `X` or `J` key (Hold for continuous auto-fire).
* **8-Directional Aiming State Machine**:
  * Neutral Ground / Running: Forward, Up, Diagonal Up-Forward.
  * Air Mobility: Downwards, Diagonal Down-Forward, Upwards, Forward.
  * Low Profile: Crouching floor shot.

### 2.2 Health, Lives & Respawn
* **Arcade Lives**: Start each run with 3 Lives.
* **Health Points**: 3 HP per life.
* **Respawn**: Dying respawns the hero at the entry door threshold of the current room.
* **Permadeath**: Losing all lives resets the run and displays the Game Over summary screen.

---

## 3. Procedural Level Generation & Architecture

### 3.1 Grid Matrix Layout
* Levels are constructed on a **4x4 cell matrix** (16 potential room locations per level).
* **Start Room**: Spawned randomly on column 0 (`(0, randY)`).
* **Boss / Exit Room**: Placed at column 3 (`(3, randY)`).
* **Critical Path**: Generated using a Random Walk algorithm with backtrack prevention to guarantee a continuous, traversable route from Start to Boss.
* **Branch Rooms**: Optional side rooms spawned off the critical path containing extra weapon pickups, health drops, or elite enemy challenges.

### 3.2 Modular Room Templates
* Each room cell requires specific entrance/exit doorways (`North`, `South`, `East`, `West`).
* **Tile Dimensions**: Standard 16x16px retro pixel tiles.
* **Room Scale**: 20 tiles wide × 15 tiles high (Viewport size: 320x240 pixels).
* **Template Categories**:
  * `START_E`, `START_N`, `START_S`
  * `CORRIDOR_EW`, `SHAFT_NS`
  * `CORNER_NE`, `CORNER_NW`, `CORNER_SE`, `CORNER_SW`
  * `JUNCTION_3WAY`, `CROSS_4WAY`
  * `DEADEND_W`, `DEADEND_E`, `DEADEND_N`, `DEADEND_S`
  * `BOSS_ROOM`

### 3.3 Active Room Camera & Physics Management
* Smooth camera pan transitions when crossing doorway thresholds.
* Inactive off-screen rooms pause physics updates and AI scripts to optimize performance.

---

## 4. Weapons & Power-ups

### 4.1 Weapon Types
1. **Pea-Shooter (Default)**: Single-bullet burst, infinite ammunition.
2. **[S] Spread Shot**: 5-pellet wide arc spray; iconic high-damage crowd control.
3. **[L] Laser Beam**: High-velocity piercing energy beam damaging all enemies in line of sight.
4. **[M] Machine Gun**: Rapid-fire continuous stream of heavy bullets.
5. **[F] Flame Thrower**: Spiraling, expanding fire orb pattern.
6. **[B] Barrier Drone**: Temporary invincibility shield absorbing 3 incoming hits.

### 4.2 Spawning Mechanics
* Red/Blue flying falcon capsules hover across rooms. Shooting a capsule drops a floating letter icon matching the power-up (`S`, `L`, `M`, `F`, `B`).

---

## 5. Enemy Archetypes

1. **Trooper (Ground Swarm)**: Patrols platforms, shoots forward, jumps over obstacles.
2. **Wall Turret (Stationary)**: Rotates 360 degrees, aiming and firing single shots towards player position.
3. **Jumper Mercenary**: Continuously hops between platform tiers while firing downwards.
4. **Falcon Drone (Aerial)**: Flies in sinusoidal wave patterns dropping gravity bombs.
5. **Level Boss (Grid Exit Guardian)**: Multi-phase boss anchored in the final room.

---

## 6. Software Architecture & Scene Graph

```
src/
├── config/           # Game balance parameters, keybindings, collision masks
├── core/             # Grid Generator, Template Matcher, Tilemap Stitcher
├── entities/         # Player, BaseEnemy, ProjectilePool, Pickups
├── scenes/           # BootScene, MainMenuScene, GameScene, GameOverScene
└── ui/               # HUD (Lives, HP, Weapon icon, Minimap grid)
```

---

## 7. GitHub Repository & Ticket Breakdown

Repository: `https://github.com/BuneZT/flex-commando`

* **Ticket 1**: Scaffolding & CI Setup — Vite + TypeScript + Phaser 3 configuration, main scene stubs.
* **Ticket 2**: Player Controller & 8-Way Aiming — Platformer physics, Space bar jump, crouching, drop-through platform mechanics.
* **Ticket 3**: Procedural Room Grid Engine — 4x4 room matrix algorithm, critical path finder, door mask matcher.
* **Ticket 4**: Tilemap Renderer & Camera Switcher — Active room rendering, seamless camera transitions, room minimap.
* **Ticket 5**: Weapon System & Projectiles — Projectile pooling, Spread Shot, Laser, Machine Gun, flying pickup capsules.
* **Ticket 6**: Enemy Archetypes & AI — Trooper, Wall Turret, Jumper Mercenary, Flying Falcon Drone.
* **Ticket 7**: HUD, Game Loop & Boss Encounters — Health/Lives HUD, Boss room mechanics, victory & permadeath screens.
