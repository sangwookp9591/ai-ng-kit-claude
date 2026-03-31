interface ScopeResult {
    frontend: boolean;
    backend: boolean;
    prompts: boolean;
    tests: boolean;
    docs: boolean;
    config: boolean;
    files: string[];
    [key: string]: boolean | string[];
}
/**
 * Detect scope categories from changed files.
 */
export declare function detectScope(baseBranch: string, projectDir?: string): ScopeResult;
/**
 * Format scope for display.
 */
export declare function formatScope(scope: ScopeResult): string;
export {};
//# sourceMappingURL=aing-diff-scope.d.ts.map