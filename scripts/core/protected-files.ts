/**
 * aing Protected Files — shared constant
 * Files that must never be auto-cleaned or cleared without force.
 * Used by session-cleanup.ts and state-introspection.ts.
 * @module scripts/core/protected-files
 */

export const PROTECTED_FILES = new Set([
  'pdca-status.json',
  'cost-tracker.json',
  'tech-stack.json',
  'agent-budget.json',
  'agent-trace.json',
  'agent-traces.json',
  'denial-audit.json',
  'denial-learner-output.json',
  'invariants-tracker.json',
  'progress-history.json',
  'team-health.json',
  'version-check.json',
  'hud-setup-done',
]);
