# Infinite Lives Dev Option - Design Spec

## Overview
Adds a developer-only option to start the game with infinite lives for testing purposes. This option is only available when running on a local development server (`localhost`, `127.0.0.1`, or `import.meta.env.DEV`).

## User Flow
1. User launches the game locally via `npm run dev`.
2. On `MainMenuScene` or `GameOverScene`, the UI displays:
   - `PRESS SPACE TO START` (Normal mode)
   - `PRESS I FOR INFINITE LIVES` (Dev mode only)
3. If the game is loaded in a non-dev environment (e.g. production build hosted remotely), the `PRESS I FOR INFINITE LIVES` text and `I` key binding are not rendered/registered.
4. Pressing `I` starts `GameScene` with `{ infiniteLives: true }`.
5. In `GameScene`:
   - Taking damage triggers normal invulnerability flashing frames (1.5s i-frames) and hit reaction, but `lives` is not decremented.
   - HUD displays `LIVES: ∞`.

## System Components

### 1. Environment Detection (`src/config/Environment.ts`)
Creates a utility function `isDevEnvironment()`:
- Checks `import.meta.env?.DEV === true` (automatically set when starting the Vite dev server with `npm run dev`).
- Returns `true` if running under the Vite dev server, `false` in production builds.

### 2. Scene Initialization & Logic (`src/scenes/GameScene.ts`)
- Defines `export interface GameSceneInitData { infiniteLives?: boolean; }`.
- Property `public infiniteLives: boolean = false;`.
- Implements `init(data?: GameSceneInitData)` to set `this.infiniteLives = !!data?.infiniteLives;`.
- In `handlePlayerDamage()`:
  - If `this.infiniteLives` is `true`, skip `this.player.lives -= 1` and skip game over triggers. Keep invulnerability timer `invulnerableTimer = 1500` to allow testing hit reaction visuals.

### 3. HUD Component (`src/ui/HUD.ts`)
- Updates `formatHUDLives(lives: number, infiniteLives?: boolean)`:
  - If `infiniteLives` is `true`, return `'∞'`.
  - Otherwise return `'❤'.repeat(lives)` or `'DEAD'`.
- In `HUD.update(...)`, passes `player.lives` and `scene.infiniteLives` to `formatHUDLives`.

### 4. Main Menu & Game Over Scenes (`src/scenes/MainMenuScene.ts`, `src/scenes/GameOverScene.ts`)
- In `MainMenuScene.create()`:
  - Space key starts `GameScene` with `{ infiniteLives: false }`.
  - If `isDevEnvironment()`:
    - Display yellow prompt text: `PRESS I FOR INFINITE LIVES`.
    - Register `keydown-I` listener to start `GameScene` with `{ infiniteLives: true }`.
- In `GameOverScene.create()`:
  - Space key restarts `GameScene` with `{ infiniteLives: false }`.
  - If `isDevEnvironment()`:
    - Display subtext: `PRESS I FOR INFINITE LIVES`.
    - Register `keydown-I` listener to start `GameScene` with `{ infiniteLives: true }`.

## Testing Strategy
- Unit tests in `tests/` to verify `formatHUDLives` returns `'∞'` when `infiniteLives` is `true`.
- Tests for `GameScene` initialization handling `infiniteLives` parameter.
- Verification via running `npm run test` or `npm run dev`.
