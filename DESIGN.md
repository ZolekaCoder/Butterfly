# Butterfly — Design System

Reference: a case-file room at the end of a long investigation — a corkboard, a few case-file
tabs, a radio scanner. Not a video game HUD, not a SaaS dashboard, not a sci-fi command bridge.
Flat, dense, quiet until something happens, then unmistakably alive.

## Typography

System font stacks only — no webfont fetch during a live demo is worth the risk of a slow or
offline venue network stalling the one screen a judge is looking at.

- **UI / labels / headers**: `-apple-system, "Segoe UI", Helvetica Neue, Arial, sans-serif`.
  Headers and labels lean on `text-transform: uppercase` + `letter-spacing: 0.06–0.1em` at a small
  size to read as case-file stamps rather than app chrome — the typographic personality comes from
  treatment, not from a display face.
- **Data / timestamps / meters / log**: `ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono",
  Consolas, monospace`. Every number in this product — a meter value, a clock, a turn duration —
  is set in mono. Nothing else is.
- **Body / agent quotes**: the UI sans stack, regular weight, sentence case. This is the only text
  in the interface allowed to sound human rather than stamped.

Scale (px): 11 (micro-label), 13 (body/data), 15 (panel title), 20 (top-level meter value), 28
(scenario outcome banner only).

## Spacing

4px base unit: 4, 8, 12, 16, 24, 32, 48, 64. Panels are dense by design — this is an operations
room, not a marketing page with room to breathe. Whitespace is used to separate the four zones
from each other, not to pad content within them.

## Colour system

Dark, warm-neutral base — never pure black, never cool blue-black.

| Token | Value | Use |
|---|---|---|
| `--bg-0` | `#0b0c0e` | Page background |
| `--bg-1` | `#121316` | Panel background |
| `--bg-2` | `#1a1c20` | Raised surface (cards, active rows) |
| `--border` | `#2a2d33` | Hairline borders, the only elevation cue besides `--bg` steps |
| `--fg-0` | `#e9e6df` | Primary text — warm off-white, aged-paper, not stark white |
| `--fg-1` | `#a6a5a2` | Secondary text |
| `--fg-2` | `#6c6c6e` | Tertiary / micro-labels |
| `--accent` | `#d1a35a` | The one functional highlight colour: focus, active selection, primary CTA |
| `--danger` | `#b5563b` | Meters/actions reading as adversarial to the crew (heat, raid, arrest) |
| `--positive` | `#7f9a6e` | Meters/actions reading as progress (heist progress, trust gain) |

Role colours (fixed, sourced from the server's `ROLE_META` so the API and UI never disagree):

| Role | Colour |
|---|---|
| Mastermind | `#c9a15a` |
| Detective | `#6f9bb0` |
| Insider | `#9b7b96` |
| Driver | `#bd6a4a` |

No gradients. Every colour above is a flat fill or a 1px stroke. If a screen ever needs a fifth
accent colour, that's a sign something is being decorated rather than communicated.

## Border / radius system

2px radius, applied to: buttons, chips, timeline bars, panel corners. That's it — this is a flat,
rectangular, case-file aesthetic, not a soft-UI one. Every panel and card has a single 1px
`--border` hairline; nothing is borderless-but-implied by a shadow.

## Elevation

No drop shadows, anywhere. Elevation is communicated purely by the `--bg-0 → --bg-1 → --bg-2` step
and, for the single actively-open thing on screen (an expanded log row, a focused control), a 1px
`--accent` border. A "raised" surface is one step lighter, full stop.

## Interaction states

- **Default**: `--border` hairline, `--fg-1` label.
- **Hover** (buttons, log rows): background steps up one level (`--bg-1` → `--bg-2`), border
  brightens toward `--fg-1`. 120ms ease, no transform/scale.
- **Active / pressed**: instant, no delay, no bounce — this is a control room, not a toy.
- **Focus** (keyboard): 1px `--accent` outline, offset 1px. Never removed.
- **Disabled**: `--fg-2` text, `--border` unchanged, cursor `not-allowed` — used only when the
  scenario has resolved and interventions no longer apply.

## Motion principles

Motion exists to communicate **causality and concurrency**, never decoration:

- A turn starting: the role's status chip and swimlane bar begin filling — no separate "loading"
  animation layered on top.
- A causal link: a thin line draws from the cause event to the reaction it produced over ~350ms.
  This is the single most important animation in the product — it is the visual proof that one
  thing caused another.
- A meter changing: the value and bar width ease over 220ms rather than snapping, so a change
  reads as *caused by* the action that just resolved.
- Nothing animates on a loop. No idle shimmer, no breathing glow, no floating particles. If nothing
  is happening, the screen is still.

Standard easing `cubic-bezier(.2,.7,.3,1)`. Durations: 120ms (hover/micro), 220ms (value change),
350ms (causal line draw).

## Component language

- **Role card** ("case-file tab"): flat `--bg-1` card, 3px left border in the role's colour, mono
  status line, role name in the UI-sans label treatment. No avatar, no icon — the colour bar and
  the name are the identity.
- **Swimlane bar**: a flat rectangle in the role's colour at ~55% opacity while thinking, full
  opacity + a short settle animation on completion. No gradient fill.
- **Intervention button**: rectangular, 1px `--border`, uppercase label, mono keystroke-style
  affordance optional. Hover lifts one `--bg` step; no pill shape, no icon-first layout.
- **Meter**: label (uppercase, `--fg-2`) + mono numeric value + a thin flat bar. The bar's colour
  is neutral (`--fg-1`-tinted) unless the meter has crossed a threshold that means something
  (e.g. heat high enough to matter), at which point it shifts toward `--danger` or `--positive`.
  This is a state change, not a rainbow gradient.

## Explicit anti-patterns (do not do these)

- No purple/blue "AI" gradients, anywhere, for any reason.
- No glassmorphism, frosted panels, or backdrop-blur.
- No pill-shaped badges as a default shape; chips are square-ish (2px radius) like everything else.
- No card-grid-of-cards; the layout is four named zones with layouts specific to their content, not
  a repeated icon+title+paragraph tile.
- No glowing orbs, neon, or arbitrary accent colours beyond the fixed palette above.
- No idle/looping decorative animation.
- No fake metrics, marketing copy, testimonials, or "trusted by" content — there is no product
  being sold on this screen.
