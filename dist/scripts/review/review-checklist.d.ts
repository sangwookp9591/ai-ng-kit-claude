/**
 * aing Review Checklist — 18-Category Code Review Engine
 * Absorbed from gstack's checklist.md (221 lines, 18 categories).
 *
 * Pass 1 (CRITICAL): SQL, Race, LLM, Enum, Auth, Data Exposure
 * Pass 2 (INFORMATIONAL): Async, Magic, Dead, N+1, Stale, Error, Type, Crypto, Time, View, Perf, Distribution
 *
 * NOTE: This file contains security-sensitive regex patterns used for CODE REVIEW DETECTION,
 * not for execution. The patterns match dangerous code patterns in diffs being reviewed.
 *
 * @module scripts/review/review-checklist
 */
export interface CheckPattern {
    regex: RegExp;
    desc: string;
}
export interface CheckCategory {
    pass: number;
    severity: string;
    name: string;
    patterns: CheckPattern[];
}
export interface Finding {
    desc: string;
    matches: number;
    lines: string[];
}
export interface CheckResult {
    category: string;
    name: string;
    severity: string;
    pass: number;
    findings: Finding[];
}
export interface ClassifiedResults {
    autoFix: CheckResult[];
    needsAsk: CheckResult[];
    summary: {
        total: number;
        critical: number;
        autoFixable: number;
        needsDecision: number;
    };
}
/**
 * 18 review categories with detection patterns.
 */
export declare const CATEGORIES: Record<string, CheckCategory>;
/**
 * Run all checklist categories against diff content.
 */
export declare function runChecklist(diffContent: string): CheckResult[];
/**
 * Classify results using Fix-First heuristic.
 */
export declare function classifyResults(results: CheckResult[]): ClassifiedResults;
/**
 * Format checklist results for display.
 */
export declare function formatChecklistResults(results: CheckResult[], classified: ClassifiedResults): string;
//# sourceMappingURL=review-checklist.d.ts.map