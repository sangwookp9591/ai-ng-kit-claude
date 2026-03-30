/**
 * aing Multi-AI Consensus Engine Test Suite
 * Tests consensus building, CLI bridge factory, and review prompt generation.
 *
 * Run: node --test tests/multi-ai-consensus.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

// ── Consensus Engine ───────────────────────────────────────────────────

describe('Consensus Engine', () => {
  it('unanimous approve with high confidence → autoDecide true', async () => {
    const { buildConsensus } = await import('../scripts/multi-ai/consensus-engine.mjs');
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 9, reasoning: 'Looks good' },
      { source: 'codex', verdict: 'approve', confidence: 8, reasoning: 'Clean code' },
      { source: 'gemini', verdict: 'approve', confidence: 7, reasoning: 'No issues' },
    ]);
    assert.strictEqual(result.decision, 'approve');
    assert.strictEqual(result.unanimous, true);
    assert.strictEqual(result.autoDecide, true);
    assert.strictEqual(result.challengeType, 'mechanical');
    assert.strictEqual(result.avgConfidence, 8);
  });

  it('unanimous approve with low confidence → autoDecide false', async () => {
    const { buildConsensus } = await import('../scripts/multi-ai/consensus-engine.mjs');
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 5 },
      { source: 'codex', verdict: 'approve', confidence: 6 },
    ]);
    assert.strictEqual(result.decision, 'approve');
    assert.strictEqual(result.unanimous, true);
    assert.strictEqual(result.autoDecide, false);
  });

  it('2-1 split → present to user, not autoDecide', async () => {
    const { buildConsensus } = await import('../scripts/multi-ai/consensus-engine.mjs');
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 8 },
      { source: 'codex', verdict: 'approve', confidence: 7 },
      { source: 'gemini', verdict: 'reject', confidence: 6 },
    ]);
    assert.strictEqual(result.decision, 'split');
    assert.strictEqual(result.unanimous, false);
    assert.strictEqual(result.autoDecide, false);
    assert.strictEqual(result.majority, 'approve');
    assert.ok(result.summary.includes('Split decision'));
  });

  it('all reject → USER_CHALLENGE', async () => {
    const { buildConsensus, DECISION_TYPES } = await import('../scripts/multi-ai/consensus-engine.mjs');
    const result = buildConsensus([
      { source: 'claude', verdict: 'reject', confidence: 9, reasoning: 'Fundamentally wrong' },
      { source: 'codex', verdict: 'reject', confidence: 8, reasoning: 'Bad approach' },
    ]);
    assert.strictEqual(result.decision, 'reject');
    assert.strictEqual(result.unanimous, true);
    assert.strictEqual(result.autoDecide, false);
    assert.strictEqual(result.challengeType, DECISION_TYPES.USER_CHALLENGE);
    assert.ok(result.summary.includes('USER CHALLENGE'));
  });

  it('security keyword in reasoning → SECURITY_WARNING', async () => {
    const { buildConsensus, DECISION_TYPES } = await import('../scripts/multi-ai/consensus-engine.mjs');
    const result = buildConsensus([
      { source: 'claude', verdict: 'reject', confidence: 9, reasoning: 'SQL injection vulnerability found' },
      { source: 'codex', verdict: 'reject', confidence: 8, reasoning: 'XSS possible' },
    ]);
    assert.strictEqual(result.challengeType, DECISION_TYPES.SECURITY_WARNING);
  });

  it('taste disagreement (split, no security) → TASTE', async () => {
    const { buildConsensus, DECISION_TYPES } = await import('../scripts/multi-ai/consensus-engine.mjs');
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 7, reasoning: 'Style is fine' },
      { source: 'codex', verdict: 'reject', confidence: 6, reasoning: 'Prefer different naming' },
    ]);
    assert.strictEqual(result.decision, 'split');
    assert.strictEqual(result.challengeType, DECISION_TYPES.TASTE);
  });

  it('2-voter mode (no gemini)', async () => {
    const { buildConsensus } = await import('../scripts/multi-ai/consensus-engine.mjs');
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 8 },
      { source: 'codex', verdict: 'approve', confidence: 9 },
    ]);
    assert.strictEqual(result.votes.length, 2);
    assert.strictEqual(result.decision, 'approve');
    assert.strictEqual(result.unanimous, true);
    assert.strictEqual(result.autoDecide, true);
  });

  it('single-voter mode (claude only)', async () => {
    const { buildConsensus } = await import('../scripts/multi-ai/consensus-engine.mjs');
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 10 },
    ]);
    assert.strictEqual(result.votes.length, 1);
    assert.strictEqual(result.decision, 'approve');
    assert.strictEqual(result.unanimous, true);
    assert.strictEqual(result.autoDecide, true);
  });

  it('empty votes → no_votes', async () => {
    const { buildConsensus } = await import('../scripts/multi-ai/consensus-engine.mjs');
    assert.deepStrictEqual(
      buildConsensus([]),
      { decision: 'no_votes', unanimous: false, autoDecide: false },
    );
    assert.deepStrictEqual(
      buildConsensus(null),
      { decision: 'no_votes', unanimous: false, autoDecide: false },
    );
  });

  it('reasoning gets truncated to 500 chars', async () => {
    const { buildConsensus } = await import('../scripts/multi-ai/consensus-engine.mjs');
    const longReasoning = 'A'.repeat(1000);
    const result = buildConsensus([
      { source: 'claude', verdict: 'approve', confidence: 8, reasoning: longReasoning },
    ]);
    assert.strictEqual(result.votes[0].reasoning.length, 500);
  });
});

// ── Decision Classification ────────────────────────────────────────────

describe('classifyDecision', () => {
  it('security always wins', async () => {
    const { classifyDecision, DECISION_TYPES } = await import('../scripts/multi-ai/consensus-engine.mjs');
    assert.strictEqual(
      classifyDecision({ hasSecurity: true, isUnanimous: true }),
      DECISION_TYPES.SECURITY_WARNING,
    );
    assert.strictEqual(
      classifyDecision({ hasSecurity: true, isUnanimous: false }),
      DECISION_TYPES.SECURITY_WARNING,
    );
  });

  it('unanimous without security → MECHANICAL', async () => {
    const { classifyDecision, DECISION_TYPES } = await import('../scripts/multi-ai/consensus-engine.mjs');
    assert.strictEqual(
      classifyDecision({ hasSecurity: false, isUnanimous: true }),
      DECISION_TYPES.MECHANICAL,
    );
  });

  it('non-unanimous without security → TASTE', async () => {
    const { classifyDecision, DECISION_TYPES } = await import('../scripts/multi-ai/consensus-engine.mjs');
    assert.strictEqual(
      classifyDecision({ hasSecurity: false, isUnanimous: false }),
      DECISION_TYPES.TASTE,
    );
  });
});

// ── CLI Bridge ─────────────────────────────────────────────────────────

describe('CLI Bridge', () => {
  it('createBridge returns correct interface', async () => {
    const { createBridge } = await import('../scripts/multi-ai/cli-bridge.mjs');
    const bridge = createBridge('test-tool', 'test-cmd');
    assert.strictEqual(bridge.name, 'test-tool');
    assert.strictEqual(bridge.command, 'test-cmd');
    assert.strictEqual(typeof bridge.isAvailable, 'function');
    assert.strictEqual(typeof bridge.ask, 'function');
  });

  it('isAvailable returns false for nonexistent command', async () => {
    const { createBridge } = await import('../scripts/multi-ai/cli-bridge.mjs');
    const bridge = createBridge('fake', 'nonexistent-ai-tool-xyz-999');
    assert.strictEqual(bridge.isAvailable(), false);
  });

  it('getAvailableBridges filters unavailable tools', async () => {
    const { getAvailableBridges } = await import('../scripts/multi-ai/cli-bridge.mjs');
    const available = getAvailableBridges();
    // Each returned bridge must actually be available
    for (const b of available) {
      assert.strictEqual(b.isAvailable(), true, `${b.name} reported available but isAvailable() returns false`);
    }
  });

  it('buildReviewPrompt includes diff content', async () => {
    const { buildReviewPrompt } = await import('../scripts/multi-ai/cli-bridge.mjs');
    const prompt = buildReviewPrompt('+ added line\n- removed line', 'Check for typos');
    assert.ok(prompt.includes('+ added line'));
    assert.ok(prompt.includes('- removed line'));
    assert.ok(prompt.includes('Check for typos'));
    assert.ok(prompt.includes('bugs, security'));
  });

  it('buildReviewPrompt truncates diff at 50K', async () => {
    const { buildReviewPrompt } = await import('../scripts/multi-ai/cli-bridge.mjs');
    const hugeDiff = 'X'.repeat(100_000);
    const prompt = buildReviewPrompt(hugeDiff);
    // The prompt should contain at most 50K of the diff, plus preamble
    assert.ok(prompt.length < 51_000, `Prompt too long: ${prompt.length}`);
    assert.ok(!prompt.includes('X'.repeat(50_001)));
  });

  it('buildReviewPrompt works without instructions', async () => {
    const { buildReviewPrompt } = await import('../scripts/multi-ai/cli-bridge.mjs');
    const prompt = buildReviewPrompt('some diff');
    assert.ok(!prompt.includes('Instructions:'));
    assert.ok(prompt.includes('some diff'));
  });

  it('ask returns error for nonexistent command', async () => {
    const { createBridge } = await import('../scripts/multi-ai/cli-bridge.mjs');
    const bridge = createBridge('fake', 'nonexistent-ai-tool-xyz-999');
    const result = bridge.ask('hello');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.source, 'fake');
    assert.ok(result.error);
  });
});

// ── Outside Voice Multi-AI Integration ─────────────────────────────────

describe('Outside Voice Multi-AI Integration', () => {
  it('buildMultiAIReviewPlan always includes claude', async () => {
    const { buildMultiAIReviewPlan } = await import('../scripts/review/outside-voice.mjs');
    const plan = buildMultiAIReviewPlan({ feature: 'test', branch: 'main' });
    assert.ok(plan.available.includes('claude'));
    assert.ok(plan.voterCount >= 1);
    assert.strictEqual(typeof plan.prompt, 'string');
    assert.ok(plan.prompt.includes('brutally honest'));
  });

  it('buildMultiAIReviewPlan voterCount matches available length', async () => {
    const { buildMultiAIReviewPlan } = await import('../scripts/review/outside-voice.mjs');
    const plan = buildMultiAIReviewPlan({ feature: 'x' });
    assert.strictEqual(plan.voterCount, plan.available.length);
  });
});
