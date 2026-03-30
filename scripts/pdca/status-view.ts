/**
 * aing Status View — Human-Readable PDCA Status Generator
 * Reads pdca-status.json and writes .aing/STATUS.md.
 *
 * @module scripts/pdca/status-view
 */

import { readStateOrDefault } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const log = createLogger('status-view');

const ZOMBIE_STAGE = new Set(['plan', 'do']);
const ZOMBIE_AGE_DAYS = 7;

interface EvidenceItem {
  result?: 'pass' | 'fail' | string;
  [key: string]: unknown;
}

interface PdcaFeature {
  iteration: number;
  evidence: EvidenceItem[];
  currentStage: string;
  lastActivityAt?: string;
  startedAt?: string;
  [key: string]: unknown;
}

interface PdcaState {
  version: number;
  features: Record<string, PdcaFeature>;
  activeFeature?: string | null;
}

interface EvidenceSummaryResult {
  total: number;
  pass: number;
  fail: number;
  pending: number;
}

interface StatusViewResult {
  path: string;
  featureCount: number;
  zombieCount: number;
  activeFeature: string | null;
}

/**
 * Determine if a feature qualifies as a zombie (same logic as state-gc).
 */
function isZombie(feature: PdcaFeature): boolean {
  if (feature.iteration !== 0) return false;
  if (feature.evidence && feature.evidence.length > 0) return false;
  if (!ZOMBIE_STAGE.has(feature.currentStage)) return false;

  const startedAt = feature.lastActivityAt || feature.startedAt;
  if (!startedAt) return true;

  const ageMs = Date.now() - new Date(startedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays >= ZOMBIE_AGE_DAYS;
}

/**
 * Format a relative time string for display.
 */
function relativeTime(isoDate: string | undefined): string {
  if (!isoDate) return 'unknown';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day';
  return `${diffDays} days`;
}

/**
 * Get evidence summary counts.
 */
function evidenceSummary(evidence: EvidenceItem[] = []): EvidenceSummaryResult {
  let pass = 0, fail = 0, pending = 0;
  for (const e of evidence) {
    if (e.result === 'pass') pass++;
    else if (e.result === 'fail') fail++;
    else pending++;
  }
  return { total: evidence.length, pass, fail, pending };
}

/**
 * Status icon for a feature row.
 */
function statusIcon(feature: PdcaFeature, zombie: boolean): string {
  if (zombie) return 'Zombie';
  if (feature.currentStage === 'completed') return 'Done';
  return 'Active';
}

/**
 * Generate STATUS.md from pdca-status.json.
 */
export function generateStatusView(projectDir: string): StatusViewResult {
  const statePath = join(projectDir, '.aing', 'state', 'pdca-status.json');
  const outputPath = join(projectDir, '.aing', 'STATUS.md');

  const state: PdcaState = readStateOrDefault(statePath, { version: 1, features: {}, activeFeature: null }) as PdcaState;
  const features = state.features || {};
  const activeFeature = state.activeFeature || null;

  const featureNames = Object.keys(features);
  const featureCount = featureNames.length;

  // Identify zombies
  const zombieSet = new Set<string>();
  for (const name of featureNames) {
    if (isZombie(features[name])) zombieSet.add(name);
  }
  const zombieCount = zombieSet.size;

  const now = new Date().toISOString();
  const lines: string[] = [];

  // Header
  lines.push(`# aing Status`);
  lines.push(`> Auto-generated at ${now}. Do not edit manually.`);
  lines.push('');

  // Active Feature section
  if (activeFeature && features[activeFeature]) {
    const feat = features[activeFeature];
    const ev = evidenceSummary(feat.evidence);
    const age = relativeTime(feat.lastActivityAt || feat.startedAt);

    lines.push(`## Active Feature`);
    lines.push(`- **${activeFeature}**: Stage \`${feat.currentStage}\`, Iteration #${feat.iteration}`);
    lines.push(`- Evidence: ${ev.total} items (${ev.pass} pass / ${ev.fail} fail / ${ev.pending} pending)`);
    lines.push(`- Last Activity: ${age} ago`);
    lines.push('');
  }

  // All Features table
  lines.push(`## All Features (${featureCount} total)`);
  lines.push('');
  lines.push(`| Feature | Stage | Iteration | Evidence | Age | Status |`);
  lines.push(`|---------|-------|-----------|----------|-----|--------|`);

  for (const name of featureNames) {
    const feat = features[name];
    const ev = evidenceSummary(feat.evidence);
    const age = relativeTime(feat.lastActivityAt || feat.startedAt);
    const zombie = zombieSet.has(name);
    const icon = statusIcon(feat, zombie);
    lines.push(`| ${name} | ${feat.currentStage} | ${feat.iteration} | ${ev.total} | ${age} | ${icon} |`);
  }
  lines.push('');

  // Warnings section
  if (zombieCount > 0) {
    lines.push(`## Warnings`);
    lines.push(`- ${zombieCount} zombie feature(s) detected (no activity > ${ZOMBIE_AGE_DAYS} days). Run \`/aing gc\` to clean up.`);
    lines.push('');
  }

  const content = lines.join('\n');

  // Write atomically via temp+rename (mkdirSync + writeFileSync mirrors writeState pattern)
  try {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, 'utf-8');
    log.info('STATUS.md generated', { featureCount, zombieCount, activeFeature });
  } catch (err) {
    log.error('Failed to write STATUS.md', { error: (err as Error).message });
  }

  return { path: outputPath, featureCount, zombieCount, activeFeature };
}
