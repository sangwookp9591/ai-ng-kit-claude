/**
 * aing Careful Guard (Phase 4 — 200% Differentiator)
 *
 * Combines aing's circuit breaker with gstack's careful pattern detection.
 * Enhanced destructive command detection beyond the base guardrail-engine.
 *
 * @module scripts/guardrail/careful-guard
 */
type PatternLevel = 'allow' | 'warn' | 'block';
interface CarefulPattern {
    pattern: RegExp;
    level: PatternLevel;
    message?: string;
}
interface CarefulResult {
    level: PatternLevel;
    message?: string;
}
interface FreezeConfig {
    guardrail?: {
        freezeDirs?: string[];
    };
}
/**
 * Enhanced destructive command patterns (from gstack's careful).
 * More comprehensive than the base guardrail-engine patterns.
 * Patterns are checked in order; 'allow' matches short-circuit.
 */
export declare const CAREFUL_PATTERNS: CarefulPattern[];
/**
 * Check a bash command against careful patterns.
 * Allow patterns are checked first (safe exceptions).
 */
export declare function checkCareful(command: string): CarefulResult;
/**
 * Check a file path against freeze boundaries.
 * Similar to gstack's freeze but using aing's config system.
 */
export declare function checkFreeze(filePath: string, config?: FreezeConfig): CarefulResult;
/**
 * Format careful guard result for display.
 */
export declare function formatCarefulResult(result: CarefulResult): string;
export {};
//# sourceMappingURL=careful-guard.d.ts.map