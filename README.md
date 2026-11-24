# Geometry Dash — Enzonic

This repository is the home for the independent Geometry Dash browser project built around the Cadence reimplementation and the Enzonic online service.

## Project goals

- Keep the Cadence game and level editor as the main experience.
- Serve the game from the website root (no separate online-hub landing page).
- Use the independent Enzonic service for accounts, cloud saves, levels, comments, likes/ratings, profiles, friends and leaderboards.
- Do not forward account or game-service requests to Boomlings.
- Keep the four existing Enzonic PostgreSQL databases intact:
  - `DATABASE_URL_ACCOUNTS`
  - `DATABASE_URL_GAME`
  - `DATABASE_URL_LEVELS`
  - `DATABASE_URL_SOCIAL`

## Deployment targets

- Public website: https://geometrydash.devs.li
- Backend: configure the actual Enzonic backend origin separately; do not assume it is the same hostname as the public website.

## Source and build notes

The Cadence frontend is Rust/WASM. The source archive is not itself a compiled website: the web build must produce `pkg/cadence_game.js` and `pkg/cadence_game_bg.wasm` before deployment. The browser also requires the user's own legally obtained Geometry Dash Resources folder; copyrighted game assets are not bundled here.

## Current repository status

This repository has been initialized. The complete Cadence source archive and the Enzonic backend adapter still need to be imported and reviewed before this repository can be called a complete, deployable integration. No deployment has been performed.

## Safety

Never commit database connection strings, passwords, API keys, session secrets, or user data. Configure secrets in the deployment platform's environment settings.
