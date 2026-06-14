# Phase 6: Daily Content Engine - Discussion Log

**Date:** 2026-06-14
**Duration:** ~10 minutes
**Areas discussed:** 4

## Area 1: Article Content & Format

| Question | Options | Selection |
|----------|---------|-----------|
| Article structure | Structured prose / Categorized sections / Executive summary + bullets | Structured prose |
| Content strategy | Diff-based (today vs yesterday) / Snapshot-based / Hybrid | Diff-based |
| Article length | Short (300-500) / Medium (500-800) / Long (800-1200) | Short (300-500) |
| Section format | Fixed 4-section / Dynamic sections / Progressive disclosure | Fixed 4-section |
| Tone | Neutral/factual / Conversational/editorial / Wire/telegram | Neutral/factual |
| Quiet days | Publish 'no changes' / Skip / Market summary | Publish 'no changes' |
| Data inputs | Full data (extractions + promotions + confidence) / Extractions only / Raw extractions | Full data |
| Storage format | Markdown / Structured JSON / Pre-rendered HTML | Markdown |
| URL slug | Date-based / ID-based / Date + headline | Date-based |

## Area 2: Generation Pipeline Integration

| Question | Options | Selection |
|----------|---------|-----------|
| AI approach | Vercel AI SDK generateText() / Direct API calls / generateObject() | generateText() |
| Prompt strategy | Single prompt / Per-section / Two-pass | Single prompt |
| Provider selection | Primary + fallback / Single with retry / Race multiple | Primary + fallback |
| Failure handling | BullMQ retry + fail / Retry + placeholder / Retry + placeholder + alert | BullMQ retry + fail |

## Area 3: Archive Page & Routing

| Question | Options | Selection |
|----------|---------|-----------|
| Route structure | /digest + /digest/[date] / Embedded on landing / Hybrid | /digest + /digest/[date] |
| List layout | Simple list / Card grid / Monthly timeline | Simple list |
| Pagination | Load more (30 initial) / Numbered / Infinite scroll | Load more |
| Article layout | Same as landing / Minimal reader / Article + sidebar | Same as landing |

## Area 4: Publish Flow & Freshness

| Question | Options | Selection |
|----------|---------|-----------|
| Publish flow | Auto-publish immediately / Draft → review → publish / Auto with confidence gate | Auto-publish |
| Freshness display | Published date / Published + collection timestamp / Published + last-updated | Published date |
| Multi-run handling | One per day, upsert / One per run / First run only | One per day, upsert |
| Discovery | SideNav link / DigestCard on landing / Both | SideNav link |
| Rendering | SSG + ISR / Fully dynamic / Full SSG | SSG + ISR |

## Deferred Ideas

None — all discussion stayed within Phase 6 scope.

---

*Discussion log: 2026-06-14*
