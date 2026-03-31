/**
 * aing Learnable Pattern Detector
 * Detects reusable patterns from tool usage and stores them for future suggestions.
 * @module scripts/hooks/learnable-pattern
 */
export interface LearnablePattern {
    type: 'command' | 'filePattern' | 'errorFix';
    pattern: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
    suggestion?: string;
    /** Internal: tracks an unresolved error awaiting a successful retry */
    pendingError?: string;
}
export interface PatternStore {
    patterns: LearnablePattern[];
}
/**
 * Record a pattern use and persist. Called on every relevant tool invocation.
 */
export declare function recordPatternUse(projectDir: string, type: LearnablePattern['type'], pattern: string, pendingError?: string): void;
/**
 * Detect if the current tool use represents a learnable pattern.
 * Returns a LearnablePattern if a pattern crosses the threshold, null otherwise.
 */
export declare function detectLearnablePattern(projectDir: string, toolName: string, toolInput: Record<string, unknown>, toolResponse: string): LearnablePattern | null;
//# sourceMappingURL=learnable-pattern.d.ts.map