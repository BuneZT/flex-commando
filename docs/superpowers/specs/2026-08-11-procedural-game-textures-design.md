# Procedural Game Textures & Animations Design

## Goal
Fix missing entity visuals in *Flex-Commando* by generating distinct procedural pixel-art textures and multi-frame animations at boot time using Phaser 3 `Graphics`. This replaces default blank/missing textures for the player, enemies, bullets, and pickup capsules with clear, distinct visual assets.

## 1. Architecture & `TextureFactory`
A centralized utility `TextureFactory` located at `src/core/TextureFactory.ts` will generate all procedural textures during `BootScene` execution.

### Texture Keys & Specs
- `tex_player`: 16x24 per frame (5 frames total: Idle, Run 1, Run 2, Crouch, Jump).
- `tex_enemy_trooper`: 16x24 per frame (2 frames: Run 1, Run 2).
- `tex_enemy_turret`: 24x24 static turret base with sensor eye and gun barrel.
- `tex_enemy_drone`: 16x16 per frame (2 frames: Wing up, Wing down).
- `tex_enemy_jumper`: 16x24 per frame (2 frames: Stand, Leap).
- `tex_enemy_boss`: 64x48 heavy mech wall core with cannons.
- `tex_bullet_pea`: 6x6 yellow projectile.
- `tex_bullet_spread`: 8x8 cyan diamond pellet.
- `tex_bullet_laser`: 24x6 blue energy beam.
- `tex_bullet_flame`: 14x14 orange flame particle.
- `tex_bullet_enemy`: 8x8 red plasma orb.
- `tex_capsule_flying`: 16x16 per frame (2 frames: Spin A, Spin B).
- `tex_pickup_S`, `tex_pickup_L`, `tex_pickup_F`, `tex_pickup_M`, `tex_pickup_B`: 16x16 color-coded lettered badges.

### Animations Registered
- `player_idle` (Frame 0)
- `player_run` (Frames 1-2, 8 FPS, loop)
- `player_crouch` (Frame 3)
- `player_jump` (Frame 4)
- `trooper_run` (Frames 0-1, 6 FPS, loop)
- `drone_fly` (Frames 0-1, 10 FPS, loop)
- `capsule_spin` (Frames 0-1, 6 FPS, loop)

## 2. Visual Descriptions & Color Palette
- **Player:** Blue armor/pants, tan skin tone, red headband, silver weapon.
- **Trooper:** Red alien soldier uniform, black boots, dark visor.
- **Turret:** Dark steel gray body, red targeting lens, dark barrel.
- **Falcon Drone:** Yellow hull, cyan camera sensor, dual hovering thruster wings.
- **Jumper Mercenary:** Purple armor, green visor.
- **Boss:** Steel gray chassis, crimson glowing core, dark twin barrels.
- **Pickups:** Silver/red capsule; badges in Cyan (S), Blue (L), Orange (F), Yellow (M), Pink (B).

## 3. Code Integration
- **`BootScene.ts`:** Calls `TextureFactory.generateAllTextures(this)` in `create()`.
- **`Player.ts`:** Defaults to `'tex_player'`, updates animation state (`player_run`, `player_crouch`, `player_jump`, `player_idle`) and horizontal flip (`setFlipX`).
- **Enemy Classes (`Trooper.ts`, `FalconDrone.ts`, `Turret.ts`, `JumperMercenary.ts`, `Boss.ts`):** Pass respective texture keys and trigger movement animations.
- **`ProjectilePool.ts`:** Updates `fire()` to swap texture based on `weaponType` and `isPlayerBullet`.
- **`PickupCapsule.ts`:** Flying capsule plays `capsule_spin`, item drop displays weapon badge (`tex_pickup_*`).
