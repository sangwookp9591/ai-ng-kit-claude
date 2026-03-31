export interface AriaRefEntry {
    role: string;
    name: string;
    selector: string;
    line: number;
}
export interface StaleCheckResult {
    stale: boolean;
    added: number;
    removed: number;
}
export interface ActionResult {
    tool: string;
    params: Record<string, string>;
}
/**
 * Parse an ARIA snapshot and assign refs to interactive elements.
 */
export declare function parseAriaSnapshot(snapshotText: string): Map<string, AriaRefEntry>;
/**
 * Format refs for display to agents.
 */
export declare function formatRefs(refs: Map<string, AriaRefEntry>): string;
/**
 * Find a ref by partial name match.
 */
export declare function findRefs(refs: Map<string, AriaRefEntry>, query: string): Array<[string, AriaRefEntry]>;
/**
 * Check if refs are likely stale (element count changed).
 */
export declare function checkStale(oldRefs: Map<string, AriaRefEntry>, newRefs: Map<string, AriaRefEntry>): StaleCheckResult;
/**
 * Build a QA action from ref.
 * Returns the MCP Playwright command to execute.
 */
export declare function buildAction(ref: string, action: string, refs: Map<string, AriaRefEntry>, value?: string): ActionResult | null;
//# sourceMappingURL=aria-refs.d.ts.map