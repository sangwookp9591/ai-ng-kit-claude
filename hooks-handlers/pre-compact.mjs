/**
 * aing PreCompact Hook Handler v0.4.0
 * Intelligent context preservation + PDCA snapshot.
 */

import { readState, writeState } from '../scripts/core/state.mjs';
import { createLogger } from '../scripts/core/logger.mjs';
import { generateCompactionInjection } from '../scripts/compaction/context-compaction.mjs';
import { join } from 'node:path';
import { readdirSync, unlinkSync } from 'node:fs';

const log = createLogger('pre-compact');

try {
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const stateFile = join(projectDir, '.aing', 'state', 'pdca-status.json');
  const snapshotDir = join(projectDir, '.aing', 'snapshots');

  // Save PDCA snapshot
  const stateResult = readState(stateFile);
  if (stateResult.ok) {
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
      if (snapshots.length > 10) {
        for (const file of snapshots.slice(0, snapshots.length - 10)) {
          unlinkSync(join(snapshotDir, file));
        }
      }
    } catch (_) { /* best effort */ }
  }

  // Build intelligent compaction context (priority-based preservation)
  const injection = generateCompactionInjection(projectDir);

  if (injection) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { additionalContext: injection }
    }));
    log.info('Compaction context injected');
  } else {
    process.stdout.write(JSON.stringify({}));
  }

} catch (err) {
  log.error('Pre-compact failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
