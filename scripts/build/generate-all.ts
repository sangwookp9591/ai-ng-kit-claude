#!/usr/bin/env node

/**
 * aing Full Build Pipeline
 * Runs all generation steps in sequence:
 * 1. Check freshness
 * 2. Generate skill docs from templates
 * 3. Report results
 *
 * Usage:
 *   node scripts/build/generate-all.mjs           # build only stale
 *   node scripts/build/generate-all.mjs --force    # rebuild all
 *   node scripts/build/generate-all.mjs --check    # check only, exit 1 if stale
 *
 * @module scripts/build/generate-all
 */
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args: string[] = process.argv.slice(2);
const force: boolean = args.includes('--force');
const checkOnly: boolean = args.includes('--check');

console.log('');
console.log('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
console.log('\u2551     aing Build Pipeline              \u2551');
console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
console.log('');

try {
  // Step 1: Check freshness
  console.log('Step 1: Checking freshness...');
  const freshResult: string = execSync(`node ${join(__dirname, 'check-freshness.mjs')}`, {
    encoding: 'utf-8',
    cwd: join(__dirname, '..', '..'),
  });
  console.log(freshResult);

  const hasStale: boolean = freshResult.includes('STALE') || freshResult.includes('stale');

  if (checkOnly) {
    if (hasStale) {
      console.log('Check failed: stale skill docs detected. Run build to update.');
      process.exit(1);
    }
    console.log('All skill docs are fresh.');
    process.exit(0);
  }

  // Step 2: Generate skill docs
  if (force || hasStale) {
    console.log('Step 2: Generating skill docs...');
    const genResult: string = execSync(`node ${join(__dirname, 'gen-skill-docs.mjs')}`, {
      encoding: 'utf-8',
      cwd: join(__dirname, '..', '..'),
    });
    console.log(genResult);
  } else {
    console.log('Step 2: All docs are fresh, skipping generation.');
  }

  // Step 3: Summary
  console.log('');
  console.log('Build complete.');
  console.log('');

} catch (err: unknown) {
  console.error('Build failed:', (err as Error).message);
  process.exit(1);
}
