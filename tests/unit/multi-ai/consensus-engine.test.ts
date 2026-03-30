/**
 * Unit tests for scripts/multi-ai/consensus-engine.ts
 * Covers: buildConsensus, classifyDecision, DECISION_TYPES
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../scripts/core/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

import {
  buildConsensus,
  classifyDecision,
  DECISION_TYPES,
} from '../../../scripts/multi-ai/consensus-engine.js';

// ── DECISION_TYPES ───────────────────────────────────────────────────────

describe('DECISION_TYPES', () => {
  it('has all 4 decision types', () => {
    expect(DECISION_TYPES.MECHANICAL).toBe('mechanical');
    expect(DECISION_TYPES.TASTE).toBe('taste');
    expect(DECISION_TYPES.USER_CHALLENGE).toBe('user_challenge');
    expect(DECISION_TYPES.SECURITY_WARNING).toBe('security_warning');
  });
});

// ── classifyDecision ─────────────────────────────────────────────────────

describe('classifyDecision', () => {
  it('returns SECURITY_WARNING when hasSecurity', () => {
    expect(classifyDecision({ hasSecurity: true, isUnanimous: true })).toBe('security_warning');
    expect(classifyDecision({ hasSecurity: true, isUnanimous: false })).toBe('security_warning');
  });

  it('returns MECHANICAL when unanimous and no security', () => {
    expect(classifyDecision({ hasSecurity: false, isUnanimous: true })).toBe('mechanical');
  });

  it('returns TASTE when split and no security', () => {
    expect(classifyDecision({ hasSecurity: false, isUnanimous: false })).toBe('taste');
  });

  it('security takes priority over unanimous', () => {
    const result = classifyDecision({ hasSecurity: true, isUnanimous: true });
    expect(result).toBe('security_warning');
  });
});

// ── buildConsensus — empty votes ─────────────────────────────────────────

describe('buildConsensus — empty votes', () => {
  it('returns no_votes for empty array', () => {
    const result = buildConsensus([]);
    expect(result.decision).toBe('no_votes');
    expect(result.unanimous).toBe(false);
    expect(result.autoDecide).toBe(false);
  });

  it('returns no_votes for null/undefined', () => {
    const result = buildConsensus(null as unknown as Array<{ source: string; verdict: 'approve' | 'reject' }>);
    expect(result.decision).toBe('no_votes');
  });
});

// ── buildConsensus — unanimous approve ───────────────────────────────────

describe('buildConsensus — unanimous approve', () => {
  it('approves when all 3 voters approve', () => {
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 8 },
      { source: 'codex', verdict: 'approve', confidence: 9 },
      { source: 'gemini', verdict: 'approve', confidence: 7 },
    ]);

    expect(result.decision).toBe('approve');
    expect(result.unanimous).toBe(true);
    expect(result.majority).toBe('approve');
  });

  it('auto-decides when avg confidence >= 7', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'approve', confidence: 8 },
      { source: 'b', verdict: 'approve', confidence: 9 },
      { source: 'c', verdict: 'approve', confidence: 7 },
    ]);

    expect(result.autoDecide).toBe(true);
    expect(result.challengeType).toBe('mechanical');
  });

  it('does not auto-decide when avg confidence < 7', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'approve', confidence: 5 },
      { source: 'b', verdict: 'approve', confidence: 6 },
      { source: 'c', verdict: 'approve', confidence: 4 },
    ]);

    expect(result.autoDecide).toBe(false);
  });

  it('defaults to confidence 5 when not provided', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'approve' },
      { source: 'b', verdict: 'approve' },
    ]);

    expect(result.avgConfidence).toBe(5);
    expect(result.autoDecide).toBe(false); // 5 < 7
  });

  it('generates approve summary', () => {
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 9 },
      { source: 'codex', verdict: 'approve', confidence: 8 },
    ]);

    expect(result.summary).toContain('All 2 reviewers approve');
    expect(result.summary).toContain('claude');
    expect(result.summary).toContain('codex');
  });
});

// ── buildConsensus — unanimous reject ────────────────────────────────────

describe('buildConsensus — unanimous reject', () => {
  it('rejects when all voters reject', () => {
    const result = buildConsensus([
      { source: 'claude', verdict: 'reject', confidence: 8 },
      { source: 'codex', verdict: 'reject', confidence: 7 },
    ]);

    expect(result.decision).toBe('reject');
    expect(result.unanimous).toBe(true);
    expect(result.autoDecide).toBe(false);
    expect(result.challengeType).toBe('user_challenge');
  });

  it('escalates to security_warning when reasoning mentions security', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'reject', reasoning: 'XSS vulnerability found' },
      { source: 'b', verdict: 'reject', reasoning: 'Injection risk detected' },
    ]);

    expect(result.decision).toBe('reject');
    expect(result.challengeType).toBe('security_warning');
  });

  it('detects security keywords (auth, csrf, xss)', () => {
    const testCases = [
      'Missing authentication check',
      'CSRF token not validated',
      'XSS in user input',
      'SQL injection vulnerability',
    ];

    for (const reasoning of testCases) {
      const result = buildConsensus([
        { source: 'a', verdict: 'reject', reasoning },
      ]);
      expect(result.challengeType).toBe('security_warning');
    }
  });

  it('generates reject summary with USER CHALLENGE', () => {
    const result = buildConsensus([
      { source: 'claude', verdict: 'reject', confidence: 9 },
    ]);

    expect(result.summary).toContain('All 1 reviewers reject');
    expect(result.summary).toContain('USER CHALLENGE');
  });
});

// ── buildConsensus — split decisions ─────────────────────────────────────

describe('buildConsensus — split decisions', () => {
  it('returns split when votes are mixed', () => {
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 8 },
      { source: 'codex', verdict: 'reject', confidence: 6 },
      { source: 'gemini', verdict: 'approve', confidence: 7 },
    ]);

    expect(result.decision).toBe('split');
    expect(result.unanimous).toBe(false);
    expect(result.autoDecide).toBe(false);
  });

  it('identifies majority correctly', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'approve', confidence: 7 },
      { source: 'b', verdict: 'approve', confidence: 6 },
      { source: 'c', verdict: 'reject', confidence: 8 },
    ]);

    expect(result.majority).toBe('approve');
  });

  it('classifies as TASTE when split without security', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'approve', reasoning: 'Looks clean' },
      { source: 'b', verdict: 'reject', reasoning: 'Style concern' },
    ]);

    expect(result.challengeType).toBe('taste');
  });

  it('classifies as SECURITY_WARNING when split with security reasoning', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'approve', reasoning: 'Code looks fine' },
      { source: 'b', verdict: 'reject', reasoning: 'Found auth bypass vulnerability' },
    ]);

    expect(result.challengeType).toBe('security_warning');
  });

  it('generates split summary', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'approve', confidence: 8 },
      { source: 'b', verdict: 'reject', confidence: 6 },
    ]);

    expect(result.summary).toContain('Split decision');
    expect(result.summary).toContain('2 voters');
  });
});

// ── buildConsensus — output format ───────────────────────────────────────

describe('buildConsensus — output format', () => {
  it('includes all votes in result', () => {
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 8, reasoning: 'Good code' },
    ]);

    expect(result.votes).toHaveLength(1);
    expect(result.votes![0].source).toBe('claude');
    expect(result.votes![0].verdict).toBe('approve');
    expect(result.votes![0].confidence).toBe(8);
    expect(result.votes![0].reasoning).toBe('Good code');
  });

  it('truncates long reasoning to 500 chars', () => {
    const longReasoning = 'x'.repeat(1000);
    const result = buildConsensus([
      { source: 'a', verdict: 'approve', reasoning: longReasoning },
    ]);

    expect(result.votes![0].reasoning.length).toBe(500);
  });

  it('computes avgConfidence correctly', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'approve', confidence: 8 },
      { source: 'b', verdict: 'approve', confidence: 6 },
      { source: 'c', verdict: 'approve', confidence: 10 },
    ]);

    expect(result.avgConfidence).toBe(8); // (8+6+10)/3 = 8
  });

  it('rounds avgConfidence to 1 decimal', () => {
    const result = buildConsensus([
      { source: 'a', verdict: 'approve', confidence: 7 },
      { source: 'b', verdict: 'approve', confidence: 8 },
      { source: 'c', verdict: 'approve', confidence: 9 },
    ]);

    // (7+8+9)/3 = 8.0
    expect(result.avgConfidence).toBe(8);
  });
});
