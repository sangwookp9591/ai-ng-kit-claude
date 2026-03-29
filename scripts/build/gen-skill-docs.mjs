#!/usr/bin/env node

/**
 * aing Skill Document Generator
 *
 * Scans skills/{name}/SKILL.md.tmpl files, resolves placeholders,
 * and generates SKILL.md from templates.
 *
 * Usage:
 *   node scripts/build/gen-skill-docs.mjs           # generate in-place
 *   node scripts/build/gen-skill-docs.mjs --dry-run  # generate to stdout/temp (no write)
 *   node scripts/build/gen-skill-docs.mjs --out-dir /tmp/skills  # generate to alt dir
 *
 * @module scripts/build/gen-skill-docs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPreamble, getAgentTeam } from './preamble-tiers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

// ── Config ──

const SKILLS_DIR = join(ROOT, 'skills');
const TMPL_FILENAME = 'SKILL.md.tmpl';
const OUTPUT_FILENAME = 'SKILL.md';

// ── Placeholder Registry ──

function buildPlaceholders() {
  let version = '0.0.0';
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    version = pkg.version || version;
  } catch { /* use default */ }

  const commands = [
    '/aing plan', '/aing auto', '/aing team', '/aing explore',
    '/aing review', '/aing task', '/aing debug', '/aing test',
    '/aing refactor', '/aing do', '/aing tdd', '/aing qa-loop',
    '/aing rollback', '/aing verify-evidence'
  ].join(', ');

  return {
    '{{PREAMBLE_T1}}': getPreamble(1),
    '{{PREAMBLE_T2}}': getPreamble(2),
    '{{PREAMBLE_T3}}': getPreamble(3),
    '{{PREAMBLE_T4}}': getPreamble(4),
    '{{AGENT_TEAM}}': getAgentTeam(),
    '{{COMMANDS}}': commands,
    '{{VERSION}}': version,
  };
}

// ── Token Estimation ──

/**
 * Estimate token count from content length.
 * Same heuristic as gstack: ~4 chars per token.
 * @param {string} content
 * @returns {number}
 */
function estimateTokens(content) {
  return Math.round(content.length / 4);
}

/**
 * Detect which preamble tier a template uses.
 * @param {string} tmplContent
 * @returns {string} Tier label (T1-T4) or 'none'
 */
function detectTier(tmplContent) {
  if (tmplContent.includes('{{PREAMBLE_T4}}')) return 'T4';
  if (tmplContent.includes('{{PREAMBLE_T3}}')) return 'T3';
  if (tmplContent.includes('{{PREAMBLE_T2}}')) return 'T2';
  if (tmplContent.includes('{{PREAMBLE_T1}}')) return 'T1';
  return 'none';
}

// ── Template Resolution ──

/**
 * Replace all placeholders in template content.
 * @param {string} content - Template content
 * @param {Record<string, string>} placeholders
 * @returns {string}
 */
function resolvePlaceholders(content, placeholders) {
  let resolved = content;
  for (const [key, value] of Object.entries(placeholders)) {
    resolved = resolved.replaceAll(key, value);
  }
  return resolved;
}

// ── Discovery ──

/**
 * Find all SKILL.md.tmpl files under skills/.
 * @returns {Array<{ skillName: string, tmplPath: string, outputPath: string }>}
 */
function discoverTemplates() {
  const results = [];

  if (!existsSync(SKILLS_DIR)) return results;

  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const tmplPath = join(SKILLS_DIR, entry.name, TMPL_FILENAME);
    if (!existsSync(tmplPath)) continue;

    results.push({
      skillName: entry.name,
      tmplPath,
      outputPath: join(SKILLS_DIR, entry.name, OUTPUT_FILENAME),
    });
  }

  return results.sort((a, b) => a.skillName.localeCompare(b.skillName));
}

// ── Main ──

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outDirIdx = args.indexOf('--out-dir');
  const outDir = outDirIdx !== -1 ? args[outDirIdx + 1] : null;

  const templates = discoverTemplates();

  if (templates.length === 0) {
    console.log('No SKILL.md.tmpl files found under skills/.');
    process.exit(0);
  }

  const placeholders = buildPlaceholders();
  const results = [];

  for (const { skillName, tmplPath, outputPath } of templates) {
    const tmplContent = readFileSync(tmplPath, 'utf8');
    const resolved = resolvePlaceholders(tmplContent, placeholders);
    const tier = detectTier(tmplContent);
    const lines = resolved.split('\n').length;
    const tokens = estimateTokens(resolved);

    const targetPath = outDir
      ? join(outDir, skillName, OUTPUT_FILENAME)
      : outputPath;

    if (!dryRun) {
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, resolved, 'utf8');
    }

    results.push({ skillName, lines, tokens, tier, targetPath });
  }

  // ── Summary Table ──

  const colSkill = Math.max(16, ...results.map(r => r.skillName.length + 2));
  const header = [
    'Skill'.padEnd(colSkill),
    'Lines'.padStart(7),
    'Est. Tokens'.padStart(13),
    'Tier'.padStart(6),
  ].join('  ');
  const separator = [
    '\u2500'.repeat(colSkill),
    '\u2500'.repeat(7),
    '\u2500'.repeat(13),
    '\u2500'.repeat(6),
  ].join('  ');

  console.log('');
  console.log(dryRun ? '[DRY RUN] Skill document generation preview:' : 'Skill documents generated:');
  console.log('');
  console.log(header);
  console.log(separator);

  let totalLines = 0;
  let totalTokens = 0;

  for (const { skillName, lines, tokens, tier } of results) {
    totalLines += lines;
    totalTokens += tokens;
    console.log([
      skillName.padEnd(colSkill),
      String(lines).padStart(7),
      String(tokens).padStart(13),
      tier.padStart(6),
    ].join('  '));
  }

  console.log(separator);
  console.log([
    'TOTAL'.padEnd(colSkill),
    String(totalLines).padStart(7),
    String(totalTokens).padStart(13),
    ''.padStart(6),
  ].join('  '));
  console.log('');
}

main();
