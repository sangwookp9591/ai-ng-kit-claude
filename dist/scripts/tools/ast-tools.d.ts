/**
 * AST-based structural code search and replace using @ast-grep/napi.
 * Supports pattern matching with meta-variables ($VAR, $$$VARS).
 * @module scripts/tools/ast-tools
 */
declare const SUPPORTED_LANGS: readonly ["typescript", "javascript", "tsx", "jsx", "css", "html"];
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export interface AstMatch {
    filePath: string;
    line: number;
    column: number;
    matchedText: string;
    surroundingCode: string;
}
export interface ReplaceResult {
    dryRun: boolean;
    totalReplacements: number;
    filesChanged: number;
    changes: Array<{
        filePath: string;
        line: number;
        before: string;
        after: string;
    }>;
}
/**
 * Search code using ast-grep structural patterns.
 *
 * Meta-variables:
 *   $NAME  — matches any single AST node
 *   $$$    — matches multiple nodes (spread)
 *
 * Examples:
 *   "console.log($MSG)"            — all console.log calls
 *   "function $NAME($$$ARGS) {}" — all function declarations
 */
export declare function astGrepSearch(pattern: string, options?: {
    lang?: SupportedLang;
    path?: string;
}): Promise<AstMatch[]>;
/**
 * Structural search-and-replace using ast-grep patterns.
 *
 * Meta-variables captured in `pattern` are substituted into `replacement`.
 * Default: dryRun=true (preview only). Pass dryRun=false to write files.
 */
export declare function astGrepReplace(pattern: string, replacement: string, options?: {
    lang?: SupportedLang;
    path?: string;
    dryRun?: boolean;
}): Promise<ReplaceResult>;
export {};
//# sourceMappingURL=ast-tools.d.ts.map