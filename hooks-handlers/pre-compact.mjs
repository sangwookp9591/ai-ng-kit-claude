/**
 * sw-kit PreCompact Hook Handler
 * Saves PDCA state snapshot before context compaction.
 */

import { readState, writeState } from '../scripts/core/state.mjs';
import { createLogger } from '../scripts/core/logger.mjs';
import { join } from 'node:path';
import { readdirSync, unlinkSync } from 'node:fs';

const log = createLogger('pre-compact');

try {
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const stateFile = join(projectDir, '.sw-kit', 'state', 'pdca-status.json');
  const snapshotDir = join(projectDir, '.sw-kit', 'snapshots');

  const stateResult = readState(stateFile);
  if (stateResult.ok) {
    // Save snapshot with timestamp
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotFile = join(snapshotDir, `snapshot-${ts}.json`);
    writeState(snapshotFile, {
      savedAt: new Date().toISOString(),
      state: stateResult.data
    });

    // Keep only last 10 snapshots
    try {
      const snapshots = readdirSync(snapshotDir)
        .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
        .sort();
      const maxSnapshots = 10;
      if (snapshots.length > maxSnapshots) {
        const toDelete = snapshots.slice(0, snapshots.length - maxSnapshots);
        for (const file of toDelete) {
          unlinkSync(join(snapshotDir, file));
        }
      }
    } catch (_) { /* best effort cleanup */ }

    // Inject PDCA state summary for post-compaction context
    const active = stateResult.data.activeFeature;
    if (active) {
      const feat = stateResult.data.features?.[active];
      const context = `[sw-kit] PDCA state preserved. Active: ${active}, Stage: ${feat?.currentStage || 'unknown'}`;

      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { additionalContext: context }
      }));
      log.info('Snapshot saved before compaction', { activeFeature: active });
    } else {
      process.stdout.write(JSON.stringify({}));
    }
  } else {
    process.stdout.write(JSON.stringify({}));
  }

} catch (err) {
  log.error('Pre-compact failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
