/**
 * sw-kit Stop Hook Handler
 * Persists PDCA state and learning records on session end.
 */

import { readState, writeState } from '../scripts/core/state.mjs';
import { createLogger } from '../scripts/core/logger.mjs';
import { getBudgetStatus } from '../scripts/core/context-budget.mjs';
import { join } from 'node:path';

const log = createLogger('stop');

try {
  const projectDir = process.env.PROJECT_DIR || process.cwd();

  // Log context budget usage for this session
  const budget = getBudgetStatus();
  if (budget.total > 0) {
    log.info('Session context budget summary', {
      totalTokens: `~${budget.total}`,
      injections: budget.injections.length,
      warnings: budget.warnings.length
    });
  }

  // Persist any in-flight PDCA state
  const stateFile = join(projectDir, '.sw-kit', 'state', 'pdca-status.json');
  const stateResult = readState(stateFile);
  if (stateResult.ok && stateResult.data.activeFeature) {
    // Add session end timestamp
    stateResult.data.lastSessionEnd = new Date().toISOString();
    writeState(stateFile, stateResult.data);
    log.info('PDCA state persisted on stop', { feature: stateResult.data.activeFeature });
  }

  process.stdout.write(JSON.stringify({}));

} catch (err) {
  log.error('Stop handler failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
