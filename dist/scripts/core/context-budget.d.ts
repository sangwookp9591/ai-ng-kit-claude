/**
 * aing Context Budget System (Innovation #1)
 *
 * Tracks approximate token consumption per hook injection.
 * Uses word-based estimation (no external dependencies).
 *
 * IMPORTANT: All values are approximations (~).
 * Not a substitute for exact tokenizer counts.
 *
 * @module scripts/core/context-budget
 */
interface Injection {
    source: string;
    tokens: number;
    ts: string;
}
interface TrackInjectionResult {
    tokens: number;
    totalUsed: number;
    overBudget: boolean;
}
interface BudgetStatus {
    total: number;
    injections: Injection[];
    warnings: string[];
}
/**
 * Estimate token count from text.
 * Approximation: ~0.75 tokens per English word, ~2 tokens per Korean character cluster.
 */
export declare function estimateTokens(text: string): number;
/**
 * Record a context injection and check budget.
 * @param source - Hook/module name (e.g. 'session-start', 'pre-tool-use')
 * @param content - Injected context text
 */
export declare function trackInjection(source: string, content: string): TrackInjectionResult;
/**
 * Get current budget status.
 */
export declare function getBudgetStatus(): BudgetStatus;
/**
 * Reset budget tracking (called at session start).
 */
export declare function resetBudget(): void;
/**
 * Trim content to fit within a token budget.
 * Prioritizes keeping the beginning of content.
 */
export declare function trimToTokenBudget(content: string, maxTokens: number): string;
export {};
//# sourceMappingURL=context-budget.d.ts.map