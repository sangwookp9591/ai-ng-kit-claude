/**
 * aing Plan Pre-execution Gate — Blocks vague requests before planning.
 * Reuses intent-router anchor patterns to determine request specificity.
 * Returns PASS for concrete requests, BLOCK for vague ones.
 * @module scripts/hooks/plan-gate
 */

import { createLogger } from '../core/logger.js';

const log = createLogger('plan-gate');

// ---------------------------------------------------------------------------
// Anchor patterns (mirrored from intent-router.ts)
// ---------------------------------------------------------------------------

const FILE_PATH_PATTERNS: RegExp[] = [
  /src\//,
  /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|c|cpp|cs|rb|php|swift|kt)\b/,
  /\b(lib|dist|build|app|pages|components|utils|hooks|services|api|models|controllers|routes)\//,
];

const SYMBOL_PATTERNS: RegExp[] = [
  /\b[a-z][a-zA-Z0-9]{2,}[A-Z][a-zA-Z0-9]*\b/,  // camelCase
  /\b[A-Z][a-zA-Z0-9]{2,}[A-Z][a-zA-Z0-9]*\b/,  // PascalCase
  /\b[a-z]+_[a-z][a-z0-9_]{2,}\b/,               // snake_case
];

const ISSUE_REF = /#\d+/;
const ERROR_PATTERNS: RegExp[] = [
  /\b(TypeError|ReferenceError|SyntaxError|RangeError|Error:)\b/,
  /\bException\b/,
];
const CODE_BLOCK = /```/;
const NUMBERED_LIST = /^\s*\d+\.\s+/m;
const ACCEPTANCE_CRITERIA = /\b(acceptance|criteria|수락|기준|완료\s*조건)\b/i;
const FORCE_PREFIX = /^force:/i;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GateResult {
  verdict: 'PASS' | 'BLOCK';
  anchorsFound: string[];
  reason: string;
}

// ---------------------------------------------------------------------------
// Gate Check
// ---------------------------------------------------------------------------

/**
 * Check if a plan request has enough specificity to proceed.
 * Returns PASS if any concrete anchor is detected, BLOCK otherwise.
 */
export function checkPlanGate(input: string): GateResult {
  // Force bypass
  if (FORCE_PREFIX.test(input)) {
    return { verdict: 'PASS', anchorsFound: ['force:'], reason: 'Force bypass' };
  }

  const anchors: string[] = [];

  for (const p of FILE_PATH_PATTERNS) {
    if (p.test(input)) anchors.push('file-path');
  }
  for (const p of SYMBOL_PATTERNS) {
    if (p.test(input)) anchors.push('code-symbol');
  }
  if (ISSUE_REF.test(input)) anchors.push('issue-ref');
  for (const p of ERROR_PATTERNS) {
    if (p.test(input)) anchors.push('error-ref');
  }
  if (CODE_BLOCK.test(input)) anchors.push('code-block');
  if (NUMBERED_LIST.test(input)) anchors.push('numbered-list');
  if (ACCEPTANCE_CRITERIA.test(input)) anchors.push('acceptance-criteria');

  // Word count check — very short input with no anchors is vague
  const wordCount = input.trim().split(/\s+/).length;

  if (anchors.length > 0) {
    log.info('Plan gate PASS', { anchors, wordCount });
    return {
      verdict: 'PASS',
      anchorsFound: [...new Set(anchors)],
      reason: `${anchors.length} anchor(s) found: ${[...new Set(anchors)].join(', ')}`,
    };
  }

  // Allow longer requests (>15 words) even without anchors — they likely have enough context
  if (wordCount > 15) {
    log.info('Plan gate PASS (word count)', { wordCount });
    return {
      verdict: 'PASS',
      anchorsFound: ['long-description'],
      reason: `${wordCount} words — sufficient context`,
    };
  }

  log.info('Plan gate BLOCK', { wordCount, input: input.slice(0, 80) });
  return {
    verdict: 'BLOCK',
    anchorsFound: [],
    reason: `No anchors found and input is short (${wordCount} words). Add file paths, code symbols, numbered steps, or acceptance criteria.`,
  };
}
