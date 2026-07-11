# AGENTS.md

Project guidance for AI agents working with this repository.

The Legend of Silicon Valley — a Zelda-style (SNES Link to the Past) top-down adventure game built with Three.js: a startup-themed overworld with buildings, NPCs, and a 10-level startup simulator. Frontend-only, no backend.

## Development Commands

- `npm run dev` — start Vite dev server (opens browser; default port 5173)
- `npm run start` — alias for `dev`
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built `dist/`

## Stack

- Three.js 0.150 (rendering)
- Vite 6 (dev server + bundler)
- Vanilla JavaScript, ES modules — no framework, no TypeScript

## Architecture

- `src/index.js` — entry point: loads analytics, shows loading screen, boots `Game`
- `src/game.js` — main game class / loop (largest module)
- `src/index.html` — HTML entry
- `src/components/` — gameplay systems: `player`, `camera`, `controls`, `world`, `enemies`, `Inventory`, `DialogueManager`, `SimulatorDialogue`, `StartupSimulator`, `ProgressionManager`, `PauseMenu`
- `src/utils/` — support modules: sprite/texture generation (`SpriteGenerator`, `TextureManager`, `NESPalette`), `AudioManager`, `collision`, `DialogueLoader`, `analytics` + `advancedAnalytics`, `helpers`
- `public/` — static assets; `assets/` — textures and images
- `scripts/` — one-off Node sprite/favicon generators (not part of the runtime bundle)

## Config & Patterns

- `vite.config.js`: `root` is `src/`, `publicDir` is `../public`, build `outDir` is `../dist`, `envDir` is repo root
- Analytics is optional and gated on build-time env vars `VITE_ANALYTICS_ID` / `VITE_ANALYTICS_SRC` (injected via `import.meta.env`); absent = no analytics
- Save persistence uses `localStorage`
- Deployed via `Dockerfile` (node:22-slim) which runs `npm run build` and serves the static `dist/` with `serve.js`
