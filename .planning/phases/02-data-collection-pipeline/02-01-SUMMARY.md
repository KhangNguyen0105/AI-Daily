---
phase: 02-data-collection-pipeline
plan: 01
subsystem: providers
tags: [provider-adapters, anthropic, google, mistral, cohere, groq, together, perplexity, xai, fireworks, deepseek, bedrock, registry]
dependency_graph:
  requires: [01-02]
  provides: [12-provider-adapters, adapter-registry-v2]
  affects: [02-02, 02-03, 02-04, all-pipeline-plans]
tech_stack:
  added: []
  patterns: [provider-adapter-pattern, vercel-ai-sdk-generate-object, zod-schema-validation, playwright-crawler]
key_files:
  created:
    - src/providers/anthropic/config.ts
    - src/providers/anthropic/adapter.ts
    - src/providers/google/config.ts
    - src/providers/google/adapter.ts
    - src/providers/mistral/config.ts
    - src/providers/mistral/adapter.ts
    - src/providers/cohere/config.ts
    - src/providers/cohere/adapter.ts
    - src/providers/groq/config.ts
    - src/providers/groq/adapter.ts
    - src/providers/together/config.ts
    - src/providers/together/adapter.ts
    - src/providers/perplexity/config.ts
    - src/providers/perplexity/adapter.ts
    - src/providers/xai/config.ts
    - src/providers/xai/adapter.ts
    - src/providers/fireworks/config.ts
    - src/providers/fireworks/adapter.ts
    - src/providers/deepseek/config.ts
    - src/providers/deepseek/adapter.ts
    - src/providers/bedrock/config.ts
    - src/providers/bedrock/adapter.ts
    - tests/providers/all-adapters.test.ts
  modified:
    - src/providers/registry.ts (added 11 new adapter imports and registrations)
    - src/lib/env.ts (added GOOGLE_API_KEY, MISTRAL_API_KEY optional env vars)
decisions:
  - "All adapters use OPENAI_API_KEY for extraction LLM (Vercel AI SDK), not their own provider API keys"
  - "DeepSeek normalize() detects per-1K pricing (< $0.01 threshold) and multiplies by 1000 to convert to per-1M"
  - "Bedrock normalize() uses same heuristic for per-1K to per-1M conversion"
  - "Each adapter has provider-specific extraction prompt to guide the LLM"
  - "All adapters use identical Zod schema: { models: [{ modelName, inputPricePer1m, outputPricePer1m, contextWindow }] }"
metrics:
  duration_seconds: 240
  completed: "2026-06-11T14:20:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 23
  files_modified: 2
  test_pass_rate: "90/90 (100%)"
---

# Phase 2 Plan 01: 11 Provider Adapters Summary

Scaled data collection from 1 provider to 12 by adding Anthropic, Google, Mistral, Cohere, Groq, Together AI, Perplexity, xAI, Fireworks AI, DeepSeek, and Amazon Bedrock adapters, each following the established OpenAI adapter pattern with Vercel AI SDK structured extraction.

## Tasks Completed

### Task 1: Create provider configs and adapters for 11 providers
- **Commit:** `19456df`
- **Files:** 22 new files (11 config.ts + 11 adapter.ts)
- **What was done:**
  - Created 11 provider directories with config.ts (name, baseUrl, pricingUrl) and adapter.ts
  - Each adapter extends ProviderAdapter with extract() using Vercel AI SDK generateObject
  - Provider-specific extraction prompts guide the LLM for each provider's model naming conventions
  - DeepSeek and Bedrock adapters have normalize() that detects per-1K pricing and converts to per-1M
  - All adapters truncate HTML to 100K chars before sending to LLM
  - TypeScript compiles cleanly

### Task 2: Register all 12 adapters in registry and write integration test
- **Commit:** `1082946`
- **Files:** src/providers/registry.ts, src/lib/env.ts, tests/providers/all-adapters.test.ts
- **What was done:**
  - Updated registry.ts to import and register all 11 new adapters
  - Added optional GOOGLE_API_KEY and MISTRAL_API_KEY to env.ts schema
  - Created integration test with 5 test cases verifying all 12 adapters registered
  - Full test suite passes (90/90)

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm vitest run tests/providers/all-adapters.test.ts` | 5/5 pass |
| `pnpm vitest run` (full suite) | 90/90 pass |
| `pnpm tsc --noEmit` | Clean |
| `getAllAdapters().length === 12` | Confirmed via test |
| Each adapter retrievable by name | Confirmed via test |
| Each adapter has extract + normalize methods | Confirmed via test |
| Each adapter config has name, baseUrl, pricingUrl | Confirmed via test |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all adapters are fully implemented. The extract() methods require OPENAI_API_KEY and network access to run against real pricing pages (integration, not unit tested).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-02-01 mitigated | all adapter.ts files | Zod schema validates extraction output shape; invalid data rejected |
| T-02-02 mitigated | all adapter.ts files | OPENAI_API_KEY loaded from env, never logged or stored |

## Self-Check: PASSED

- [x] src/providers/anthropic/adapter.ts exports AnthropicAdapter extending ProviderAdapter
- [x] src/providers/google/adapter.ts exports GoogleAdapter extending ProviderAdapter
- [x] src/providers/mistral/adapter.ts exports MistralAdapter extending ProviderAdapter
- [x] src/providers/cohere/adapter.ts exports CohereAdapter extending ProviderAdapter
- [x] src/providers/groq/adapter.ts exports GroqAdapter extending ProviderAdapter
- [x] src/providers/together/adapter.ts exports TogetherAdapter extending ProviderAdapter
- [x] src/providers/perplexity/adapter.ts exports PerplexityAdapter extending ProviderAdapter
- [x] src/providers/xai/adapter.ts exports XAIAdapter extending ProviderAdapter
- [x] src/providers/fireworks/adapter.ts exports FireworksAdapter extending ProviderAdapter
- [x] src/providers/deepseek/adapter.ts exports DeepSeekAdapter extending ProviderAdapter
- [x] src/providers/bedrock/adapter.ts exports BedrockAdapter extending ProviderAdapter
- [x] src/providers/registry.ts registers all 12 adapters
- [x] tests/providers/all-adapters.test.ts passes (5 tests)
- [x] All 90 tests pass (full suite)
- [x] TypeScript compiles with no errors
