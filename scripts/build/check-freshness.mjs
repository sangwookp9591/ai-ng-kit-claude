#!/usr/bin/env node

/**
 * aing Skill Document Freshness Check
 *
 * Verifies that committed SKILL.md files match what gen-skill-docs.mjs
 * would generate from current templates. Exits with code 1 if stale.
 *
 * Usage:
 *   node scripts/build/check-freshness.mjs
 *
 * Intended for CI pipelines to catch uncommitted template changes.
 *
 * @module scripts/build/check-freshness
 */

import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');
const SKILLS_DIR = join(ROOT, 'skills');
const GEN_SCRIPT = join(__dirname, 'gen-skill-docs.mjs');

function main() {
  // 1. Discover templates that would produce SKILL.md
  const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => existsSync(join(SKILLS_DIR, name, 'SKILL.md.tmpl')));

  if (skillDirs.length === 0) {
    console.log('No SKILL.md.tmpl files found. Nothing to check.');
    process.exit(0);
  }

  // 2. Generate to temp directory
  const tempDir = mkdtempSync(join(tmpdir(), 'aing-freshness-'));

  try {
    // execFileSync: no shell interpolation, fixed script path only
    execFileSync(process.execPath, [GEN_SCRIPT, '--out-dir', tempDir], {
      cwd: ROOT,
      stdio: 'pipe',
    });

    // 3. Diff each generated file against committed version
    const staleFiles = [];

    for (const skillName of skillDirs) {
      const committedPath = join(SKILLS_DIR, skillName, 'SKILL.md');
      const generatedPath = join(tempDir, skillName, 'SKILL.md');

      if (!existsSync(committedPath)) {
        staleFiles.push({ skillName, reason: 'missing (not yet generated)' });
        continue;
      }

      if (!existsSync(generatedPath)) {
        // Template exists but generator didn't produce output — skip
        continue;
      }

      const committed = readFileSync(committedPath, 'utf8');
      const generated = readFileSync(generatedPath, 'utf8');

      if (committed !== generated) {
        staleFiles.push({ skillName, reason: 'content differs from template' });
      }
    }

    // 4. Report
    if (staleFiles.length === 0) {
      console.log(`All ${skillDirs.length} SKILL.md files are fresh.`);
      process.exit(0);
    }

    console.error('Stale SKILL.md files detected:');
    console.error('');
    for (const { skillName, reason } of staleFiles) {
      console.error(`  skills/${skillName}/SKILL.md — ${reason}`);
    }
    console.error('');
    console.error('Run "npm run build:skills" to regenerate.');
    process.exit(1);
  } finally {
    // Cleanup temp directory
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
