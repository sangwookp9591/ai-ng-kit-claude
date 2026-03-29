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

import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');
const SKILLS_DIR = join(ROOT, 'skills');
const GEN_SCRIPT = join(__dirname, 'gen-skill-docs.mjs');
const RESOLVERS_DIR = join(__dirname, 'resolvers');
const PREAMBLE_TIERS = join(__dirname, 'preamble-tiers.mjs');

/**
 * Get the latest mtime from a list of file paths (ignores missing files).
 */
function latestMtime(paths) {
  let latest = 0;
  for (const p of paths) {
    if (existsSync(p)) {
      const mt = statSync(p).mtimeMs;
      if (mt > latest) latest = mt;
    }
  }
  return latest;
}

/**
 * Collect additional source dependencies (resolvers + preamble-tiers).
 * Changes to these files should trigger rebuilds for all skills.
 */
function getSharedDeps() {
  const deps = [];

  // Resolver files
  if (existsSync(RESOLVERS_DIR)) {
    const resolverFiles = readdirSync(RESOLVERS_DIR)
      .filter(f => f.endsWith('.mjs'))
      .map(f => join(RESOLVERS_DIR, f));
    deps.push(...resolverFiles);
  }

  // Preamble tiers config
  if (existsSync(PREAMBLE_TIERS)) {
    deps.push(PREAMBLE_TIERS);
  }

  return deps;
}

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

  // 2. Collect shared dependencies (resolvers, preamble-tiers)
  const sharedDeps = getSharedDeps();
  const sharedMtime = latestMtime(sharedDeps);

  if (sharedDeps.length > 0) {
    console.log(`Tracking ${sharedDeps.length} shared dependencies:`);
    for (const dep of sharedDeps) {
      console.log(`  ${dep.replace(ROOT + '/', '')}`);
    }
    console.log('');
  }

  // 3. Quick mtime-based staleness check
  const staleByMtime = [];
  for (const skillName of skillDirs) {
    const tmplPath = join(SKILLS_DIR, skillName, 'SKILL.md.tmpl');
    const targetPath = join(SKILLS_DIR, skillName, 'SKILL.md');

    if (!existsSync(targetPath)) {
      staleByMtime.push({ skillName, reason: 'STALE — missing (not yet generated)' });
      continue;
    }

    const targetMtime = statSync(targetPath).mtimeMs;
    const tmplMtime = statSync(tmplPath).mtimeMs;

    if (tmplMtime > targetMtime) {
      staleByMtime.push({ skillName, reason: 'STALE — template newer than output' });
    } else if (sharedMtime > targetMtime) {
      staleByMtime.push({ skillName, reason: 'STALE — shared dependency newer than output' });
    }
  }

  // 4. If mtime check found nothing stale, do a content-based verify
  if (staleByMtime.length === 0) {
    const tempDir = mkdtempSync(join(tmpdir(), 'aing-freshness-'));

    try {
      execFileSync(process.execPath, [GEN_SCRIPT, '--out-dir', tempDir], {
        cwd: ROOT,
        stdio: 'pipe',
      });

      const staleByContent = [];

      for (const skillName of skillDirs) {
        const committedPath = join(SKILLS_DIR, skillName, 'SKILL.md');
        const generatedPath = join(tempDir, skillName, 'SKILL.md');

        if (!existsSync(committedPath)) {
          staleByContent.push({ skillName, reason: 'STALE — missing (not yet generated)' });
          continue;
        }

        if (!existsSync(generatedPath)) continue;

        const committed = readFileSync(committedPath, 'utf8');
        const generated = readFileSync(generatedPath, 'utf8');

        if (committed !== generated) {
          staleByContent.push({ skillName, reason: 'STALE — content differs from template' });
        }
      }

      if (staleByContent.length === 0) {
        console.log(`All ${skillDirs.length} SKILL.md files are fresh.`);
        process.exit(0);
      }

      reportStale(staleByContent);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  } else {
    reportStale(staleByMtime);
  }
}

function reportStale(staleFiles) {
  console.error('Stale SKILL.md files detected:');
  console.error('');
  for (const { skillName, reason } of staleFiles) {
    console.error(`  skills/${skillName}/SKILL.md — ${reason}`);
  }
  console.error('');
  console.error('Run "npm run build:skills" to regenerate.');
  process.exit(1);
}

main();
