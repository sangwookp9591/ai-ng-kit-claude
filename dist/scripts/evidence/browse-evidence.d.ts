/**
 * Browser-based evidence collection for the evidence chain.
 * Creates structured evidence entries from browse QA results.
 */
export interface BrowserEvidence {
    type: 'browser';
    category: 'visual' | 'performance' | 'console' | 'accessibility' | 'responsive';
    passed: boolean;
    details: string;
    artifacts: string[];
    timestamp: string;
}
/** Collect visual evidence for a URL */
export declare function collectVisualEvidence(projectDir: string, url: string, outputDir: string): BrowserEvidence;
/** Collect console error evidence */
export declare function collectConsoleEvidence(projectDir: string): BrowserEvidence;
/** Collect performance evidence */
export declare function collectPerfEvidence(projectDir: string): BrowserEvidence;
/** Collect accessibility evidence */
export declare function collectAccessibilityEvidence(projectDir: string): BrowserEvidence;
//# sourceMappingURL=browse-evidence.d.ts.map