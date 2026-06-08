# Student Experience — Design System (overrides MASTER for `app/(student)/**`)

> Consumer product for **teens 14–18** (grades 9–12), pan-India, **phone-first**, variable devices/networks.
> Emotional job: turn "what do I do with my life?" into something **guided, clear, encouraging** — and **trustworthy for parents**.
> Distinct identity from the admin (admin = professional indigo/slate tool; student = warm guide). Both are valid per the "two independent products" split.

## 1. Identity & tone
Warm, optimistic, calm. A friendly **guide**, never clinical or salesy. Microcopy: second-person, plain language, low-jargon, supportive ("Let's find what fits you", "Nice — you're almost there", "Here's what your answers say about you"). Celebrate progress. Reduce anxiety: one thing at a time, no dead ends, always a next step.

## 2. Color tokens — student theme (apply via a `.theme-student` class on the `(student)` layout root; light + dark)
Trust anchor **violet** + **growth** accent (emerald-teal). Keep slate neutrals; lead with the accent for warmth. Verify 4.5:1 both themes; status = color **+ icon/text**.

| Token | Light HSL | Dark HSL | Use |
|---|---|---|---|
| `--primary` | `252 72% 60%` | `252 78% 70%` | primary CTA, active, focus |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | text on primary |
| `--accent` (growth) | `162 72% 41%` | `162 64% 46%` | success/“fit”, highlights, accent chips |
| `--accent-foreground` | `0 0% 100%` | `0 0% 100%` | — |
| `--background`/`--foreground` | `0 0% 100%` / `222 47% 11%` | `250 30% 7%` / `220 30% 96%` | page |
| `--muted`/`--muted-foreground` | `250 30% 96%` / `222 12% 42%` | `250 24% 14%` / `220 14% 66%` | surfaces/secondary |
| `--card` | `0 0% 100%` | `250 30% 9%` | cards |
| `--border` | `250 24% 90%` | `250 24% 18%` | dividers (visible both themes) |
| warning | `38 92% 50%` | `38 92% 56%` | caution / cross-stream |
| `--destructive` | `0 72% 51%` | `0 72% 56%` | errors |
| `--radius` | `0.875rem` (friendlier than admin) | — | rounded |

## 3. Typography
Headings **Poppins** (600–700) via `next/font` (swap) → `--font-heading`; body **Inter** → `--font-sans`. Wire both into `tailwind.config.ts` (`fontFamily.heading`, default `sans`). Base 16px (never <16 on mobile — avoids iOS zoom), line-height 1.5–1.6, scale 13/14/16/18/20/24/30/36. `tabular-nums` for scores/percentages/marks. Generous heading sizes on results.

## 4. Layout & motion
Mobile-first single column; comfortable gutters `px-4 sm:px-6`; readable measure (`max-w-prose`/`max-w-2xl` for text, `max-w-5xl` page). Touch targets **≥44px**, 8px+ gaps. Gentle motion 150–250ms ease-out, subtle entrance **stagger** on results (respect `prefers-reduced-motion`). `min-h-dvh` not `100vh`.

## 5. Signature surfaces
- **Assessment flow** = a **calm guided wizard**: persistent top **Progress** bar (module x/5 + question count), **one card at a time**, big tappable option buttons (selected = primary ring + check), encouraging per-module intro, autosave indicator, clear Back/Next, sticky bottom action bar on mobile. Likert = a labelled 1–5 scale with large targets. Never show all questions at once. No anxiety, no jargon.
- **Brain Profile** (results) = the **reward moment**: a hero ("Your Brain Profile" + top career cluster + confidence note), RIASEC interests as clean labelled bars, aptitude as friendly band chips (strong/moderate/developing with icon+text), subject strengths as chips, then **recommended courses as rich cards** (fit %, reasons, top-match emphasis, cross-stream badge) → link to course detail. Share/Download action. Empty/low-signal = warm guidance, not failure.
- **Courses** — `course-card`: clear title, stream + cluster `Badge`s, AI-safety tag, short desc, fit% when from results; catalogue filters as accessible controls; detail page = sectioned (overview, eligibility, institutes, fees, sources) + the **Q&A widget**.
- **Q&A chat** — friendly assistant: distinct user/assistant bubbles, streaming with a typing indicator, 2–3 **suggested starter questions**, clear input with send, scroll-to-latest, error+retry.
- **Auth** (login/signup) — welcoming, phone+password, single column, large inputs (≥44px, `type="tel"`), inline-validation on blur, error below field, password show/hide, friendly heading.

## 6. A11y / perf (must)
**Remove `maximumScale: 1`** from the root viewport (never disable zoom). Visible focus rings; alt text on figural/option images; color never sole signal; `font-display: swap`; lazy-load below-fold; skeletons for >300ms; keyboard nav; reduced-motion. Reserve image space (aptitude figural) to avoid CLS.

## 7. Anti-patterns (reject)
Emoji as icons (use lucide) · placeholder-only labels · all assessment questions on one page · disabling zoom · gray-on-gray · raw hex in components · jargon/clinical tone · dead-end empty states · `space-y-*` (use `gap-*`).
