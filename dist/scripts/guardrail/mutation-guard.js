/**
 * aing Mutation Guard — Track and audit file modifications
 * @module scripts/guardrail/mutation-guard
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { join } from 'node:path';
/**
 * Record a file mutation for audit.
 */
export function recordMutation(filePath, action, agent, projectDir) {
    const dir = projectDir || process.cwd();
    const auditPath = join(dir, '.aing', 'state', 'mutation-audit.json');
    const audit = readStateOrDefault(auditPath, { mutations: [] });
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
export function getRecentMutations(limit = 20, projectDir) {
    const dir = projectDir || process.cwd();
    const auditPath = join(dir, '.aing', 'state', 'mutation-audit.json');
    const audit = readStateOrDefault(auditPath, { mutations: [] });
    return audit.mutations.slice(-limit);
}
/**
 * Format mutation audit for display.
 */
export function formatMutationAudit(mutations) {
    if (mutations.length === 0)
        return 'No mutations recorded.';
    const lines = [`Mutation Audit (${mutations.length} recent):`];
    for (const m of mutations.slice(-10)) {
        lines.push(`  ${m.ts.slice(11, 19)} [${m.action}] ${m.file} (${m.agent})`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=mutation-guard.js.map