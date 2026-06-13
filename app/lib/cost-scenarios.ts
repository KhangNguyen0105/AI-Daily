/**
 * Cost scenario definitions for practical pricing comparisons.
 * Translates abstract per-token pricing into real-world usage examples
 * that developers actually understand.
 */

export interface CostScenario {
  id: string;
  name: string;
  description: string;
  inputTokens: number;
  outputTokens: number;
  icon: string;
}

export const COST_SCENARIOS: CostScenario[] = [
  {
    id: 'long-prompts',
    name: '10 Long Prompts',
    description: 'Detailed questions with context (~1K tokens in, ~2K out each)',
    inputTokens: 10_000,
    outputTokens: 20_000,
    icon: 'chat-bubble',
  },
  {
    id: 'leetcode-hard',
    name: '100 LeetCode Hard Tasks',
    description: 'Complex coding problems with solutions (~500 in, ~1.5K out each)',
    inputTokens: 50_000,
    outputTokens: 150_000,
    icon: 'code-bracket',
  },
  {
    id: 'document-summary',
    name: 'Summarize 100-Page Document',
    description: 'Long document input with summary output (~65K in, ~5K out)',
    inputTokens: 65_000,
    outputTokens: 5_000,
    icon: 'document-text',
  },
  {
    id: 'coding-agent',
    name: '1 Coding-Agent Session',
    description: 'Full agentic session with tool use (~200K in, ~50K out)',
    inputTokens: 200_000,
    outputTokens: 50_000,
    icon: 'cpu-chip',
  },
];
