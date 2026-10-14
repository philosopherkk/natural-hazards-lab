# Natural Hazards Lab (v4.0.0)

Interactive **Vite + TypeScript + Three.js** timelines for four geohazards, with **engineering** and **primary-school (simple)** explanations in **English** and **Traditional Chinese (zh-TW)**.

## Hub & routes (hash)

| Route | Module |
|--------|--------|
| `#/` | Hazard selection hub |
| `#/volcano` | Volcano eruption (chamber, conduit, village damage, subsurface cutaway) |
| `#/avalanche` | Snowpack release, valley runout, chalet impacts |
| `#/tsunami` | Fault slip, wave propagation, coastal inundation |
| `#/earthquake` | Fault rupture, P/S wave fronts, building damage |

## Controls (all hazards)

- **Timeline** — scrub 0–30 s (deterministic state at time *t*)
- **Play / Pause / Reverse / Reset**
- **Playback speed** — **0.5×, 1×, 2×, 4×** (default 1×; stored in `sessionStorage`)
- **Intensity** — scales scenario severity per module
- **Simple / Engineering** — toggle readouts and stage narrative (`localStorage`)
- **Language** — EN ↔ zh-TW (`localStorage`)

Volcano-only: **Cutaway interior**, **Anatomy labels** (keys **C** / **L**).

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://127.0.0.1:5173/#/`).

```bash
npm run build
npm run preview
```

## Project layout

- `src/hub.ts`, `src/router.ts` — hub and hash routing
- `src/shared/hazardShell.ts` — shared transport, speed, explain mode, panels
- `src/model/` — physics sketches (`eruptionModel`, `avalancheModel`, `tsunamiModel`, `earthquakeModel`)
- `src/scene/` — Three.js scenes per hazard
- `src/i18n/catalog/` — EN + zh-TW copy for hub and all modules

**Version:** 4.0.0 · **Updated:** 2026-10-14
