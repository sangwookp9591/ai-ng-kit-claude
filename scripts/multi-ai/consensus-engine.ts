/**
 * aing Multi-AI Consensus Engine
 * Aggregates votes from multiple AI reviewers and produces a consensus decision.
 * Supports auto-decide for high-confidence unanimous approval,
 * user challenges for rejections, and security escalation.
 * @module scripts/multi-ai/consensus-engine
 */
import { createLogger } from '../core/logger.js';

const log = createLogger('consensus-engine');

// ── Decision type taxonomy ─────────────────────────────────────────────

/**
 * Classification of how a consensus decision should be handled.
 *
 * MECHANICAL      — unanimous agreement, safe to auto-apply
 * TASTE           — subjective split, needs human judgment
 * USER_CHALLENGE  — all reviewers reject, user must explicitly override
 * SECURITY_WARNING — security concern detected, always escalate
 */
export const DECISION_TYPES = {
  MECHANICAL: 'mechanical',
  TASTE: 'taste',
  USER_CHALLENGE: 'user_challenge',
  SECURITY_WARNING: 'security_warning',
} as const;

type DecisionType = typeof DECISION_TYPES[keyof typeof DECISION_TYPES];

/** Regex for security-related keywords in reasoning text. */
const SECURITY_RE = /security|vulnerability|injection|auth|xss|csrf/i;

// ── Types ─────────────────────────────────────────────────────────────

interface Vote {
  source: string;
  verdict: 'approve' | 'reject';
  confidence?: number;
  reasoning?: string;
}

interface ConsensusResult {
  decision: 'approve' | 'reject' | 'split' | 'no_votes';
  majority?: 'approve' | 'reject';
  unanimous: boolean;
  autoDecide: boolean;
  challengeType?: string | null;
  avgConfidence?: number;
  votes?: Array<{
    source: string;
    verdict: string;
    confidence?: number;
    reasoning: string;
  }>;
  summary?: string;
}

interface ClassifyContext {
  hasSecurity: boolean;
  isUnanimous: boolean;
}

// ── Core consensus logic ───────────────────────────────────────────────

/**
 * Build a consensus from an array of voter results.
 */
export function buildConsensus(votes: Vote[]): ConsensusResult {
  if (!votes || votes.length === 0) {
    log.warn('buildConsensus called with no votes');
    return { decision: 'no_votes', unanimous: false, autoDecide: false };
  }

  const approvals = votes.filter(v => v.verdict === 'approve');
  const rejections = votes.filter(v => v.verdict === 'reject');
  const total = votes.length;

  const unanimous = approvals.length === total || rejections.length === total;
  const majority: 'approve' | 'reject' = approvals.length > rejections.length ? 'approve' : 'reject';

  const avgConfidence =
    votes.reduce((sum, v) => sum + (v.confidence || 5), 0) / total;

  const hasSecurity = votes.some(v => SECURITY_RE.test(v.reasoning || ''));

  let decision: 'approve' | 'reject' | 'split';
  let autoDecide = false;
  let challengeType: string | null = null;

  if (unanimous && approvals.length === total) {
    // All approve
    decision = 'approve';
    autoDecide = avgConfidence >= 7;
    challengeType = classifyDecision({ hasSecurity: false, isUnanimous: true });
  } else if (unanimous && rejections.length === total) {
    // All reject
    decision = 'reject';
    autoDecide = false;
    challengeType = hasSecurity
      ? DECISION_TYPES.SECURITY_WARNING
      : DECISION_TYPES.USER_CHALLENGE;
  } else {
    // Split decision
    decision = 'split';
    autoDecide = false;
    challengeType = classifyDecision({ hasSecurity, isUnanimous: false });
  }

  const result: ConsensusResult = {
    decision,
    majority,
    unanimous,
    autoDecide,
    challengeType,
    avgConfidence: Math.round(avgConfidence * 10) / 10,
    votes: votes.map(v => ({
      source: v.source,
      verdict: v.verdict,
      confidence: v.confidence,
      reasoning: (v.reasoning || '').slice(0, 500),
    })),
    summary: buildSummary(votes, decision, unanimous),
  };

  log.info(`Consensus: ${decision} (${total} voters, unanimous=${unanimous}, auto=${autoDecide})`);
  return result;
}

// ── Classification ─────────────────────────────────────────────────────

/**
 * Classify the type of decision for downstream handling.
 */
export function classifyDecision({ hasSecurity, isUnanimous }: ClassifyContext): DecisionType {
  if (hasSecurity) return DECISION_TYPES.SECURITY_WARNING;
  if (isUnanimous) return DECISION_TYPES.MECHANICAL;
  return DECISION_TYPES.TASTE;
}

// ── Internal helpers ───────────────────────────────────────────────────

/**
 * Build a human-readable summary line.
 */
function buildSummary(votes: Vote[], decision: string, unanimous: boolean): string {
  const sources = votes
    .map(v => `${v.source}: ${v.verdict} (${v.confidence}/10)`)
    .join(', ');

  if (unanimous && decision === 'approve') {
    return `All ${votes.length} reviewers approve. ${sources}`;
  }
  if (unanimous && decision === 'reject') {
    return `All ${votes.length} reviewers reject. USER CHALLENGE. ${sources}`;
  }
  return `Split decision (${votes.length} voters). ${sources}`;
}
