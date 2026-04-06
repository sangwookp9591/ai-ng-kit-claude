/**
 * aing Quality Gate — Automated quality standards enforcement for AING-DR plans.
 * Measures evidence coverage, criteria testability, constraint compliance.
 * Called before persist to ensure hard gates are met.
 * @module scripts/hooks/quality-gate
 */

import { createLogger } from '../core/logger.js';

const log = createLogger('quality-gate');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualityMetrics {
  evidenceCoverage: number;      // % of claims citing file:line
  criteriaTestability: number;   // % of testable acceptance criteria
  constraintCompliance: number;  // % of constraints honored
  fragileUnaddressed: number;    // count of FRAGILE assumptions not addressed
  ignoredSteelman: number;       // count of IGNORED steelman points
}

export interface QualityResult {
  pass: boolean;
  metrics: QualityMetrics;
  failures: string[];
}

// ---------------------------------------------------------------------------
// Thresholds (Hard Gates)
// ---------------------------------------------------------------------------

const EVIDENCE_THRESHOLD = 80;     // 80%+ claims cite file:line
const TESTABILITY_THRESHOLD = 90;  // 90%+ criteria are testable
const CONSTRAINT_THRESHOLD = 100;  // 100% constraints honored
const MAX_FRAGILE = 0;             // 0 unaddressed FRAGILE assumptions
const MAX_IGNORED = 0;             // 0 IGNORED steelman points

// ---------------------------------------------------------------------------
// Measurement Functions
// ---------------------------------------------------------------------------

const FILE_LINE_PATTERN = /\b[\w/.-]+\.(ts|js|py|go|rs|java|tsx|jsx|mjs|vue|svelte)(?::\d+)?/g;
const VAGUE_CRITERIA = /(?:적절히|적절한|잘\s|빠르게|좋은|충분히|충분한|proper|good|fast|nice|appropriate|reasonable|adequate)/i;

/**
 * Measure evidence coverage: % of technical claims that cite file:line.
 */
export function measureEvidenceCoverage(planText: string): number {
  const lines = planText.split('\n').filter(l => l.trim().length > 0);

  // Technical claims: lines in Steps, Risks, Context, Feasibility sections
  const technicalSections = /^##\s*(Steps|Risks|Context|Feasibility|Architecture)/;
  let inTechnical = false;
  let technicalClaims = 0;
  let withEvidence = 0;

  for (const line of lines) {
    if (/^##\s/.test(line)) {
      inTechnical = technicalSections.test(line);
      continue;
    }
    if (inTechnical && line.trim().startsWith('-')) {
      technicalClaims++;
      if (FILE_LINE_PATTERN.test(line)) {
        withEvidence++;
      }
      FILE_LINE_PATTERN.lastIndex = 0; // reset regex state
    }
  }

  if (technicalClaims === 0) return 100; // no claims = vacuously true
  return Math.round((withEvidence / technicalClaims) * 100);
}

/**
 * Measure criteria testability: % of acceptance criteria that are objectively verifiable.
 */
export function measureCriteriaTestability(planText: string): number {
  const criteriaMatch = planText.match(/^- \[[ x]\] .+$/gm);
  if (!criteriaMatch || criteriaMatch.length === 0) return 100;

  let testable = 0;
  for (const criterion of criteriaMatch) {
    // Vague criteria are NOT testable
    if (!VAGUE_CRITERIA.test(criterion)) {
      testable++;
    }
  }

  return Math.round((testable / criteriaMatch.length) * 100);
}

/**
 * Measure constraint compliance from FINAL_PLAN JSON.
 */
export function measureConstraintCompliance(planJson: Record<string, unknown>): number {
  const constraints = planJson.constraints as Array<{ honored?: boolean }> | undefined;
  if (!constraints || constraints.length === 0) return 100;

  const honored = constraints.filter(c => c.honored !== false).length;
  return Math.round((honored / constraints.length) * 100);
}

/**
 * Count FRAGILE assumptions not addressed in plan.
 */
export function countFragileUnaddressed(criticOutput: string): number {
  const lines = criticOutput.split('\n');
  let count = 0;
  for (const line of lines) {
    if (/FRAGILE/i.test(line)) {
      // If the same line contains mitigation evidence, it's addressed
      const hasResolution = /mitigat|address|resolv|handled|covered/i.test(line);
      if (!hasResolution) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Count IGNORED steelman points from Noa's output.
 */
export function countIgnoredSteelman(noaOutput: string): number {
  const matches = noaOutput.match(/IGNORED/g);
  return matches ? matches.length : 0;
}

// ---------------------------------------------------------------------------
// Main Gate Check
// ---------------------------------------------------------------------------

/**
 * Run all quality checks against a plan.
 * Returns pass/fail with detailed metrics and failure reasons.
 */
export function checkQualityGate(
  planText: string,
  planJson: Record<string, unknown>,
  criticOutput: string,
  noaOutput: string
): QualityResult {
  const metrics: QualityMetrics = {
    evidenceCoverage: measureEvidenceCoverage(planText),
    criteriaTestability: measureCriteriaTestability(planText),
    constraintCompliance: measureConstraintCompliance(planJson),
    fragileUnaddressed: countFragileUnaddressed(criticOutput),
    ignoredSteelman: countIgnoredSteelman(noaOutput),
  };

  const failures: string[] = [];

  if (metrics.evidenceCoverage < EVIDENCE_THRESHOLD) {
    failures.push(`Evidence coverage ${metrics.evidenceCoverage}% < ${EVIDENCE_THRESHOLD}% threshold`);
  }
  if (metrics.criteriaTestability < TESTABILITY_THRESHOLD) {
    failures.push(`Criteria testability ${metrics.criteriaTestability}% < ${TESTABILITY_THRESHOLD}% threshold`);
  }
  if (metrics.constraintCompliance < CONSTRAINT_THRESHOLD) {
    failures.push(`Constraint compliance ${metrics.constraintCompliance}% < ${CONSTRAINT_THRESHOLD}%`);
  }
  if (metrics.fragileUnaddressed > MAX_FRAGILE) {
    failures.push(`${metrics.fragileUnaddressed} FRAGILE assumption(s) unaddressed`);
  }
  if (metrics.ignoredSteelman > MAX_IGNORED) {
    failures.push(`${metrics.ignoredSteelman} steelman point(s) IGNORED`);
  }

  const pass = failures.length === 0;

  log.info('Quality gate check', { pass, metrics, failures });

  return { pass, metrics, failures };
}
