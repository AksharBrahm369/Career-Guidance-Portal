# Career Box — Admin Design System (MASTER)

> Source of truth for the admin panel UI. Derived from the `ui-ux-pro-max` ruleset.
> Product: internal **data-management admin** for a pan-India career-guidance platform.
> Audience: admins / counselors. Tone: **professional, trustworthy, calm, data-clear** — not playful.
> Stack: Next.js 15 App Router + React 19 + Tailwind v3 + shadcn (base `radix`, slate). Web (desktop-first, responsive down to 768px).

## 1. Style
Clean professional flat **with subtle depth** — soft-shadowed cards on a neutral surface, generous whitespace, data-dense but breathable. Consistent across every admin page. SVG icons only (`lucide-react`) — never emoji.

## 2. Color tokens (shadcn CSS variables — edit `app/globals.css`)
Keep the **slate** neutral base; set a confident **indigo** primary (trust + intelligence for an education product). Light + dark must be designed together; verify 4.5:1 contrast both ways.

| Token | Light (HSL) | Dark (HSL) | Use |
|---|---|---|---|
| `--primary` | `243 75% 58%` (#4f46e5 indigo) | `243 75% 66%` | primary CTA, active nav, focus |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | text on primary |
| `--background` / `--foreground` | `0 0% 100%` / `222 47% 11%` | `222 47% 6%` / `210 40% 96%` | page |
| `--muted` / `--muted-foreground` | `210 40% 96%` / `215 16% 40%` | `217 33% 14%` / `215 20% 65%` | secondary text/surfaces |
| `--card` | `0 0% 100%` | `222 47% 8%` | cards |
| `--border` | `214 32% 91%` | `217 33% 18%` | dividers (must stay visible in BOTH themes) |
| success | `142 70% 38%` | `142 65% 45%` | active / published |
| warning | `38 92% 50%` | `38 92% 55%` | pending / cross-stream |
| `--destructive` | `0 72% 51%` | `0 72% 55%` | delete / banned |
| `--radius` | `0.625rem` | — | rounded-lg baseline |

Status is **never color alone** — pair with icon + text (e.g. `● Active`, `⚠ Pending`).

## 3. Typography
Body font **Inter** via `next/font` (swap), fallback system-ui. Scale: 12 · 14 · 16(base) · 18 · 20 · 24 · 30. Weights: headings 600–700, labels 500, body 400. Line-height 1.5 body. **`tabular-nums`** for every number column, count, %, date, and stat (prevents column jitter). Wrap over truncate; when truncating (long question text) provide full text via `Tooltip`.

## 4. Effects / elevation (one consistent scale)
- Card: `border` + `shadow-sm`; hover (clickable cards only) → `shadow-md` + `border-primary/40`, **no layout shift** (transform/opacity/shadow only).
- Popover / Dropdown / Dialog: `shadow-md`/`shadow-lg`; overlays manage their own z-index (don't add manual z-index).
- Modal scrim 40–60% black. Focus ring: visible 2px ring on every interactive element — **never remove it**.

## 5. Layout & spacing
4/8px rhythm. Page container `max-w-7xl`, gutters `px-4 sm:px-6 lg:px-8`. Section vertical rhythm 16/24/32/48. Sidebar (≥1024px) for primary nav, Sheet drawer on mobile. Active route highlighted (color + weight + indicator). Sticky table headers for long lists; reserve space for async content (Skeleton) to avoid CLS.

## 6. Component conventions
- **Tables:** sticky header, row hover, `tabular-nums`, sortable headers with `aria-sort`, status `Badge`s, right-aligned numeric columns. Zebra optional.
- **Stat cards:** label (muted, 13–14px) + value (24–30px, `tabular-nums`, 600) + optional lucide icon + hint.
- **Forms:** visible labels (never placeholder-only), helper text below complex inputs, **validate on blur** (not keystroke), error message below the field stating cause + fix, required marked, semantic input types (`tel`/`number`), password show/hide, autofocus first invalid field on submit error.
- **Destructive actions:** danger color, visually separated from primary, always `AlertDialog`-confirmed; offer undo where cheap.
- **Empty states:** `Empty`/Alert with a helpful message + action — never a blank panel. **Loading:** `Skeleton`, not a bare spinner, for >300ms.
- **Toasts:** `sonner`, auto-dismiss 3–5s, `aria-live` (don't steal focus).
- **One primary CTA per view**; secondary actions subordinate (outline/ghost).
- **Buttons:** icons via `data-icon`, no sizing class on the icon; loading = `disabled` + spinner (no `isLoading` prop).

## 7. Motion
150–250ms, ease-out enter / ease-in exit; animate transform/opacity only; respect `prefers-reduced-motion`. Animate state changes (tab switch, dialog, expand) — don't snap — but never block input.

## 8. Anti-patterns (reject in review)
Emoji as icons · placeholder-only labels · status by color alone · removed focus rings · gray-on-gray low contrast · raw hex in components (tokens only) · layout-shifting hover · `space-y-*` (use `gap-*`) · pie chart >5 categories · disabling zoom.

## Pre-delivery checklist (run before "done")
Contrast 4.5:1 (both themes) · visible focus rings · keyboard nav order = visual · status has icon+text · `tabular-nums` on all data · empty + loading states present · destructive confirmed + separated · forms: labels + inline-validation + error-below-field · no horizontal scroll ≤768px · reduced-motion respected · one primary CTA per screen.
