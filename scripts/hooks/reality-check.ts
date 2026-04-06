/**
 * aing Reality Check — Judgment layer for feedback violation and autonomy risk detection.
 * Detects when agents repeatedly violate past feedback or exceed autonomy boundaries.
 * Called from post-tool-use on Agent/Task completion. Pre-tool-use only reads the flag.
 * @module scripts/hooks/reality-check
 */

import { createLogger } from '../core/logger.js';
import { recordDenial, type DenialEntry } from '../guardrail/denial-tracker.js';
import { getRecentMutations } from '../guardrail/mutation-guard.js';
import { join } from 'node:path';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  unlinkSync,
} from 'node:fs';

const log = createLogger('reality-check');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const REALITY_CHECK_TYPES = {
  FEEDBACK_VIOLATION: 'feedback-violation',
  AUTONOMY_RISK: 'autonomy-risk',
  DESTRUCTIVE_UNCONFIRMED: 'destructive-unconfirmed',
  RECURRENT_DENIAL: 'recurrent-denial',
} as const;

export type RealityCheckType = (typeof REALITY_CHECK_TYPES)[keyof typeof REALITY_CHECK_TYPES];

export interface RealityCheckContext {
  toolInput?: Record<string, unknown>;
  agentResponse?: string;
  sessionId?: string;
  projectDir: string;
}

export interface RealityCheckRule {
  id: string;
  scenario: RealityCheckType;
  check: (ctx: RealityCheckContext) => boolean;
  triggerThreshold: number;
  escalationType: 'block' | 'warn';
}

export interface RealityCheckResult {
  scenario: RealityCheckType;
  verdict: 'block' | 'warn' | 'pass';
  escalationType: 'block' | 'warn';
  evidence: string;
}

export interface FeedbackEntry {
  timestamp: string;
  keyword: string;
  toolInput: string;
  overlapScore: number;
  isFalsePositive?: boolean;
}

export interface RealityCheckFlag {
  active: boolean;
  scenario: string;
  createdAt: string;
  sessionId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FEEDBACK_ENTRIES = 200;
const KEYWORD_OVERLAP_THRESHOLD = 0.7;
const DESTRUCTIVE_KEYWORDS = /\b(DELETE|DROP|REMOVE|RENAME|TRUNCATE|WIPE|DESTROY|PURGE)\b/i;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function feedbackMemoryPath(projectDir: string): string {
  return join(projectDir, '.aing', 'logs', 'feedback-memory.jsonl');
}

function realityCheckFlagPath(projectDir: string): string {
  return join(projectDir, '.aing', 'state', 'reality-check-flag.json');
}

// ---------------------------------------------------------------------------
// Feedback Memory JSONL helpers
// ---------------------------------------------------------------------------

function loadFeedbackEntries(projectDir: string): FeedbackEntry[] {
  const filePath = feedbackMemoryPath(projectDir);
  if (!existsSync(filePath)) return [];
  try {
    return readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(l => l.trim().length > 0)
      .map(l => JSON.parse(l) as FeedbackEntry);
  } catch {
    return [];
  }
}

/**
 * Record a feedback entry to JSONL with MAX_FEEDBACK_ENTRIES cap.
 */
export function recordFeedback(entry: FeedbackEntry, projectDir: string): void {
  const logDir = join(projectDir, '.aing', 'logs');
  mkdirSync(logDir, { recursive: true });
  const filePath = feedbackMemoryPath(projectDir);

  // Load, append, trim, rewrite
  const entries = loadFeedbackEntries(projectDir);
  entries.push(entry);

  const trimmed = entries.length > MAX_FEEDBACK_ENTRIES
    ? entries.slice(-MAX_FEEDBACK_ENTRIES)
    : entries;

  writeFileSync(filePath, trimmed.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Keyword helpers
// ---------------------------------------------------------------------------

function normalizeKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function keywordOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const intersection = b.filter(w => setA.has(w));
  return intersection.length / Math.min(a.length, b.length);
}

// ---------------------------------------------------------------------------
// checkFeedbackViolation
// ---------------------------------------------------------------------------

/**
 * Check if the current tool input repeats a past feedback violation.
 * Level 1: exact keyword match.
 * Level 2: normalized keyword overlap >= 0.7.
 */
export function checkFeedbackViolation(
  toolInput: Record<string, unknown>,
  projectDir: string
): { violated: boolean; evidence: string; overlapScore: number } {
  const entries = loadFeedbackEntries(projectDir);
  if (entries.length === 0) return { violated: false, evidence: '', overlapScore: 0 };

  const inputStr = JSON.stringify(toolInput).toLowerCase();
  const inputKeywords = normalizeKeywords(inputStr);

  let maxOverlap = 0;
  let matchedKeyword = '';

  for (const entry of entries) {
    if (entry.isFalsePositive) continue;

    // Level 1: exact keyword match
    if (inputStr.includes(entry.keyword.toLowerCase())) {
      return {
        violated: true,
        evidence: `Exact keyword match: "${entry.keyword}"`,
        overlapScore: 1.0,
      };
    }

    // Level 2: normalized keyword overlap
    const entryKeywords = normalizeKeywords(entry.keyword);
    const overlap = keywordOverlap(inputKeywords, entryKeywords);
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      matchedKeyword = entry.keyword;
    }
  }

  if (maxOverlap >= KEYWORD_OVERLAP_THRESHOLD) {
    return {
      violated: true,
      evidence: `Keyword overlap ${(maxOverlap * 100).toFixed(0)}% with feedback: "${matchedKeyword}"`,
      overlapScore: maxOverlap,
    };
  }

  return { violated: false, evidence: '', overlapScore: maxOverlap };
}

// ---------------------------------------------------------------------------
// Task file helpers (for autonomy risk criterion a)
// ---------------------------------------------------------------------------

function loadAllowedFilesFromTasks(projectDir: string): string[] | null {
  const taskDir = join(projectDir, '.aing', 'tasks');
  if (!existsSync(taskDir)) return null;

  const files: string[] = [];
  try {
    const taskFiles = readdirSync(taskDir).filter(f => f.startsWith('task-') && f.endsWith('.json'));
    if (taskFiles.length === 0) return null;

    for (const tf of taskFiles) {
      try {
        const task = JSON.parse(readFileSync(join(taskDir, tf), 'utf-8')) as Record<string, unknown>;
        const subtasks = (task.subtasks as Array<Record<string, unknown>>) || [];
        for (const sub of subtasks) {
          const subFiles = sub.files as string[] | undefined;
          if (Array.isArray(subFiles)) {
            files.push(...subFiles);
          }
        }
      } catch { /* skip malformed task */ }
    }
  } catch {
    return null;
  }

  return files.length > 0 ? files : null;
}

// ---------------------------------------------------------------------------
// Denial tracker session recurrence helper
// ---------------------------------------------------------------------------

function hasRecentDenialForRule(ruleId: string, projectDir: string): boolean {
  const logPath = join(projectDir, '.aing', 'logs', 'denials.jsonl');
  if (!existsSync(logPath)) return false;
  try {
    const lines = readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter(l => l.trim().length > 0);
    // Check the last 20 denials (current session proxy)
    const recent = lines.slice(-20);
    return recent.some(l => {
      try {
        const entry = JSON.parse(l) as DenialEntry;
        return entry.ruleId === ruleId;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Reality Check Rules (RealityCheckRule declarations)
// ---------------------------------------------------------------------------

export const REALITY_CHECK_RULES: RealityCheckRule[] = [
  {
    id: 'rc-scope-exceeded',
    scenario: REALITY_CHECK_TYPES.AUTONOMY_RISK,
    triggerThreshold: 1,
    escalationType: 'warn',
    check: (ctx: RealityCheckContext): boolean => {
      // Criterion (a): mutations outside allowed task files
      const allowedFiles = loadAllowedFilesFromTasks(ctx.projectDir);
      if (!allowedFiles) return false; // cold-start protection: skip if no task files

      const recentMutations = getRecentMutations(20, ctx.projectDir);
      for (const m of recentMutations) {
        if (!allowedFiles.some(f => m.file.endsWith(f) || f.endsWith(m.file))) {
          return true;
        }
      }
      return false;
    },
  },
  {
    id: 'rc-destructive-unconfirmed',
    scenario: REALITY_CHECK_TYPES.DESTRUCTIVE_UNCONFIRMED,
    triggerThreshold: 1,
    escalationType: 'block',
    check: (ctx: RealityCheckContext): boolean => {
      // Criterion (b): destructive keyword + no AskUserQuestion
      const response = ctx.agentResponse || '';
      const hasDestructive = DESTRUCTIVE_KEYWORDS.test(response);
      const hasConfirmation = /AskUserQuestion|ask.*user|confirm.*user|user.*confirm/i.test(response);
      return hasDestructive && !hasConfirmation;
    },
  },
  {
    id: 'rc-recurrent-denial',
    scenario: REALITY_CHECK_TYPES.RECURRENT_DENIAL,
    triggerThreshold: 1,
    escalationType: 'warn',
    check: (ctx: RealityCheckContext): boolean => {
      // Criterion (c): same ruleId denied again in this session
      return hasRecentDenialForRule('rc-destructive-unconfirmed', ctx.projectDir) ||
             hasRecentDenialForRule('rc-feedback-violation', ctx.projectDir);
    },
  },
];

// ---------------------------------------------------------------------------
// checkAutonomyRisk
// ---------------------------------------------------------------------------

/**
 * Check for autonomy risk based on 3 criteria.
 * Returns the first matching rule result or null if all pass.
 */
export function checkAutonomyRisk(
  agentResponse: string,
  projectDir: string
): { riskDetected: boolean; ruleId: string; evidence: string; escalationType: 'block' | 'warn' } | null {
  const ctx: RealityCheckContext = { agentResponse, projectDir };

  for (const rule of REALITY_CHECK_RULES) {
    try {
      if (rule.check(ctx)) {
        return {
          riskDetected: true,
          ruleId: rule.id,
          evidence: `Rule ${rule.id} triggered (scenario: ${rule.scenario})`,
          escalationType: rule.escalationType,
        };
      }
    } catch { /* best-effort per rule */ }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Flag management
// ---------------------------------------------------------------------------

/**
 * Write reality-check block flag for indirect pre-tool-use blocking.
 */
export function writeRealityCheckFlag(scenario: string, sessionId: string, projectDir: string): void {
  const stateDir = join(projectDir, '.aing', 'state');
  mkdirSync(stateDir, { recursive: true });

  const flag: RealityCheckFlag = {
    active: true,
    scenario,
    createdAt: new Date().toISOString(),
    sessionId,
  };

  writeFileSync(realityCheckFlagPath(projectDir), JSON.stringify(flag, null, 2), 'utf-8');
}

/**
 * Clear the reality-check flag (called on session stop).
 */
export function clearRealityCheckFlag(projectDir: string): void {
  const flagPath = realityCheckFlagPath(projectDir);
  try {
    if (existsSync(flagPath)) {
      unlinkSync(flagPath);
    }
  } catch { /* best-effort */ }
}

/**
 * Read the current reality-check flag. Returns null if not active.
 */
export function readRealityCheckFlag(projectDir: string): RealityCheckFlag | null {
  const flagPath = realityCheckFlagPath(projectDir);
  if (!existsSync(flagPath)) return null;
  try {
    const flag = JSON.parse(readFileSync(flagPath, 'utf-8')) as RealityCheckFlag;
    return flag.active ? flag : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// runRealityCheck — main entry point
// ---------------------------------------------------------------------------

/**
 * Run all reality checks. Returns results with verdict for each triggered check.
 * Called from post-tool-use on Agent/Task completion.
 */
export function runRealityCheck(context: RealityCheckContext): RealityCheckResult[] {
  const results: RealityCheckResult[] = [];

  // 1. Feedback violation check
  if (context.toolInput) {
    try {
      const fv = checkFeedbackViolation(context.toolInput, context.projectDir);
      if (fv.violated) {
        const ruleId = 'rc-feedback-violation';
        const escalationType = 'warn' as const;

        // Record denial
        const entry: DenialEntry = {
          timestamp: new Date().toISOString(),
          toolName: 'reality-check',
          ruleId,
          action: 'warn',
          severity: 'medium',
          message: fv.evidence,
          input: JSON.stringify(context.toolInput).slice(0, 200),
        };
        recordDenial(entry, context.projectDir);

        // Record feedback false-positive metric
        recordFeedback({
          timestamp: new Date().toISOString(),
          keyword: fv.evidence,
          toolInput: JSON.stringify(context.toolInput).slice(0, 200),
          overlapScore: fv.overlapScore,
          isFalsePositive: false,
        }, context.projectDir);

        results.push({
          scenario: REALITY_CHECK_TYPES.FEEDBACK_VIOLATION,
          verdict: escalationType,
          escalationType,
          evidence: fv.evidence,
        });
      }
    } catch { /* best-effort */ }
  }

  // 2. Autonomy risk check
  if (context.agentResponse) {
    try {
      const risk = checkAutonomyRisk(context.agentResponse, context.projectDir);
      if (risk) {
        const entry: DenialEntry = {
          timestamp: new Date().toISOString(),
          toolName: 'reality-check',
          ruleId: risk.ruleId,
          action: risk.escalationType,
          severity: risk.escalationType === 'block' ? 'high' : 'medium',
          message: risk.evidence,
          input: context.agentResponse.slice(0, 200),
        };
        recordDenial(entry, context.projectDir);

        if (risk.escalationType === 'block') {
          writeRealityCheckFlag(
            risk.ruleId,
            context.sessionId || 'unknown',
            context.projectDir
          );
        }

        results.push({
          scenario: risk.ruleId.includes('destructive')
            ? REALITY_CHECK_TYPES.DESTRUCTIVE_UNCONFIRMED
            : REALITY_CHECK_TYPES.AUTONOMY_RISK,
          verdict: risk.escalationType,
          escalationType: risk.escalationType,
          evidence: risk.evidence,
        });
      }
    } catch { /* best-effort */ }
  }

  if (results.length > 0) {
    log.info('Reality check triggered', { count: results.length, verdicts: results.map(r => r.verdict) });
  }

  return results;
}
