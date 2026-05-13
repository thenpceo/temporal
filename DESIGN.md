# Design System — Temporal Brand

Extracted from `temporal.io` CSS tokens on 2026-05-12. Used to bring this demo on-brand for the Temporal hiring artifact.

## Brand voice

- **Aspirational, confident, developer-direct.** Headlines like *"What if your code never failed?"* and *"Write code as if failure doesn't exist."* Avoid jargon, address pain directly.
- **The product is durable execution.** Lean into that language. The workflow IS the agent. Temporal owns state, retries, signals, and audit trail.
- **High-contrast statements over hedging.** Bold claims that the demo can back up.

## Color tokens

All values are RGB triplets in Temporal's CSS, expressed as hex here.

### Brand

| Token | Hex | Use |
|---|---|---|
| **Brand indigo** (the signature) | `#444CE7` | Primary surface, brand text, info |
| Interactive surface | `#3F43DB` | Default button/CTA |
| Interactive hover | `#3538CF` | Button hover |
| Interactive active | `#1C0DB2` | Pressed state |
| Pink accent | `#E300E6` | Sparingly — special accents only |

### Surfaces

| Token | Hex | Use |
|---|---|---|
| Surface primary | `#000000` | Page background |
| Surface background | `#141414` | App shell |
| Surface table | `#243349` | Elevated panels, **code blocks** (same as Shiki bg) |
| Surface subtle | `#374761` | Hover/elevated cards |
| Surface secondary (light) | `#F8FAFC` | Light-mode surfaces (we use dark) |

### Text

| Token | Hex | Use |
|---|---|---|
| Text primary | `#F8FAFC` | Body, headings |
| Text secondary / subtle | `#465A78` | Captions, muted |
| Text white | `#FFFFFF` | High-emphasis headings |
| Text pink | `#E300E6` | Special accent |

### Borders

| Token | Hex | Use |
|---|---|---|
| Border subtle | `#374761` | Panels, dividers |
| Border secondary | `#465A78` | Stronger separators |
| Border primary | `#7C8FB1` | Highest-emphasis borders |
| Border table | `#243349` | Table rows |

### Status

| State | Loud | Subtle / border / text |
|---|---|---|
| Success | `#00E175` | `#00CC6A` |
| Warning | `#FD710A` (surface) | `#FEC118` (text) |
| Danger | `#C71D00` (surface) | `#FF643C` (border/text) |
| Info | `#444CE7` (brand) | `#3F43DB` |

### Code highlighting (Shiki theme on docs)

| Token | Hex |
|---|---|
| Background | `#243349` |
| Text | `#F8FAFC` |
| Comment | `#576E8F` |
| Constant | `#59FDA0` |
| Function | `#CCCEF0` |
| Keyword | `#7F86F1` |
| String | `#EDC38D` |
| Link | `#FED553` |

## Typography

- **Sans (body + headings)**: **Aeonik** — Temporal's proprietary face. Fallback for this demo: **Inter** (closest free geometric grotesque), then system-ui.
- **Mono**: **Noto Sans Mono** — used for code blocks and tabular data. Fallback to system mono stack.
- Stack:
  - `"Aeonik", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  - `"Noto Sans Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- Weight range used: 400 (body), 500 (UI labels), 600 (headings), 700 (display).
- Eyebrow labels are uppercased with `letter-spacing: 0.1em+`.

## Layout patterns

- **Dark-mode default** with pure-black `#000` and near-black `#141414` surfaces.
- Elevated content (cards, code blocks, tables) on **slate-blue `#243349`** — cohesion between data, UI, and code.
- **High-contrast CTAs**: indigo brand color for primary, ghost outlines for secondary, never gray-on-gray.
- **Star-field backgrounds** on hero/atmospheric sections (Temporal uses `/images/backgrounds/stars.avif`).
- **Indigo gradient washes**: `linear-gradient(to bottom or right)` from `#3F43DB` softly tinting hero sections.
- **Alternating content blocks** — text-left / visual-right pattern repeating down marketing pages.
- **Generous vertical rhythm**: large section gaps (96–128 px), confident negative space.

## Component conventions

- **Buttons**:
  - Primary: solid indigo `#3F43DB`, hover `#3538CF`, active `#1C0DB2`, white text, no border.
  - Secondary/ghost: transparent, `#374761` border, `#F8FAFC` text, hover → `#374761` background.
  - Danger: `#C71D00` surface, `#FF643C` border on hover/focus.
- **Pills/badges**: solid color background derived from status token at low opacity, full-opacity border, full-opacity text. Uppercase, tight letter-spacing.
- **Panels/cards**: `#141414` or `#0a0d14` background, `#374761` border at 1px, no aggressive shadows (only a subtle inner highlight on top edge).
- **Code blocks**: `#243349` background, Noto Sans Mono, Shiki tokens above.
- **Focus rings**: 2px solid `#444CE7` with 2px offset.

## Motion

- 150–200ms transitions on hover/focus.
- Pulse animations on live indicators (matches Temporal's "always-on" durable-execution vibe).
- Reserve large motion (animated stars, fade-ups) for atmospheric moments — never inside the working dashboard panels.

## Anti-patterns

- ❌ Generic AI-purple gradients on white. Use Temporal's indigo on near-black.
- ❌ Roboto / Arial / Inter-default-stack body text. Aeonik-feel (Inter or DM Sans is acceptable substitute).
- ❌ Soft pastel status colors. Temporal status colors are saturated and loud (`#00E175`, `#FD710A`).
- ❌ Light-mode default. The brand expression is dark.
- ❌ Hedging copy. Match the *"…as if failure doesn't exist"* register.

## Application to this demo

1. **Primary accent** changes from `#7c5cff` (generic violet) → `#444CE7` (Temporal indigo).
2. **Elevated surfaces** shift from `#101218` → `#0e131c` and `#1a1f2c` → `#243349` (Temporal slate-blue).
3. **Body font**: swap Fira Sans → Inter (Aeonik proxy).
4. **Mono**: swap Fira Code → Noto Sans Mono (Temporal's exact mono).
5. **Brand mark gradient**: indigo `#444CE7` → pink `#E300E6` (matches the two-accent brand expression).
6. **CTAs**: green `#22c55e` (generic success) → indigo `#3F43DB` (brand). Keep green only for the success status pill.
7. **Code/findings blocks**: `#141823` → `#243349` (match docs Shiki).
8. **Status colors**: refresh to Temporal's saturated palette.
9. **Topbar**: tighten brand presentation — `BUILD WITH TEMPORAL` eyebrow over the dashboard name.
10. **Copy adjustments**: hero subtitle should match Temporal's confident register — *"Support escalations as if downstream tooling never failed."*

## References

- https://temporal.io — main site
- https://docs.temporal.io — docs site (Shiki code tokens come from here)
- CSS source: `https://temporal.io/_app/immutable/assets/app.DXKjsStw.css`
