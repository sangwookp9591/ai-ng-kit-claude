/**
 * aing Evidence Chain (Innovation #4)
 * Builds structured proof chains for PDCA completion verification.
 * @module scripts/evidence/evidence-chain
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { join } from 'node:path';
/**
 * Add evidence to a feature's chain.
 */
export function addEvidence(feature, evidence, projectDir) {
    const dir = projectDir || process.cwd();
    const chainPath = join(dir, '.aing', 'state', `evidence-${feature}.json`);
    const chain = readStateOrDefault(chainPath, { feature, entries: [], verdict: null });
    chain.entries.push({
        ...evidence,
        seq: chain.entries.length + 1,
        ts: new Date().toISOString()
    });
    writeState(chainPath, chain);
}
/**
 * Evaluate the evidence chain and produce a verdict.
 */
export function evaluateChain(feature, projectDir) {
    const dir = projectDir || process.cwd();
    const chainPath = join(dir, '.aing', 'state', `evidence-${feature}.json`);
    const chain = readStateOrDefault(chainPath, { feature, entries: [] });
    if (chain.entries.length === 0) {
        return { verdict: 'INCOMPLETE', summary: 'No evidence collected', entries: [] };
    }
    const hasFail = chain.entries.some(e => e.result === 'fail');
    const allPass = chain.entries.every(e => e.result === 'pass' || e.result === 'not_available');
    const verdict = hasFail ? 'FAIL' : allPass ? 'PASS' : 'INCOMPLETE';
    const summary = chain.entries.map(e => `[${e.type}] ${(e.result || 'unknown').toUpperCase()} (${e.source || 'unknown'})`).join('\n');
    // Persist verdict
    chain.verdict = verdict;
    chain.evaluatedAt = new Date().toISOString();
    writeState(chainPath, chain);
    return { verdict, summary, entries: chain.entries };
}
/**
 * Format evidence chain for display.
 */
export function formatChain(feature, projectDir) {
    const { verdict, entries } = evaluateChain(feature, projectDir);
    const lines = [`Evidence Chain: ${feature}`];
    for (const entry of entries) {
        const icon = entry.result === 'pass' ? '✓' : entry.result === 'fail' ? '✗' : '○';
        lines.push(`├── [${entry.type}] ${icon} ${entry.result.toUpperCase()} — ${entry.source}`);
    }
    lines.push(`└── Verdict: ${verdict} ${verdict === 'PASS' ? '✓' : verdict === 'FAIL' ? '✗' : '...'}`);
    return lines.join('\n');
}
//# sourceMappingURL=evidence-chain.js.map