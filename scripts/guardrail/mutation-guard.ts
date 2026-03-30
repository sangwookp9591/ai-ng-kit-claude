/**
 * aing Mutation Guard — Track and audit file modifications
 * @module scripts/guardrail/mutation-guard
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { join } from 'node:path';

interface Mutation {
  file: string;
  action: 'create' | 'edit' | 'delete';
  agent: string;
  ts: string;
}

interface MutationAudit {
  mutations: Mutation[];
}

/**
 * Record a file mutation for audit.
 */
export function recordMutation(filePath: string, action: 'create' | 'edit' | 'delete', agent: string, projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const auditPath = join(dir, '.aing', 'state', 'mutation-audit.json');
  const audit = readStateOrDefault(auditPath, { mutations: [] }) as MutationAudit;

  audit.mutations.push({
    file: filePath,
    action,
    agent,
    ts: new Date().toISOString(),
  });

  // Keep last 200 mutations
  if (audit.mutations.length > 200) {
    audit.mutations = audit.mutations.slice(-200);
  }

  writeState(auditPath, audit);
}

/**
 * Get recent mutations.
 */
export function getRecentMutations(limit: number = 20, projectDir?: string): Mutation[] {
  const dir = projectDir || process.cwd();
  const auditPath = join(dir, '.aing', 'state', 'mutation-audit.json');
  const audit = readStateOrDefault(auditPath, { mutations: [] }) as MutationAudit;
  return audit.mutations.slice(-limit);
}

/**
 * Format mutation audit for display.
 */
export function formatMutationAudit(mutations: Mutation[]): string {
  if (mutations.length === 0) return 'No mutations recorded.';
  const lines: string[] = [`Mutation Audit (${mutations.length} recent):`];
  for (const m of mutations.slice(-10)) {
    lines.push(`  ${m.ts.slice(11, 19)} [${m.action}] ${m.file} (${m.agent})`);
  }
  return lines.join('\n');
}
