# DESIGN.md — Faculty OS

**Every teammate's agent reads this before writing any UI code.** Full detail (anti-patterns, checklists, dials) lives in `design-system/faculty-os/MASTER.md` — generated via `ui-ux-pro-max --design-system --persist`. This file is the summary; MASTER.md is the source of truth if the two ever disagree.

This is now a merge of two tools: `ui-ux-pro-max` (colors, typography, spacing, the 3 reference styles below) plus `design-inspiration` MCP (`get_design_brief` + `generate_design_tokens`, run against "faculty-os: faculty paste CLOs + exams, get a coverage/recycled-question audit report — trustworthy academic tool, data-dense dashboard"), installed locally at `.tools/design-inspiration-mcp`. Its `get_design_brief` output leaned generic SaaS-landing-page (dark palette, purple gradient CTAs, DM Sans) — that's template filler, not a real signal for this app, so it's discarded rather than overriding the choices below. What it *did* add: the full token system (radius/shadow/motion/z-index) in the section below, a few extra engineering rules, and one real cross-check (Notion) on the input screen's layout.

## 3 Named Reference Styles to Imitate
1. **Minimalism & Swiss Style** (primary direction) — clean, spacious, high-contrast, grid-based, sans-serif, essential-only. This is the base look for the whole app: the input screen, cards, nav.
2. **Data-Dense Dashboard** — apply specifically to the report view (Coverage Matrix, Recycled List, Bloom bars, tag chips): minimal padding (8–12px), 12-column grid, compact but readable type (12–14px), sortable tables, sticky headers where useful.
3. **shadcn/ui default ("New York" style)** — since the stack is Next.js + shadcn/ui, use shadcn's own default component style as the concrete implementation reference rather than a fourth abstract style — buttons, inputs, cards, tables come from shadcn as-is, themed with the tokens below, not restyled from scratch.

**Cross-check (design-inspiration MCP, `landing_page_reference`):** its Notion pick for the input screen — centered, neutral, no distractions, the product itself (here: the pasted text becoming a report) does the talking — confirms direction #1, no change needed. Its other picks (Stripe, Lusion, Raycast — dark, gradient, WebGL) don't fit an academic audit tool and are intentionally not adopted.

## Colors
| Role | Hex | CSS Variable |
|---|---|---|
| Primary | `#0D9488` | `--color-primary` |
| On Primary | `#000000` | `--color-on-primary` |
| Secondary | `#14B8A6` | `--color-secondary` |
| On Secondary | `#0F172A` | `--color-on-secondary` |
| Accent/CTA | `#EA580C` | `--color-accent` |
| On Accent/CTA | `#000000` | `--color-on-accent` |
| Background | `#F0FDFA` | `--color-background` |
| Foreground | `#134E4A` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#134E4A` | `--color-card-foreground` |
| Muted | `#E8F1F4` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#99F6E4` | `--color-border` |
| Destructive (blank-CLO-row / high-similarity badge) | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#0D9488` | `--color-ring` |

Destructive red is reserved for the wow-moment flags (untested CLO row, ≥80% recycled match) — don't dilute it by using it decoratively elsewhere.

## Typography
- Heading & body: **Plus Jakarta Sans** (`https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap`)
- Mood: friendly, modern, professional — matches "trustworthy academic tool," not playful.

## Spacing / Density
- Density dial: **7/10 (dashboard-dense)** — `--grid-gap: 8px`, `--card-padding: 12px`, `--font-size-small: 12px`, `--table-row-height: 36px`.
- Input screen (3 textareas) can breathe more (24px gaps); the report view below it switches to dense mode per Data-Dense Dashboard above.

## Motion (subtle — 3/10 dial, respect `prefers-reduced-motion`)
Only the wow-moment reveal animates. Everything else is static.
```js
gsap.from(el, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out' });
```
Apply once, on first render after Analyze succeeds, to: the blank CLO row in the Coverage Matrix, and the top (highest-%) item in the Recycled Questions list. Nothing else — no scroll-triggered reveals, no hover choreography; this is a data tool, not a landing page.

## Additional Tokens (from design-inspiration MCP `generate_design_tokens`, brand `#0D9488`, light mode, minor-third scale)
Radius/shadow/motion/z-index weren't specified above — these fill the gap. Colors/spacing/type here are informational only; the hex values and 8/12px density dial above are the source of truth if numbers ever disagree.

```css
:root {
  --radius-xs: 4px; --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-full: 9999px;

  --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06);

  --duration-fast: 200ms; --duration-base: 350ms; --duration-slow: 600ms;
  --ease-default: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);

  --z-dropdown: 100; --z-sticky: 200; --z-overlay: 300; --z-modal: 400; --z-toast: 500; --z-tooltip: 600;
}
```
- Cards/report tables: `--radius-md` (8px) + `--shadow-sm`, hover → `--shadow-md`. Matches shadcn New York's default corner radius closely enough to leave shadcn's own value as-is rather than override it.
- The wow-moment reveal's `duration: 0.35` already matches `--duration-base` (350ms) — no change, just now backed by a named token.
- History panel / any future dropdown or toast uses the z-index scale above instead of ad-hoc numbers.

**Extra engineering rules (from design-inspiration MCP `get_design_brief` → `premium_taste`, the parts not already covered by ui-ux-pro-max's checklist below):**
- Label sits above its input, error text below it (applies to the 3 textareas and any future form field).
- Use `min-h-[100dvh]`, never `h-screen`, for any full-viewport container — avoids mobile browser-chrome viewport jumps.
- No pure black (`#000000`) — this app already uses `--color-foreground: #134E4A`, consistent with this rule.

## Pre-Delivery Checklist (from ui-ux-pro-max, applies to every screen)
- [ ] No emojis as icons — use Heroicons/Lucide/shadcn's bundled icons
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states, 150–300ms transitions
- [ ] Text contrast ≥4.5:1 in light mode (this app ships light-mode only for the hackathon — dark mode is cut-list)
- [ ] Visible focus states for keyboard nav
- [ ] `prefers-reduced-motion` respected (skip the GSAP reveal above)
- [ ] Responsive at 375px / 768px / 1024px / 1440px — but 1440px is the one that must look screenshot-ready (see wow-moment layout requirement in plan.md)
