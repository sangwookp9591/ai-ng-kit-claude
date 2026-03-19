/**
 * sw-kit Context Budget System (Innovation #1)
 *
 * Tracks approximate token consumption per hook injection.
 * Uses word-based estimation (no external dependencies).
 *
 * IMPORTANT: All values are approximations (~).
 * Not a substitute for exact tokenizer counts.
 *
 * @module scripts/core/context-budget
 */

import { getConfig } from './config.mjs';
import { createLogger } from './logger.mjs';

const log = createLogger('context-budget');

// Session-scoped budget tracker (in-memory, reset per session)
let _budget = {
  total: 0,
  injections: [],
  warnings: []
};

/**
 * Estimate token count from text.
 * Approximation: ~0.75 tokens per English word, ~2 tokens per Korean character cluster.
 * @param {string} text
 * @returns {number} Approximate token count (prefixed with ~ in display)
 */
export function estimateTokens(text) {
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
 * @param {string} source - Hook/module name (e.g. 'session-start', 'pre-tool-use')
 * @param {string} content - Injected context text
 * @returns {{ tokens: number, totalUsed: number, overBudget: boolean }}
 */
export function trackInjection(source, content) {
  const tokens = estimateTokens(content);
  const maxTokens = getConfig('context.maxSessionStartTokens', 2000);

  _budget.total += tokens;
  _budget.injections.push({
    source,
    tokens,
    ts: new Date().toISOString()
  });

  const warningThreshold = getConfig('context.budgetWarningThreshold', 0.8);
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
 * @returns {{ total: number, injections: Array, warnings: string[] }}
 */
export function getBudgetStatus() {
  return { ..._budget };
}

/**
 * Reset budget tracking (called at session start).
 */
export function resetBudget() {
  _budget = { total: 0, injections: [], warnings: [] };
}

/**
 * Trim content to fit within a token budget.
 * Prioritizes keeping the beginning of content.
 * @param {string} content
 * @param {number} maxTokens
 * @returns {string}
 */
export function trimToTokenBudget(content, maxTokens) {
  const estimated = estimateTokens(content);
  if (estimated <= maxTokens) return content;

  // Approximate character count for target token count
  const ratio = maxTokens / estimated;
  const targetLength = Math.floor(content.length * ratio * 0.9); // 10% safety margin
  return content.slice(0, targetLength) + '\n... [trimmed to fit ~' + maxTokens + ' token budget]';
}
