/**
 * aing Context Compaction Strategy v0.4.0
 * Intelligent context preservation during compaction.
 * Harness Engineering: Inform axis — survive context window limits.
 * @module scripts/compaction/context-compaction
 */
interface CompactionResult {
    context: string;
    preserved: string[];
    dropped: string[];
    tokens: number;
}
/**
 * Build compaction context — what to preserve when context is compressed.
 */
export declare function buildCompactionContext(projectDir?: string): CompactionResult;
/**
 * Generate the compaction injection string for PreCompact hook.
 */
export declare function generateCompactionInjection(projectDir?: string): string;
export {};
//# sourceMappingURL=context-compaction.d.ts.map