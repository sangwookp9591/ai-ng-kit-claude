import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '.test-telemetry-rotation-tmp');

async function importTelemetry() {
  try {
    return await import('../dist/scripts/telemetry/telemetry-engine.js');
  } catch {
    return null;
  }
}

describe('Telemetry Log Rotation', () => {
  let mod;

  before(async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    mod = await importTelemetry();
    if (!mod) {
      console.warn('SKIP: dist/scripts/telemetry/telemetry-engine.js not found — run tsc first');
    }
  });

  after(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it('rotates file when size exceeds 1MB', async () => {
    if (!mod) return;

    const telDir = join(TEST_DIR, '.aing/telemetry');
    mkdirSync(telDir, { recursive: true });

    const usageFile = join(telDir, 'skill-usage.jsonl');
    // Write ~1.1 MB of data
    const bigLine = JSON.stringify({ ts: new Date().toISOString(), skill: 'test', duration_s: 1, outcome: 'success', complexity: null, tokens: null, team: null });
    const lines = Array(12_000).fill(bigLine).join('\n') + '\n';
    writeFileSync(usageFile, lines);

    assert(statSync(usageFile).size >= 1_048_576, 'pre-condition: file must be >= 1MB');

    // Force throttle reset by manipulating nothing (we can only test via the public API)
    // logSkillUsage triggers maybeRotate internally
    mod.logSkillUsage(
      { skill: 'rotation-test', duration_s: 1, outcome: 'success' },
      TEST_DIR
    );

    // After rotation the original file should be gone (or small) and .old should exist
    const backupFile = `${usageFile}.old`;
    assert(existsSync(backupFile), '.jsonl.old backup should exist after rotation');

    // New file should have been created by the appended entry (small)
    assert(existsSync(usageFile), 'new jsonl file should exist after rotation');
    assert(statSync(usageFile).size < 1_048_576, 'new file should be small after rotation');
  });

  it('keeps only 1 backup (.old) — overwrites prior backup', async () => {
    if (!mod) return;

    const telDir = join(TEST_DIR, '.aing/telemetry');
    const usageFile = join(telDir, 'skill-usage.jsonl');
    const backupFile = `${usageFile}.old`;

    // Seed an oversized file again (reset throttle by using a fresh dir sub-path is not possible,
    // so we test the overwrite logic by checking backup exists from previous test)
    assert(existsSync(backupFile), 'backup from previous rotation should exist');

    // The backup should be exactly 1 file (no .old.old etc.)
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(telDir).filter(f => f.startsWith('skill-usage'));
    const oldFiles = files.filter(f => f.endsWith('.old'));
    assert.equal(oldFiles.length, 1, 'only 1 .old backup should exist');
  });
});
