/**
 * aing Ship Engine — Automated Ship Workflow
 * Integrates with aing's PDCA review stage and evidence chain.
 *
 * Pipeline:
 *   1. Pre-flight (review dashboard check)
 *   2. Base branch merge
 *   3. Test execution + failure triage
 *   4. Pre-landing review (scope drift, security)
 *   5. Version bump (auto MICRO/PATCH)
 *   6. CHANGELOG generation
 *   7. Push + PR creation
 *
 * @module scripts/ship/ship-engine
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';

const log = createLogger('ship-engine');

export interface StepResult {
  step: string;
  status: 'pass' | 'fail';
  details?: Record<string, unknown>;
  ts?: string;
}

export interface ShipState {
  feature: string;
  branch: string;
  baseBranch: string;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  stepResults: StepResult[];
  startedAt: string;
  completedAt?: string;
}

const STEPS: string[] = [
  'preflight',
  'merge-base',
  'run-tests',
  'pre-landing-review',
  'version-bump',
  'changelog',
  'push-and-pr',
];

/**
 * Initialize a ship session.
 */
export function initShip(feature: string, branch: string, baseBranch: string, projectDir?: string): ShipState {
  const dir = projectDir || process.cwd();
  const state: ShipState = {
    feature,
    branch,
    baseBranch: baseBranch || 'main',
    currentStep: 0,
    status: 'pending',
    stepResults: [],
    startedAt: new Date().toISOString(),
  };

  const statePath = join(dir, '.aing', 'state', 'ship-state.json');
  writeState(statePath, state);
  log.info(`Ship initialized: ${feature} (${branch} → ${baseBranch})`);
  return state;
}

/**
 * Get the current step name.
 */
export function getCurrentStep(state: ShipState): string {
  return STEPS[state.currentStep] || 'done';
}

/**
 * Advance to the next step after recording result.
 */
export function advanceStep(stepResult: StepResult, projectDir?: string): ShipState {
  const dir = projectDir || process.cwd();
  const statePath = join(dir, '.aing', 'state', 'ship-state.json');
  const state = readStateOrDefault(statePath, null) as ShipState | null;

  if (!state) throw new Error('No active ship session');

  state.stepResults.push({
    ...stepResult,
    ts: new Date().toISOString(),
  });

  if (stepResult.status === 'fail') {
    state.status = 'failed';
    log.error(`Ship failed at step: ${stepResult.step}`);
  } else {
    state.currentStep++;
    if (state.currentStep >= STEPS.length) {
      state.status = 'completed';
      state.completedAt = new Date().toISOString();
      log.info('Ship completed successfully');
    } else {
      state.status = 'in_progress';
    }
  }

  writeState(statePath, state);
  return state;
}

/**
 * Get ship state.
 */
export function getShipState(projectDir?: string): ShipState | null {
  const dir = projectDir || process.cwd();
  const statePath = join(dir, '.aing', 'state', 'ship-state.json');
  return readStateOrDefault(statePath, null) as ShipState | null;
}

/**
 * Format ship progress for display.
 */
export function formatShipProgress(state: ShipState | null): string {
  if (!state) return 'No active ship session.';

  const lines: string[] = [
    `Ship: ${state.feature} (${state.branch} → ${state.baseBranch})`,
    `Status: ${state.status.toUpperCase()}`,
    '',
  ];

  for (let i = 0; i < STEPS.length; i++) {
    const result = state.stepResults[i];
    let icon = '○';  // pending
    if (result?.status === 'pass') icon = '✓';
    else if (result?.status === 'fail') icon = '✗';
    else if (i === state.currentStep && state.status === 'in_progress') icon = '▶';

    lines.push(`  ${icon} ${i + 1}. ${STEPS[i]}${result ? ` — ${result.status}` : ''}`);
  }

  return lines.join('\n');
}

/**
 * Get all step names.
 */
export function getSteps(): string[] {
  return [...STEPS];
}
