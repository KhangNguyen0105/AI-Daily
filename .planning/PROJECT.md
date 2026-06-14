# AI Daily

## What This Is

An automated daily intelligence platform that tracks AI model pricing, free token programs, promotions, beta trials, and new model releases across 30+ providers. It converts abstract per-token pricing into practical cost examples developers actually understand — like "10 long prompts" or "1 coding-agent session" — and publishes daily articles to a public dashboard. Fully automated collection with AI-powered extraction, confidence scoring, and safety controls. Admin-only content management; visitors read only.

## Core Value

Developers can instantly understand what AI models actually cost in real-world usage — not per-token abstractions, but practical examples like prompts, coding tasks, document processing, and agent sessions.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Daily automated collection from 30+ AI providers (official sources prioritized)
- [ ] AI-powered extraction of pricing, promotions, free tokens, model updates
- [ ] Practical cost visualization (prompt-based, coding tasks, document processing, agent sessions)
- [ ] Historical pricing comparison tables and trend charts
- [ ] Daily article auto-generation and publishing
- [ ] Confidence scoring (verified / likely / low-confidence) for all collected data
- [ ] Source URL and raw evidence storage
- [ ] Admin dashboard for monitoring, editing, and rollback
- [ ] Read-only public site — no visitor registration or accounts
- [ ] Admin-only content editing and deletion

### Out of Scope

- User accounts / registration — visitors are read-only, no auth for public users
- Real-time streaming updates — daily batch is sufficient
- Mobile app — web-first
- Paid/premium features — free for everyone
- Manual data entry workflow — automated collection is the primary flow

## Context

**Target audience:** Developers choosing AI models for their projects and applications.

**Provider coverage (30+ sources):**

Major AI providers: OpenAI, Anthropic, Google Gemini, Meta AI, Mistral AI, Cohere

Chinese/Asian providers: Xiaomi MiMo, DeepSeek, Alibaba Qwen, Moonshot AI/Kimi, Baidu ERNIE, Zhipu AI/GLM, MiniMax, Tencent Hunyuan

Inference/API platforms: OpenRouter, Together AI, Fireworks AI, Groq, Cerebras, Perplexity API, Replicate, Hugging Face Inference Providers, SiliconFlow, Novita AI

Cloud providers: AWS Bedrock, Azure AI Foundry, Google Vertex AI, Cloudflare Workers AI

Open-source ecosystem: Hugging Face model cards, Ollama, LM Studio, llama.cpp releases

**Source prioritization:** Official pricing pages > official docs > official blogs > API docs > changelogs > console announcements. Community sources are low-confidence signals only.

**Practical cost examples (v1):**
- Prompt-based: "10 long prompts" (~1K tokens in, ~2K out per prompt)
- Coding tasks: "100 LeetCode Hard tasks" (estimated tokens per coding problem)
- Document processing: "Summarize a 100-page document" (input-heavy workload)
- Agent sessions: "1 coding-agent session" (agentic loop with tool use)

**Safety controls:**
- Store source URLs and raw evidence snippets
- Assign confidence scores (verified / likely / low-confidence)
- Avoid publishing low-confidence claims unless clearly marked
- Log all automated decisions
- Admin can manually edit or rollback after publishing

## Constraints

- **Tech stack**: Next.js frontend, Node.js backend, PostgreSQL, Docker
- **AI generation**: Multi-provider (configurable — Claude, OpenAI, etc.)
- **Schedule**: Daily fixed-time collection and article generation
- **Access model**: Public read-only, admin-only content management (no visitor registration)
- **Deployment**: Docker containers
- **Cost**: Free for all users, no monetization in v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fully automated pipeline | Daily cadence doesn't need manual approval; safety controls handle edge cases | — Pending |
| Confidence scoring over manual review | Scale requires automation; scoring lets admin focus on anomalies | — Pending |
| Practical cost examples as hero feature | Differentiator — nobody else converts per-token pricing to real-world usage | — Pending |
| Read-only public site | Simplifies architecture, no auth/user management needed for v1 | — Pending |
| Multi-provider AI generation | Avoid vendor lock-in for article generation | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-10 after initialization*
