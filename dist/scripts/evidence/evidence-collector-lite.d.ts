/**
 * aing Evidence Collector Lite (Phase 2 — basic interface)
 * Collects basic evidence from tool outputs.
 * Full version expands in Phase 4.
 * @module scripts/evidence/evidence-collector-lite
 */
export interface BasicEvidence {
    type: string;
    timestamp: string;
    result: string;
    source: string;
    details?: Record<string, string>;
}
/**
 * Collect basic evidence from a tool execution.
 */
export declare function collectBasicEvidence(toolName: string, output: string): BasicEvidence | null;
//# sourceMappingURL=evidence-collector-lite.d.ts.map