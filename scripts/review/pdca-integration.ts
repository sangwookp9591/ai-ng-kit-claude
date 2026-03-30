/**
 * aing Review ↔ PDCA Integration
 * 200% Synergy: Connects review pipeline with PDCA lifecycle.
 *
 * - PDCA "check" stage triggers review pipeline
 * - PDCA "review" stage checks review readiness dashboard
 * - Ship is gated by PDCA completion + review CLEARED
 *
 * @module scripts/review/pdca-integration
 */
import { buildDashboard, type Dashboard } from './review-dashboard.js';
import { selectTiers } from './review-engine.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('pdca-review-integration');

export interface ShipReadinessContext {
  pdcaStage: string;
  pdcaVerdict: string;
  evidenceVerdict: string;
  projectDir?: string;
}

export interface ShipReadinessResult {
  canShip: boolean;
  reason: string;
  blockers: string[];
}

export interface ReviewRequirementsContext {
  complexityLevel: 'low' | 'mid' | 'high';
  hasUI: boolean;
  hasProductChange: boolean;
  pdcaStage: string;
}

export interface ReviewRequirementsResult {
  tiers: string[];
  reason: string;
}

/**
 * Check if the current state allows shipping.
 * Combines PDCA verdict + review dashboard + evidence chain.
 */
export function checkShipReadiness(context: ShipReadinessContext): ShipReadinessResult {
  const blockers: string[] = [];

  // PDCA must be in review stage
  if (context.pdcaStage !== 'review') {
    blockers.push(`PDCA stage is "${context.pdcaStage}", must be "review"`);
  }

  // PDCA verdict check
  if (context.pdcaVerdict === 'FAILED') {
    blockers.push('PDCA verdict: FAILED');
  }

  // Evidence chain must pass
  if (context.evidenceVerdict === 'FAIL') {
    blockers.push('Evidence chain: FAIL');
  }
  if (context.evidenceVerdict === 'INCOMPLETE') {
    blockers.push('Evidence chain: INCOMPLETE (collect more evidence)');
  }

  // Review dashboard must be cleared
  const dashboard = buildDashboard(context.projectDir);
  if (dashboard.verdict !== 'CLEARED') {
    blockers.push(`Review dashboard: ${dashboard.verdict} — ${dashboard.verdictReason}`);
  }

  const canShip = blockers.length === 0;
  const reason = canShip
    ? 'All gates passed. Ready to ship.'
    : `Blocked by ${blockers.length} issue(s).`;

  if (!canShip) {
    log.warn(`Ship blocked: ${blockers.join('; ')}`);
  }

  return { canShip, reason, blockers };
}

/**
 * Determine review requirements based on PDCA context and complexity.
 */
export function determineReviewRequirements(context: ReviewRequirementsContext): ReviewRequirementsResult {
  const tiers = selectTiers(context.complexityLevel, {
    hasUI: context.hasUI,
    hasProductChange: context.hasProductChange,
  });

  let reason = `Complexity: ${context.complexityLevel}`;
  if (context.hasUI) reason += ', has UI changes';
  if (context.hasProductChange) reason += ', has product changes';
  reason += ` → ${tiers.length} review tier(s)`;

  return { tiers, reason };
}

/**
 * Format ship readiness report.
 */
export function formatShipReadiness(readiness: ShipReadinessResult, _dashboard: Dashboard): string {
  const lines = [
    '┌─────────────────────────────────┐',
    '│      SHIP READINESS CHECK       │',
    '├─────────────────────────────────┤',
  ];

  const icon = readiness.canShip ? '✓' : '✗';
  lines.push(`│ ${icon} ${readiness.canShip ? 'READY TO SHIP' : 'NOT READY'}`.padEnd(34) + '│');
  lines.push('├─────────────────────────────────┤');

  if (readiness.blockers.length > 0) {
    lines.push('│ Blockers:                       │');
    for (const blocker of readiness.blockers) {
      lines.push(`│  ✗ ${blocker}`.slice(0, 33).padEnd(34) + '│');
    }
  } else {
    lines.push('│ All gates passed                │');
  }

  lines.push('└─────────────────────────────────┘');

  return lines.join('\n');
}
