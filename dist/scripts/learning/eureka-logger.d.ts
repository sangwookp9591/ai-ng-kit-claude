/**
 * aing Cross-Session Eureka Logger (Phase 4 — 200% Differentiator)
 *
 * Logs "eureka" discoveries — novel patterns found during
 * Search Before Building Layer 3.
 * Persisted as JSONL for fast append + tail reads.
 *
 * @module scripts/learning/eureka-logger
 */
interface EurekaEntry {
    feature: string;
    discovery: string;
    rationale: string;
    files?: string[];
    reusable?: boolean;
}
interface EurekaRecord extends EurekaEntry {
    timestamp: string;
}
/**
 * Log a eureka discovery.
 * Called when Able finds a Layer 3 novel approach.
 */
export declare function logEureka(projectDir: string, entry: EurekaEntry): EurekaRecord;
/**
 * Get recent eureka discoveries for context injection.
 * Returns up to N most recent discoveries (newest last).
 */
export declare function getRecentEurekas(projectDir: string, limit?: number): EurekaRecord[];
/**
 * Get reusable eurekas — discoveries marked as reusable patterns.
 * Scans the full log (up to 100 entries from tail) for reusable entries.
 */
export declare function getReusableEurekas(projectDir: string): EurekaRecord[];
/**
 * Format eureka entries for preamble injection.
 */
export declare function formatEurekas(eurekas: EurekaRecord[]): string;
export {};
//# sourceMappingURL=eureka-logger.d.ts.map