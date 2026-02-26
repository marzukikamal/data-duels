# Data Duels

A competitive sandbox for time-series anomaly detection. Data Duels provides the game loop, shared UI primitives, and a fast web playground for designing challenges and scoring solutions.

## Vision
Data Duels turns data quality and observability tasks into a game: generate clean signals, inject anomalies, and let players build detectors that compete on precision, latency, and robustness. The goal is to make experimentation delightful while keeping the mechanics grounded in real-world data workflows.

## Architecture
- `apps/web` – React + Vite front-end playground.
- `packages/engine` – TypeScript game engine (data generation, anomaly injection, scoring).
- `packages/ui` – Shared UI components (empty scaffold for now).
- `docs` – Design notes and documentation.
- `.github/workflows` – CI pipeline.

## Local Development
Prerequisites: Node.js 20+, pnpm 9+

1. Install dependencies:
   - `pnpm install`
2. Start the web app:
   - `pnpm dev`
3. Run checks:
   - `pnpm lint`
   - `pnpm type-check`
   - `pnpm test`
   - `pnpm build`

## Scripts
- `pnpm dev` – Run the web app.
- `pnpm lint` – Lint all packages.
- `pnpm type-check` – Type check all packages.
- `pnpm test` – Run tests.
- `pnpm build` – Build all packages.

## License
MIT
