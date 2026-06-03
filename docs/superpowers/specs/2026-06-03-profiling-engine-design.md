# Profiling & Course-Recommendation Engine — Design Spec (v1)

**Status:** Approved design (brainstorming output) · **Date:** 2026-06-03 · **Branch:** `claude/career-guidance-platform-DVGCu`

This spec captures the v1 design for the student-side profiling engine — the core USP. It was produced from a zero-assumptions brainstorm with web-validated decisions. Pair with [`docs/KNOWLEDGE_BASE.md`](../../KNOWLEDGE_BASE.md) and [`docs/MODULES.md`](../../MODULES.md) for surrounding architecture.

---

## 1. Summary

A **class 11–12 student** (already in a stream) takes a **~20–25 minute, 4-lens assessment** and receives a **ranked shortlist of undergraduate courses** (with a clear #1), each carrying an **explainable fit rationale** and a deep-link to the institutes that offer it. The recommendation engine is **deterministic and explainable — no LLM in the scoring path** (per the platform invariant). Trustworthiness/explainability is the USP.

The four lenses are evidence-selected (validated against the career-assessment literature):

| Lens | Measures | How captured | Seed source (public domain) |
|---|---|---|---|
| **Aptitude** | What he *can* do (ability) | Scored test, 4 sub-abilities, soft-timed | **Per-sub-ability blend** (§9) |
| **Interests** | What he's *drawn to* | RIASEC items + subject grid | **O*NET Interest Profiler** |
| **Work-style** | *How* he likes to work | 5-trait self-report | **IPIP** |
| **Marks** | Demonstrated performance + eligibility | Self-entered subject marks | Self-authored (India) |

> "Innate/Multiple-Intelligences" from the original sketch was **dropped** — web-validated as redundant with aptitude and scientifically contested — and **replaced by Work-style** (O*NET-validated, genuinely orthogonal). See §12 for the evidence trail.

---

## 2. Goals & non-goals

**Goals (v1):**
- Full 4-lens assessment with validated, seeded (non-AI) items.
- Deterministic, explainable hybrid recommendation engine: eligibility gate → cluster match → ranked courses.
- Result screen: Brain Profile → ranked clusters → ranked courses → institutes, with per-course "why".
- Account-based, saved, retake-aware lifecycle.
- Admin tooling to manage the question bank, cluster profiles, per-cluster weights, and course eligibility.

**Non-goals (explicitly deferred):**
- Peer-percentile benchmarking (needs cohort/norm data — cold start).
- Marks verification / marksheet upload (trust + light sanity checks for now).
- Automatic weight tuning / ML recommendation (deterministic now; revisit with labeled outcome data).
- Internationalization (English-only v1, **no i18n plan** — accepted later-rework tradeoff).
- Parent view / dashboard; shareable result links.
- Class 9–10 stream-selection flow (this engine targets the post-12 course decision; a stream flow could reuse it later).

---

## 3. Primary user & decision

- **User:** Indian student in **class 11–12**, already committed to a stream (Science PCM/PCB, Commerce, Arts/Humanities, Vocational).
- **Decision served:** which **undergraduate course/degree** to pursue after class 12.
- **Stream is an input, not an output** — the engine knows his stream and recommends courses mostly reachable from it (with honest cross-stream flags; see §5.7).

---

## 4. The assessment (inputs)

### 4.1 Experience & flow
- **Length:** ~20–25 min, ~50–60 items total.
- **Structure:** modular with **save & resume**; **all four modules must be completed** before a result is generated (no partial results).
- **Order:** Interests → Work-style → Aptitude → Marks (ease in with self-report, effortful aptitude mid-session, quick data entry last).
- **Account required upfront** (see §7) — enables cross-device resume, history, and cooldown.

### 4.2 Interests
- **~30 RIASEC activity items** (Realistic, Investigative, Artistic, Social, Enterprising, Conventional; ~5 each) **plus a subject-preference grid** over standard 11–12 subjects.
- **Format:** forced-choice + a few consistency/attention checks to curb social-desirability and straight-lining.
- **Output:** a 6-dim RIASEC interest profile + ranked subject affinities.

### 4.3 Work-style
- **5 work-relevant traits:** Analytical, Hands-on/Practical, People-oriented, Creative, Structured/Detail — ~4 short items each (~20).
- **Output:** a 5-dim work-style profile.

### 4.4 Aptitude
- **Scored ability test**, 4 sub-abilities: **Numerical, Verbal, Logical/Abstract, Spatial**; **~10 items each** (~40 total).
- **Soft per-section timer**; **fixed curated item sets drawn from a larger randomized pool** (different draws across retakes).
- **Scoring:** raw correct → fixed cut-bands (Strong / Moderate / Developing) at launch; **percentile-vs-peers added later** once cohort data exists.
- **Use in engine:** *both* a relative-strengths pattern (drives cluster fit, O*NET shape-match) *and* an absolute level used only as a gentle "this may be a stretch" flag — so an all-average student still ranks meaningfully.

### 4.5 Marks
- **Self-entered**, subject-level: class 10 all-subject marks (broad baseline) + class 11/12 stream-subject marks (current, course-relevant).
- **Raw + board-aware, NO normalization.** The board is captured as metadata; the algorithm respects it at interpretation/eligibility time. Marks serve two board-safe roles only:
  1. **Intra-student subject strength** (his Physics vs his own other subjects) — board-agnostic.
  2. **Eligibility** against course/entrance cutoffs — board-aware reference points; entrance exams (JEE/NEET/CUET) are India's existing cross-board equalizer.
- **Honesty handling:** trust + light sanity checks (flag impossible combos); marks labeled self-reported; optional verification deferred.
- Rationale: no validated public cross-board normalization formula exists; an ad-hoc transform would distort scores. Cross-board comparison is unnecessary because the recommendation is about *his fit*, not ranking him against peers.

### 4.6 Integrity & response quality
- **Aptitude:** soft timer + randomized-from-pool items + explicit **low-stakes framing** ("for guidance, not a gatekeeper") to remove the cheating incentive.
- **Self-report:** forced-choice + consistency/attention items.
- **Careless responding:** detect straight-lining / too-fast / contradictory patterns → gently re-prompt that section; lower the confidence indicator if it persists.

---

## 5. The recommendation engine

Deterministic, explainable **hybrid**: a non-compensatory eligibility gate followed by compensatory weighted scoring. No LLM.

### 5.1 Pipeline
1. Build the **student profile** from the 4 lenses (normalized).
2. **Eligibility gate** → drop unreachable courses.
3. **Cluster match** → score & rank career clusters against their target profiles.
4. **Course ranking** → within top clusters, score & rank specific courses; surface a clear #1.
5. Attach **per-lens explanations** to every ranked course.

### 5.2 Profile normalization
- Each lens is normalized to a comparable 0–1 scale *within the student* (e.g., interest dims relative to his own spread; aptitude bands; work-style; subject-mark strengths). This keeps heterogeneous inputs combinable without cross-student normalization.

### 5.3 Eligibility gate (non-compensatory)
- Hard constraints eliminate courses he cannot realistically pursue: required stream/subjects, minimum marks/board-aware cutoffs, entrance-exam prerequisites.
- Strength in one lens **cannot** compensate a hard ineligibility (prevents "critical-failure" courses ranking high).
- Driven by **structured course-eligibility metadata** (see §8.5).

### 5.4 Cluster matching (compensatory, per-cluster weights)
- Each **career cluster** has an expert-defined **target profile** (expected RIASEC pattern, aptitude-strength emphasis, work-style emphasis) and its **own lens-weight vector**.
- **Cluster fit** = weighted combination of:
  - **Pattern match** of his interest/aptitude/work-style *shape* to the cluster target (O*NET-style profile correlation), and
  - **Capability signal** from aptitude level + relevant marks.
- **Default lens weights** (seed; per-cluster overridable, admin-tunable): Interests 0.30, Aptitude 0.25, Marks 0.30, Work-style 0.15. Per-cluster overrides let e.g. Engineering weight aptitude higher and Arts weight interests higher.
- Output: clusters ranked by fit score.

### 5.5 Course ranking
- Within the top clusters, each eligible course gets a **fit score (0–100)** = cluster-fit context + course-specific signals (relevant subject marks as a weighted signal, alignment to the course's profile).
- A clear **#1** is surfaced; ties broken by capability signal then interest match.

### 5.6 Explainability (the USP)
- Every ranked course stores a **per-lens contribution breakdown** and a short plain-language reason (e.g., "matches your Investigative interest + strong numerical aptitude + your Physics marks").
- All weights and target profiles are inspectable/tunable by admins — nothing is a black box.

### 5.7 Edge-case handling
- **Good-at vs loves clash** (high ability X, high interest Y): the weighted blend balances them **and** the result explicitly surfaces the tension and shows both paths.
- **Flat / low-signal profile** (little differentiation): detect it, widen to a broader exploratory shortlist, prompt reflection — do **not** present a falsely-confident #1; lower the confidence indicator.
- **Cross-stream fit**: in-stream recommendations first; surface genuinely reachable cross-stream options with an honest caveat (needs bridging / specific entrance route).
- **Missing/partial data**: not applicable to scoring — all four modules are required to finish (see §4.1); resume covers interruptions.
- **No strong matches** (eligibility wipes out options / all fits low): show best-available with honest framing + a "talk to a counselor" nudge **and** offer retake / add-info. Never a silent dead-end.

---

## 6. The result screen

Order: **Brain Profile → ranked Career Clusters → ranked Courses (#1 highlighted) → Institutes per course.**

- **Brain Profile:** the 4 lenses with a **full strengths + weaknesses breakdown**, framed constructively (honest "developing" areas + what to do, without crushing a 16-year-old).
- **Per-course "why":** factor breakdown showing which lenses drove the ranking.
- **Deep-links:** each recommended course links to its existing **catalogue detail page** (institutes, fees, sources — already built) + relevant **entrance-exam info** + a **save/shortlist** action. Closes the loop into the existing product.
- **No-match fallback:** as §5.7.
- **Delivery:** on-screen **+ downloadable PDF** (no shareable link in v1).

---

## 7. Identity, persistence & lifecycle

- **Account required upfront:** minimal fields — name + phone/email + grade. Adds a **student auth path** (the NextAuth adapter tables already exist for this; admin login is unaffected and remains separate).
- **Persistence:** every **completed** assessment is saved; the student sees his latest result + history.
- **Retake:** allowed after a **~3–6 month cooldown** (admin-overridable via the existing `students.cooldownOverride` field); `students.lastAssessmentAt` gates it.

---

## 8. Data model & schema changes

Builds on existing tables (`students`, `assessments`, `question_bank`, `courses`, `institutes`). Each schema change follows the repo's generate→commit→migrate cycle.

### 8.1 `students` (exists)
- No structural change required for fields; add a **student authentication path** (Credentials/OTP provider) so students can log in. Keep admin auth fully separate.

### 8.2 `assessments` (modify)
- Rename/repurpose `innateScores` → **`workStyleScores`** (jsonb).
- Keep `aptitudeScores` (jsonb, per sub-ability) and `interestData` (jsonb, RIASEC + subjects).
- Add **`marks`** (jsonb: `{ board, subjects: { subject: score }, class10Aggregate? }`).
- Add **`recommendedCourses`** (jsonb: ranked `[{ courseId, fitScore, reasons[] }]`).
- Add **`clusterScores`** (jsonb `[{ clusterKey, score }]`) for ranked cluster fit; keep `careerClustersRanked` (text[]) for ordering/compatibility.
- Add **`confidence`** (enum/text: high | moderate | low) for low-signal / careless flags.
- `recommendedStream` → repurpose to store the student's **known/input stream** (context), not a recommendation.

### 8.3 `question_bank` (modify)
- Update the `assessmentModule` enum: replace **`innate`** with **`work_style`** → `[aptitude, interests, work_style]`. (Marks is data entry, not a question module.)
- `correctOptionId` used for aptitude (answer keys); `scoringMap` used for interests/work-style.
- Add provenance/versioning + pooling: **`source`** (`ICAR | ONET_IP | IPIP | authored`), **`license`**, **`version`** (int), **`poolGroup`** (text, for randomized draws).

### 8.4 NEW `career_clusters` (create)
- Formalizes clusters (today only free-text tags on `courses`): `id`, `key` (matches `courses.careerClusters` tags), `name`, `description`, **`targetProfile`** (jsonb: expected interest/aptitude/work-style pattern), **`lensWeights`** (jsonb: per-lens weights, seeded from the §5.4 default), `active`.

### 8.5 `courses` (modify)
- Add **structured eligibility** for the gate: `requiredSubjects` (text[]), **`eligibility`** (jsonb: `{ minAggregate?, minBySubject?, requiredStreamSubjects?, entranceExams? }`).
- Keep the existing free-text `eligibilityCriteria` (for display) and `careerClusters` (cluster linkage by key).

### 8.6 Seeding
- `question_bank` is populated as **versioned master seed data** from the public-domain sources (§9), tagged by lens (`module`) + `dimension`/sub-domain, with answer keys + scoring maps, after India-English human review.

---

## 9. Question-bank sourcing & seeding

Seed from **validated, public-domain instruments** — credible, free, ownable, non-AI:

| Lens | Source | License | Coverage |
|---|---|---|---|
| Aptitude | **Per-sub-ability blend** (detailed below) | Mostly free / public domain | Numerical, Verbal, Logical/Abstract, Spatial — best free source per sub-ability |
| Interests | **O*NET Interest Profiler** (US DOL) | Free (O*NET Career Exploration Tools License); manual CC-BY 4.0 | 60-item RIASEC (+ 30-item Mini, widget/API) |
| Work-style | **IPIP** (Oregon Research Institute) | Public domain (no fee/permission) | Big-Five facets → 5 work-style traits |
| Subjects/marks | Self-authored | — | India subject lists; marks are data entry |

**Aptitude — per-sub-ability blend (best free source per ability):**
- **Numerical / quantitative →** India **NTA released papers** (CUET General/Quantitative, NATA, NCET) — real, India-relevant, answer-keyed. ⚠️ confirm reuse/commercial terms for government exam content before seeding.
- **Verbal →** **Open Psychometrics** Vocabulary IQ test (free, validated) + **ICAR** verbal reasoning.
- **Logical / abstract →** **Sandia Matrices** free static sets (Raven-like; open cousins MaRs-IB, Hagen Matrices).
- **Spatial →** **ICAR** 3-D rotation (figural — needs hosted image assets).
- **Phase-2 exposure-proofing:** rule-based generators — **Sandia SGMT** (matrices) and **IMak** (figural analogies). These are *Automatic Item Generation* (deterministic, validated, difficulty-predictable) — **not** LLM-generated — yielding unlimited, retake-safe items. Added once the curated blend is live.
- **ETS Kit of Factor-Referenced Cognitive Tests** considered but rejected for v1 (royalty license + dated 1976 content → no true ownership).

- **Paid providers rejected:** they license access to *their* test; you can't extract items to own/seed a master bank. Public-domain sources preserve ownership and the USP.
- **India localization:** matrix/spatial/number-series are culture-fair; verbal items + O*NET activity statements get a **light India-English human review** (not AI) before seeding.
- **Attribution:** O*NET requires attribution + a "not endorsed" note; ICAR/IPIP courtesy-cite. All permit commercial use + modification — **confirm exact license terms against the official pages before launch.**
- **Item exposure:** items are publicly findable; acceptable for a low-stakes tool, mitigated by randomized-from-pool draws and rotation over time.

Sources: O*NET IP (onetcenter.org/IP.html); IPIP (ipip.ori.org); ICAR (icar-project.com / .org; Condon & Revelle, 2014); Sandia Matrices (scholarworks.bgsu.edu/pad/vol6/iss3/6); IMak (Blum & Holling, 2018); Open Psychometrics (openpsychometrics.org); India NTA released papers (nta.ac.in).

---

## 10. Scope (v1) & deferred

**In v1:** full 4-lens assessment (seeded, integrity-protected) · deterministic hybrid engine (gate → per-cluster match → ranked courses) · explainable result (Brain Profile → clusters → courses → institutes, per-course why, full strengths/weaknesses, PDF, deep-links) · account + history + retake-cooldown · admin management of question bank, cluster profiles/weights, course eligibility.

**Deferred:** per §2 (percentile benchmarking, marks verification, weight auto-tuning, ML, i18n, parent view, share links, class 9–10 stream flow) **plus rule-based aptitude item generators (Sandia SGMT / IMak) as a phase-2 exposure-proofing upgrade.**

---

## 11. Learning loop

- Log results and (later) outcome feedback.
- Admins refine **per-cluster weights** and **target profiles** as evidence accrues.
- Reconsider ML only once there is real labeled outcome data. Deterministic now, data-driven later.

---

## 12. Open risks & mitigations

1. **DPDP Act / minor consent (HIGH):** the entire user base is <18. "Standard signup, no special handling" was chosen — India's DPDP Act requires verifiable parental consent for processing children's data. **Needs legal sign-off before launch.** Mitigation path: add a guardian-consent step at signup if legal requires.
2. **Validity evidence trail:** lens selection is grounded — MI is contested/redundant with aptitude (replaced by O*NET work-style); RIASEC interests predict choice/persistence (modest magnitude → blended, not solo); GMA and prior marks are strong success predictors. Keep this rationale with the spec.
3. **Item exposure:** public-domain items are findable — mitigated by low-stakes framing + randomized pool; expand/rotate over time.
4. **Norming cold-start:** percentile "competitive" benchmark deferred until cohort data exists; launch with raw cut-bands.
5. **English-only / no i18n:** caps regional reach; accepted as a later-rework tradeoff.
6. **Self-reported marks:** unverified at launch (sanity checks only); verification deferred.

---

## 13. Success criteria

- A class 11–12 student completes the assessment in ~20–25 min and receives a ranked course shortlist with a clear #1.
- Every recommended course shows a per-lens "why" and deep-links to its catalogue detail + institutes.
- The scoring path is fully deterministic and inspectable (no LLM); admins can tune per-cluster weights/profiles and manage the seeded item bank.
- Results are saved, retrievable, and retake-gated by cooldown.
- All §5.7 edge cases behave as specified.
- The question bank is seeded only from validated, reviewed, public-domain items (no AI-generated items in production).
