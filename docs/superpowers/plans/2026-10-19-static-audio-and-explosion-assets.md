# Static Audio & Explosion Assets Implementation Plan

Migrate all runtime procedural sound effects and the explosion visual effect to static assets in `public/assets/`, eliminating real-time Web Audio allocation and Garbage Collector pressure during gameplay.

## Proposed Changes

### Assets
- `public/assets/vfx/explosion.png`: 80x20 spritesheet (4 frames of 20x20).
- `public/assets/audio/`: Pre-rendered `.ogg` and `.mp3` files for:
  - `sfx_shoot_pea`
  - `sfx_shoot_spread`
  - `sfx_shoot_laser`
  - `sfx_shoot_flame`
  - `sfx_shoot_machinegun`
  - `sfx_shoot_enemy`
  - `sfx_pickup`
  - `sfx_explosion`

### Scripts
- `scripts/generate-pixel-assets.mjs`: Add `generateExplosion()` to the generator script and registry.

### Engine & Codebase
- `src/scenes/BootScene.ts`: Preload `tex_explosion` spritesheet and the 8 dual-format SFX audio assets.
- `src/core/SoundManager.ts`: Refactor to play pre-cached Phaser sounds with zero real-time audio node instantiation. Maintain headless Vitest test compatibility.
- `src/core/CombatFX.ts`: Trigger `SoundManager.getInstance().playSfx('explosion')` when death explosion spawns.
- `src/core/TextureFactory.ts`: Ensure `createExplosionTexture` skips when `tex_explosion` already exists.

### Verification
- `tests/assets-integrity.test.ts`: Verify `explosion.png` and all `.ogg` / `.mp3` SFX files exist with valid headers and non-zero sizes.
- `tests/sound-manager.test.ts`: Test updated sound playback methods.
- Full test suite: `npm test`, typecheck: `npx tsc --noEmit`.

## Tasks

1. **Asset Generation (Explosion)**:
   - Add explosion pixel renderer to `scripts/generate-pixel-assets.mjs`.
   - Run generator to produce `public/assets/vfx/explosion.png`.
2. **Audio Assets Integration**:
   - Extract and place curated CC0 retro SFX into `public/assets/audio/`.
3. **BootScene & TextureFactory Updates**:
   - Preload `tex_explosion` and SFX audio in `src/scenes/BootScene.ts`.
   - Update `TextureFactory.ts` fallback guards.
4. **SoundManager & CombatFX Refactor**:
   - Update `SoundManager.ts` to play cached audio without Web Audio node allocations.
   - Wire `sfx_explosion` in `CombatFX.ts`.
5. **Testing & Integrity**:
   - Update `tests/assets-integrity.test.ts` and `tests/sound-manager.test.ts`.
   - Run `npm test` and verify 100% test pass.
