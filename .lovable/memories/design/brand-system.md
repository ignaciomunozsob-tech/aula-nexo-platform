---
name: NOVU brand & design system
description: Rebrand 2026 — Inter typography, #fcc70e yellow accent, light + dark, custom component utilities
type: design
---

## Brand
- NOVU. Tagline: "Vende tus cursos sin complicaciones". Icon: GraduationCap. Tone: directo, cálido, moderno.

## Typography
- Inter (Google Fonts, weights 400/500/700/800/900). Applied globally.
- Headings: 800/900, letter-spacing -0.02em. Body: 400. Subtitles: 500. Pills/badges: 700 uppercase letter-spacing 0.16em.

## Color tokens (CSS vars, HSL)
Light:
- `--bg-primary` #fcf6ef · `--bg-card-raw` #ffffff · `--bg-card-alt-raw` #f0e8dc
- `--novu-accent` #fcc70e · `--novu-text` #000 · `--novu-text-secondary` #555 · `--novu-text-support` #888
- `--novu-text-on-accent` #333 · `--novu-border` #e2d9cc · `--novu-border-alt` #e0d4c4

Dark (toggle `.dark` on `<html>`):
- `--bg-primary` #141210 · `--bg-card-raw` #1e1b17 · `--bg-card-alt-raw` #252018
- `--novu-text` #f5f0e8 · `--novu-text-secondary` #a89f94 · `--novu-text-support` #6b6560
- `--novu-text-on-accent` #1a1600 · `--novu-border` #2e2a24 · `--novu-border-alt` #35302a
- Accent stays #fcc70e in both modes.

These map to shadcn semantic tokens (`--primary`, `--background`, `--card`, ...). Never hardcode hex in components; use `bg-primary`, `text-foreground`, or `hsl(var(--novu-*))`.

## Component utilities (defined in `src/index.css`)
- `.novu-pill` — yellow uppercase pill
- `.novu-card` — bg-card · 1px border · radius 14px · pad 24px
- `.novu-card-alt` — bg-card-alt · radius 12px · pad 20px 24px
- `.novu-btn-primary` — yellow fill · weight 800 · radius 100px · pad 16/32
- `.novu-btn-secondary` — outline foreground · radius 100px · pad 16/32
- `.novu-step` — 48px yellow circle
- `.novu-certified` — small yellow pill with checkmark

## Rules
- Background siempre `bg-background` (= `--bg-primary`).
- Sin puntos al final de títulos. Sin guiones largos en el copy.
- Cards radius 14–16px. Botones radius 100px.
- Padding vertical entre secciones: 56–72px.
- Grid máx 4 columnas en desktop.
- Eliminado el azul #2650d4 / #004aad — todo acento usa #fcc70e.

## Dark mode
- `ThemeProvider` en `src/lib/theme.tsx`. Toggle sol/luna en `PublicNavbar`. Persistido en `localStorage('novu-theme')`. Init script en `index.html` evita FOUC y respeta `prefers-color-scheme`.
