/**
 * aing Context Budget System (Innovation #1)
 *
 * Tracks approximate token consumption per hook injection.
 * Uses word-based estimation (no external dependencies).
 *
 * IMPORTANT: All values are approximations (~).
 * Not a substitute for exact tokenizer counts.
 *
 * @module scripts/core/context-budget
 */

import { getConfig } from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('context-budget');

interface Injection {
  source: string;
  tokens: number;
  ts: string;
}

interface BudgetState {
  total: number;
  injections: Injection[];
  warnings: string[];
}

interface TrackInjectionResult {
  tokens: number;
  totalUsed: number;
  overBudget: boolean;
}

interface BudgetStatus {
  total: number;
  injections: Injection[];
  warnings: string[];
}

// Session-scoped budget tracker (in-memory, reset per session)
let _budget: BudgetState = {
  total: 0,
  injections: [],
  warnings: []
};

/**
 * Estimate token count from text.
 * Approximation: ~0.75 tokens per English word, ~2 tokens per Korean character cluster.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let tokens = 0;
  // Split by whitespace for word-level estimation
  const segments = text.split(/\s+/).filter(Boolean);

  for (const segment of segments) {
    // Korean characters: ~2 tokens per syllable block
    const koreanChars = (segment.match(/[\uAC00-\uD7AF]/g) || []).length;
    // ASCII/Latin: ~1.3 tokens per word (accounts for subword tokenization)
    const nonKoreanLength = segment.length - koreanChars;

    tokens += koreanChars * 2;
    if (nonKoreanLength > 0) {
      tokens += Math.ceil(nonKoreanLength / 4); // ~4 chars per token for code/English
    }
  }

  return Math.max(1, Math.round(tokens));
}

/**
 * Record a context injection and check budget.
 * @param source - Hook/module name (e.g. 'session-start', 'pre-tool-use')
 * @param content - Injected context text
 */
export function trackInjection(source: string, content: string): TrackInjectionResult {
  const tokens = estimateTokens(content);
  const maxTokens = getConfig('context.maxSessionStartTokens', 2000) as number;

  _budget.total += tokens;
  _budget.injections.push({
    source,
    tokens,
    ts: new Date().toISOString()
  });

  const warningThreshold = getConfig('context.budgetWarningThreshold', 0.8) as number;
  const overBudget = _budget.total > maxTokens;

  if (overBudget) {
    const warning = `Context budget exceeded: ~${_budget.total} / ${maxTokens} tokens (source: ${source})`;
    _budget.warnings.push(warning);
    log.warn(warning);
  } else if (_budget.total / maxTokens > warningThreshold) {
    log.info(`Context budget at ~${Math.round((_budget.total / maxTokens) * 100)}% (source: ${source})`);
  }

  return {
    tokens,
    totalUsed: _budget.total,
    overBudget
  };
}

/**
 * Get current budget status.
 */
export function getBudgetStatus(): BudgetStatus {
  return {
    total: _budget.total,
    injections: _budget.injections.map(i => ({ ...i })),
    warnings: [..._budget.warnings]
  };
}

/**
 * Reset budget tracking (called at session start).
 */
export function resetBudget(): void {
  _budget = { total: 0, injections: [], warnings: [] };
}

/**
 * Trim content to fit within a token budget.
 * Prioritizes keeping the beginning of content.
 */
export function trimToTokenBudget(content: string, maxTokens: number): string {
  const estimated = estimateTokens(content);
  if (estimated <= maxTokens) return content;

  // Approximate character count for target token count
  const ratio = maxTokens / estimated;
  const targetLength = Math.floor(content.length * ratio * 0.9); // 10% safety margin
  return content.slice(0, targetLength) + '\n... [trimmed to fit ~' + maxTokens + ' token budget]';
}
