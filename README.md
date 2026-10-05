# Volcano Lab

Interactive **3D volcano eruption simulator** built with Vite, TypeScript, and Three.js. Scrub a 30-second timeline, adjust eruption intensity, toggle a cutaway interior view, and read university-level stage narratives in **English** or **Traditional Chinese (zh-TW)**.

## Requirements

- Node.js 18+
- npm 9+

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321).

## Build

```bash
npm run build
npm run preview
```

## Project layout

| Path | Purpose |
|------|---------|
| `src/main.ts` | UI wiring, timeline playback, i18n refresh |
| `src/scene/` | Volcano geometry, particles, WebGL renderer |
| `src/i18n/` | English and zh-TW copy (stages, legend, help) |
| `src/version.ts` | Semver and update date shown in the footer |

## Keyboard shortcuts

Space (play/pause), ←/→ (scrub), Home/End, **C** (cutaway), **L** (labels), **R** (reverse).

## Version

**2.0.0** — updated **2026-10-05**.
