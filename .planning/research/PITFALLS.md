# Domain Pitfalls

**Domain:** AI Model Pricing Tracking + Automated Content Generation
**Researched:** 2026-06-10

## Critical Pitfalls

Mistakes that cause rewrites, data disasters, or project death.

---

### Pitfall 1: Selector Rot — The 40-60% Time Sink

**What goes wrong:** CSS/XPath selectors break constantly across 30+ provider sites. Providers redesign pricing pages, rename CSS classes, change table structures, or migrate to new frontend frameworks. Scrapers silently return empty data or stale cached data instead of failing loudly.

**Why it happens:** AI provider pricing pages are marketing pages, not stable APIs. Marketing teams redesign frequently. Some providers (especially Chinese ones like Moonshot, Zhipu) update pages without any changelog. Others use JavaScript-rendered SPAs where the DOM structure changes with every deploy.

**Consequences:** Engineering spends 40-60% of time maintaining existing scrapers instead of building new features. Data silently goes stale. Users see outdated pricing and lose trust. The daily pipeline "succeeds" but produces garbage.

**Prevention:**
- Use schema-based extraction (expect a data shape, not a DOM shape) rather than fragile CSS selectors
- For each provider, define an expected JSON schema for pricing data; validate scraped data against it
- Implement "absence of change" detection: if pricing data is identical N days in a row, flag for manual review
- Prioritize API endpoints over HTML scraping wherever possible (OpenRouter has `/api/v1/models`, many providers have structured docs)
- Build a fallback hierarchy: API endpoint > structured docs page > pricing page HTML > blog post
- Keep raw HTML snapshots alongside extracted data so broken selectors can be diagnosed retroactively

**Detection:** Monitor per-source extraction rates. If a source returns 0 new records or identical records for 2+ consecutive runs, the selector is likely broken.

**Phase:** Phase 1 (Foundation) — design the scraper architecture to be schema-driven from day one. Retrofitting is painful.

---

### Pitfall 2: LLM Hallucination in Auto-Published Data

**What goes wrong:** LLMs extracting pricing data invent plausible but wrong numbers. Research shows hallucination rates of 3-27% depending on task complexity. For a pricing tracker, even a 3% rate means publishing wrong prices weekly across 30+ sources.

**Why it happens:** LLMs are trained to produce plausible completions. When a pricing page is ambiguous, partially loaded, or uses unusual formatting, the model "fills in" gaps with confident-sounding but fabricated data. This is especially dangerous because the output looks structurally correct.

**Consequences:** CNET published AI-generated financial articles with incorrect compound interest calculations. Sports Illustrated published under fake AI author names. Google AI Overviews told users to put glue on pizza. For a pricing tracker, publishing wrong prices destroys the core value proposition — users will check one price, find it wrong, and never return.

**Prevention:**
- Never auto-publish raw LLM extraction. Always cross-reference against the source URL and raw evidence snippet
- Implement a two-pass extraction: first LLM extracts, then a second independent check (different model or rule-based validator) verifies key claims
- Store the raw source text alongside extracted data so discrepancies are auditable
- For pricing numbers specifically: validate that extracted prices are within a reasonable range (not 0, not 1000x the previous day's price)
- Use structured output (JSON schema enforcement) rather than free-form extraction — models are far more reliable when constrained to a schema
- Flag any extraction where the LLM's confidence is below a threshold for mandatory human review

**Detection:** Compare extracted prices against the previous day's values. Any change >50% should be flagged. Track per-model hallucination rates over time.

**Phase:** Phase 1 (Foundation) — build the confidence scoring and verification pipeline before any auto-publishing happens.

---

### Pitfall 3: Silent Pipeline Failures

**What goes wrong:** The daily cron job runs, exits with code 0, but produces no useful data or publishes stale/empty content. Nobody notices for days or weeks because "the pipeline ran successfully."

**Why it happens:** Traditional monitoring checks "did the process exit successfully?" not "did the process produce meaningful output?" A scraper that returns HTTP 200 but an empty page, an LLM extraction that gets empty input, or a publisher that writes a template with no data — all succeed technically but fail functionally.

**Consequences:** Users visit the site and see yesterday's data (or no data). Trust erodes. By the time someone notices, days of data are missing and can't be recovered retroactively (source pages may have changed).

**Prevention:**
- Implement dead man's switch monitoring: the pipeline must emit a "heartbeat with data" within a defined window, or an alert fires
- At each pipeline stage, validate expected outputs: minimum row counts, non-empty fields, data freshness timestamps
- Log structured metadata for every run: sources attempted, sources succeeded, records extracted, records published, errors encountered
- Build a pipeline dashboard that shows last-run status, data freshness, and extraction rates per source
- Set up alerts for: zero records extracted, extraction rate drops >20% vs rolling average, pipeline duration exceeds SLA
- Design idempotent pipeline stages so a failed run can be safely re-executed from the failure point

**Detection:** If no admin checks the dashboard for 48 hours, the dead man's switch should fire. Track "time since last meaningful data" as a core metric.

**Phase:** Phase 1 (Foundation) — monitoring must be built alongside the pipeline, not added later.

---

### Pitfall 4: Tokenizer Mismatch in Cost Calculations

**What goes wrong:** The "practical cost examples" feature (core differentiator) uses estimated token counts, but each model provider uses a different tokenizer. The same 1000-word prompt is ~1300 tokens in GPT, ~1200 in Claude, and ~1100 in Gemini. Cost estimates become inaccurate, sometimes by 20-30%.

**Why it happens:** Developers assume "token" is a universal unit. It is not. OpenAI uses BPE (tiktoken), Anthropic uses a custom tokenizer, Google uses SentencePiece. The differences compound with multilingual content, code, and structured formats like JSON.

**Consequences:** The hero feature — "10 long prompts costs $X" — is wrong for specific models. Developers who verify the estimate against their actual API bills find discrepancies and lose trust. The entire value proposition collapses if the practical examples are inaccurate.

**Prevention:**
- Use model-specific tokenizers for cost estimation: tiktoken for OpenAI, anthropic-tokenizer for Claude, Gemini's count_tokens API for Google
- Present cost examples as ranges ("$0.15-$0.20 per 10 long prompts") rather than exact figures
- Clearly state the tokenizer assumptions in the methodology section
- For providers without official tokenizers, use a conservative heuristic (~4 chars per token) and mark as low-confidence
- Update tokenizer libraries regularly as providers release new models with different tokenizers

**Detection:** Periodically verify estimated costs against actual API bills for a sample of models. Track deviation rates.

**Phase:** Phase 2 (Data Engine) — tokenizer integration is needed before practical cost examples go live.

---

### Pitfall 5: Source Diversity Explosion

**What goes wrong:** The 30+ providers don't just have different page layouts — they have fundamentally different data models. Some list per-token prices, some use tiered subscriptions, some have regional pricing, some have free tiers with rate limits, some have batch vs. real-time pricing. Trying to normalize all of this into one schema leads to either a schema so generic it's useless or so complex it's unmaintainable.

**Why it happens:** AI pricing is genuinely complex. AWS Bedrock charges differently per region. OpenAI has different prices for batch vs. real-time API. Some Chinese providers (DeepSeek, Qwen) have pricing in RMB. Open-source models (Ollama, llama.cpp) have no direct pricing — cost is compute. Hugging Face has both free and paid inference endpoints. Each provider's pricing model is a snowflake.

**Consequences:** The normalization layer becomes the most complex part of the system. Every new provider requires custom mapping logic. Edge cases accumulate. The data model has so many nullable fields it's effectively schemaless.

**Prevention:**
- Design a tiered data model: a universal core (model name, provider, input/output price per million tokens, currency) plus provider-specific extension fields
- Accept that some providers won't fit the standard model — open-source/local models need compute cost estimation, not per-token pricing
- Build provider adapters (one per source) rather than trying to build a universal scraper
- Use a provider configuration file (JSON/YAML) that defines: source URL, extraction strategy, schema mapping, currency, special handling notes
- Don't try to normalize everything in v1. Start with the 10 most important providers, get the schema right, then expand

**Detection:** If adding a new provider takes more than 2 days of engineering, the normalization layer is too rigid.

**Phase:** Phase 1 (Foundation) — data model design must accommodate diversity from the start.

---

## Moderate Pitfalls

### Pitfall 6: Anti-Bot Protection Escalation

**What goes wrong:** Provider pricing pages are behind Cloudflare, CAPTCHAs, or rate limiting. Scrapers get blocked, and bypassing becomes an arms race that consumes engineering time and may violate terms of service.

**Prevention:**
- Prioritize official APIs and structured docs over HTML scraping
- Use official RSS/Atom feeds and changelog pages where available
- For pages that require scraping: use Playwright (not raw HTTP), respect rate limits, rotate user agents
- Accept that some providers will need manual verification — track which sources are automated vs. manual
- Consider scraping-as-a-service (ScrapingBee, Bright Data) for heavily protected sites rather than building bypass infrastructure

**Phase:** Phase 2 (Data Engine) — build the provider adapter framework with anti-bot handling as a first-class concern.

---

### Pitfall 7: Pricing Page Format Diversity

**What goes wrong:** Some providers show pricing in HTML tables, some in interactive JavaScript calculators, some in blog posts, some only in API documentation, some in PDF datasheets. A single scraping strategy cannot handle all formats.

**Prevention:**
- Classify each provider's pricing format: static HTML table, JS-rendered table, API endpoint, documentation page, blog post, PDF
- Build extraction strategies per format type, not per provider
- For JS-rendered content, use Playwright with explicit waits for pricing elements
- For API endpoints (like OpenRouter's `/api/v1/models`), use direct HTTP — it's more reliable than scraping
- Store the extraction strategy alongside the provider config so failures can be diagnosed quickly

**Phase:** Phase 2 (Data Engine) — format classification and strategy selection.

---

### Pitfall 8: Currency and Regional Pricing Chaos

**What goes wrong:** Chinese providers (DeepSeek, Qwen, Moonshot) list prices in RMB. AWS Bedrock and Azure have region-specific pricing. Some providers have USD and EUR tiers. Currency conversion introduces another source of inaccuracy and staleness.

**Prevention:**
- Store all prices in the provider's native currency with a timestamp
- Apply currency conversion at display time, not storage time, using a reliable exchange rate source
- For regional pricing (AWS, Azure), either pick one canonical region (US East) or store per-region data with a region selector
- Clearly label which region/currency each price represents
- Update exchange rates daily alongside the pricing pipeline

**Phase:** Phase 2 (Data Engine) — currency handling in the data model.

---

### Pitfall 9: Stale Data Masquerading as Fresh

**What goes wrong:** The daily pipeline runs but a provider hasn't changed their page. The system records the same data again with today's timestamp. Historical trend charts show "no change" when the reality is "we don't know if it changed." Or worse: a provider changed pricing mid-day and the scraper ran before the change, recording yesterday's price as today's.

**Prevention:**
- Distinguish between "we checked and it's the same" vs. "we couldn't check" vs. "it changed"
- Store a `last_verified_at` timestamp separate from `last_changed_at`
- Track content hashes of source pages to detect actual changes vs. repeated scrapes
- Flag data older than 48 hours as potentially stale even if the pipeline ran
- For high-priority providers (top 10), consider checking twice daily

**Phase:** Phase 2 (Data Engine) — freshness tracking in the data model.

---

### Pitfall 10: Confidence Score Calibration Failure

**What goes wrong:** The confidence scoring system (verified / likely / low-confidence) is poorly calibrated. "Verified" claims turn out to be wrong. "Low-confidence" claims are actually correct. Users learn to ignore the scores, defeating the purpose.

**Prevention:**
- Define clear, measurable criteria for each confidence level (e.g., "verified" = extracted from official API endpoint with matching source URL)
- Track accuracy per confidence level over time: what percentage of "verified" claims were correct?
- Start conservative: only mark as "verified" when the data comes from an official API or structured docs page
- Use "low-confidence" liberally in v1 — it's better to be honest about uncertainty than to be wrong with confidence
- Build an admin feedback loop: when an admin corrects data, record the original confidence level to calibrate scoring

**Phase:** Phase 1 (Foundation) — confidence scoring design.

---

### Pitfall 11: Cost of Running the Pipeline Exceeds Value

**What goes wrong:** Running LLM extraction across 30+ sources daily costs real money in API calls. Playwright headless browsers consume server resources. Storage of raw HTML snapshots, source URLs, and historical data grows unbounded. The project costs more to run than a solo developer can sustain for a free product.

**Prevention:**
- Estimate per-run costs before building: how many LLM calls per source, how many sources, cost per call
- Use cheaper models for extraction (GPT-4o-mini, Claude Haiku) rather than flagship models
- Cache aggressively: don't re-extract from unchanged pages
- Set a monthly cost ceiling and alert when approaching it
- For open-source model tracking, use static analysis of model cards rather than LLM extraction
- Implement incremental scraping: only extract changed sections, not entire pages

**Phase:** Phase 1 (Foundation) — cost modeling before implementation.

---

## Minor Pitfalls

### Pitfall 12: Open-Source Model Pricing Ambiguity

**What goes wrong:** Ollama, llama.cpp, and Hugging Face model cards don't have "pricing" in the traditional sense. Trying to fit them into a per-token pricing model is meaningless. Users expect them on the platform but the data model doesn't accommodate compute-based costs.

**Prevention:**
- Create a separate data model for open-source/local models: GPU requirements, VRAM, inference speed (tokens/sec), hardware cost estimates
- Don't pretend local inference is "free" — help users estimate the real cost of running models locally
- Link to model cards and benchmarks rather than forcing pricing data

**Phase:** Phase 3 (Features) — open-source model support as a distinct feature.

---

### Pitfall 13: Promotion and Free Tier Tracking Complexity

**What goes wrong:** Free token programs, promotions, and beta trials have start dates, end dates, eligibility criteria, and usage limits. Tracking these as simple boolean flags loses critical context. A "free tier" that expires next week is very different from a permanent free tier.

**Prevention:**
- Model promotions as time-bounded events with: start_date, end_date, eligibility, limits, source_url
- Implement expiry detection: flag promotions that are past their end date
- Distinguish between permanent free tiers (Gemini free tier) and temporary promotions (DeepSeek free trial)
- Track promotion history to identify patterns (providers that frequently offer promotions)

**Phase:** Phase 3 (Features) — promotion tracking as a distinct feature.

---

### Pitfall 14: Article Generation Quality Degradation Over Time

**What goes wrong:** Auto-generated daily articles become formulaic and repetitive. "Today in AI pricing: Provider X updated their prices. Provider Y launched a new model." Readers stop visiting because every article reads the same.

**Prevention:**
- Vary article structure: some days focus on comparisons, some on trends, some on a single provider deep-dive
- Inject actual analysis: "This price drop suggests Provider X is competing with Provider Y's recent move"
- Track reader engagement metrics (if available) to identify which article formats work
- Allow admin to set article themes or focus areas for specific days
- Use multiple LLM providers for generation to avoid single-model monotony

**Phase:** Phase 3 (Features) — article quality and variety.

---

### Pitfall 15: Data Model Rigidity Blocks New Provider Types

**What goes wrong:** The database schema is designed around the first 10 providers. When adding provider #20 (say, a provider with usage-based pricing instead of per-token), the schema doesn't accommodate it. Migrations become painful and risky.

**Prevention:**
- Use a flexible schema pattern: core fields (required for all providers) + JSONB extension fields (provider-specific data)
- Version the data schema and track migrations carefully
- Design for the most complex provider from day one, not the simplest
- Test schema flexibility by mentally adding 5 very different providers before finalizing

**Phase:** Phase 1 (Foundation) — schema design.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Database schema design | Too rigid for provider diversity | Use core + extension pattern, test with 5 diverse providers |
| Scraper architecture | Selector-based fragility | Schema-driven extraction, API-first, fallback hierarchy |
| LLM extraction pipeline | Hallucination in published data | Two-pass verification, structured output, range validation |
| Confidence scoring | Poor calibration, user distrust | Measurable criteria, accuracy tracking, start conservative |
| Daily pipeline | Silent failures, stale data | Dead man's switch, freshness tracking, structured logging |
| Cost calculation | Tokenizer mismatch | Model-specific tokenizers, present ranges, state assumptions |
| Auto-publishing | Wrong data goes live | Verification gates, admin review for anomalies, rollback capability |
| Source expansion | Each new provider takes too long | Provider adapter pattern, config-driven extraction |
| Article generation | Formulaic, repetitive content | Vary formats, inject analysis, track engagement |
| Cost management | Pipeline costs exceed budget | Estimate upfront, use cheap models, cache aggressively |
| Anti-bot protection | Arms race with Cloudflare/CAPTCHAs | Prioritize APIs, use Playwright, accept some manual sources |
| Currency handling | Conversion errors, stale rates | Store native currency, convert at display time, daily rate updates |
| Open-source models | Doesn't fit per-token model | Separate data model, compute cost estimation |
| Promotions tracking | Missing expiry dates, stale promotions | Time-bounded events, expiry detection |
| Regional pricing | Which region to show? | Canonical region or per-region with selector |

## Sources

- Web scraping maintenance burden research: teams report 40-60% engineering time on scraper maintenance when dealing with 30+ sites
- LLM hallucination rates: research shows 3-27% depending on task complexity and model
- CNET AI-generated article errors (2023): factual inaccuracies in auto-published financial content
- Sports Illustrated AI content scandal: fake author names, AI-generated headshots
- Google AI Overviews errors (2024): dangerous advice from hallucinated content
- Cloudflare bot management documentation: multi-layer detection (JS challenges, Turnstile, IP reputation, TLS fingerprinting)
- Tokenizer differences: OpenAI (tiktoken/BPE), Anthropic (custom), Google (SentencePiece) produce different token counts for identical text
- Pipeline monitoring best practices: dead man's switch pattern, Great Expectations, dbt tests for data quality
- AWS Bedrock and Azure AI region-specific pricing documentation
- OpenRouter API endpoint (`/api/v1/models`) as example of structured pricing data
- Chinese AI provider scraping challenges: language barriers, dynamic content, geo-restrictions, CAPTCHAs

---

*Confidence levels: HIGH for selector rot, hallucination, silent failures, tokenizer mismatch (well-documented, widely experienced). MEDIUM for source diversity explosion, anti-bot escalation, currency chaos (observed patterns, less quantified). LOW for article quality degradation, promotion tracking complexity (projected based on domain analysis, less empirical evidence).*
