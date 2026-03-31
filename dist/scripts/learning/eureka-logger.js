/**
 * aing Cross-Session Eureka Logger (Phase 4 — 200% Differentiator)
 *
 * Logs "eureka" discoveries — novel patterns found during
 * Search Before Building Layer 3.
 * Persisted as JSONL for fast append + tail reads.
 *
 * @module scripts/learning/eureka-logger
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const EUREKA_DIR = join('.aing', 'learning');
const EUREKA_FILE = join(EUREKA_DIR, 'eureka.jsonl');
/**
 * Log a eureka discovery.
 * Called when Able finds a Layer 3 novel approach.
 */
export function logEureka(projectDir, entry) {
    const dir = join(projectDir, EUREKA_DIR);
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    const record = {
        timestamp: new Date().toISOString(),
        feature: entry.feature,
        discovery: entry.discovery,
        rationale: entry.rationale,
        files: entry.files || [],
        reusable: entry.reusable || false,
    };
    const filePath = join(projectDir, EUREKA_FILE);
    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
    writeFileSync(filePath, existing + JSON.stringify(record) + '\n');
    return record;
}
/**
 * Get recent eureka discoveries for context injection.
 * Returns up to N most recent discoveries (newest last).
 */
export function getRecentEurekas(projectDir, limit = 5) {
    const filePath = join(projectDir, EUREKA_FILE);
    if (!existsSync(filePath))
        return [];
    const lines = readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map((line) => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    }).filter(Boolean);
}
/**
 * Get reusable eurekas — discoveries marked as reusable patterns.
 * Scans the full log (up to 100 entries from tail) for reusable entries.
 */
export function getReusableEurekas(projectDir) {
    return getRecentEurekas(projectDir, 100).filter((e) => e.reusable);
}
/**
 * Format eureka entries for preamble injection.
 */
export function formatEurekas(eurekas) {
    if (eurekas.length === 0)
        return '';
    const lines = ['[aing Eureka Log]'];
    for (const e of eurekas) {
        const reuse = e.reusable ? ' [reusable]' : '';
        lines.push(`  - [${e.feature}] ${e.discovery}${reuse}`);
        if (e.rationale)
            lines.push(`    Rationale: ${e.rationale}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=eureka-logger.js.map