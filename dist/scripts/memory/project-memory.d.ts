/**
 * aing Project Memory (Innovation #2 — Cross-Session Learning)
 * Persistent project knowledge that survives across sessions.
 * @module scripts/memory/project-memory
 */
interface MemoryEntry {
    content: string | Record<string, unknown>;
    addedAt: string;
    confidence: number;
    source: 'user' | 'observed' | 'inferred' | 'passive';
    lastDecayed?: string;
}
interface ProjectMemory {
    techStack: Record<string, unknown>;
    conventions: Record<string, unknown>;
    patterns: MemoryEntry[];
    pitfalls: MemoryEntry[];
    decisions: MemoryEntry[];
}
interface AddMemoryOptions {
    confidence?: number;
    source?: 'user' | 'observed' | 'inferred' | 'passive';
}
interface DecayResult {
    decayed: number;
    removed: number;
}
/**
 * Load project memory.
 */
export declare function loadMemory(projectDir?: string): ProjectMemory;
/**
 * Save project memory (atomic write).
 */
export declare function saveMemory(memory: ProjectMemory, projectDir?: string): unknown;
/**
 * Add a note to a specific memory section.
 */
export declare function addMemoryEntry(section: keyof ProjectMemory, entry: string | Record<string, unknown>, projectDir?: string, { confidence, source }?: AddMemoryOptions): unknown;
/**
 * Apply confidence decay to memory entries.
 * observed/inferred: -1 per 30 days. user-stated: never decay.
 */
export declare function applyConfidenceDecay(projectDir?: string): DecayResult;
/**
 * Get a summary of project memory for context injection.
 */
export declare function getMemorySummary(projectDir?: string, minConfidence?: number): string;
export {};
//# sourceMappingURL=project-memory.d.ts.map