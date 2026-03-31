import { type AriaRefEntry } from './aria-refs.js';
/**
 * Browser evidence types that can be added to the evidence chain.
 */
export declare const BROWSER_EVIDENCE_TYPES: {
    readonly SCREENSHOT: "browser-screenshot";
    readonly CONSOLE: "browser-console";
    readonly NETWORK: "browser-network";
    readonly ACCESSIBILITY: "browser-a11y";
    readonly VISUAL_DIFF: "browser-visual-diff";
};
export type BrowserEvidenceType = typeof BROWSER_EVIDENCE_TYPES[keyof typeof BROWSER_EVIDENCE_TYPES];
export interface ScreenshotData {
    url: string;
    screenshotPath: string;
    description: string;
    passed: boolean;
}
export interface ConsoleData {
    url: string;
    errors?: string[];
    warnings?: string[];
}
export interface AccessibilityData {
    url: string;
    violations: number;
    issues?: string[];
}
export interface VisualDiffData {
    url: string;
    beforePath: string;
    afterPath: string;
    diffPercent: number;
    acceptable: boolean;
    threshold?: number;
}
export interface BrowserTestPlanContext {
    feature: string;
    routes?: string[];
    interactions?: string[];
}
export interface BrowserTestCase {
    name: string;
    steps: string[];
    evidenceType: string;
}
export interface BrowserQAConfig {
    baseUrl: string;
    routes?: string[];
    interactions?: string[];
    checkA11y?: boolean;
    checkConsole?: boolean;
}
export interface BrowserQAResult {
    testPlan: BrowserTestCase[];
    evidenceCount: number;
    instructions: string[];
}
export interface SnapshotAnalysis {
    refs: Map<string, AriaRefEntry>;
    refCount: number;
    formatted: string;
}
export interface BrowserEvidenceEntry {
    type: string;
    result: string;
    details?: {
        url?: string;
        [key: string]: unknown;
    };
}
/**
 * Add a screenshot as evidence.
 * Called after an agent takes a browser screenshot via MCP.
 */
export declare function addScreenshotEvidence(feature: string, data: ScreenshotData, projectDir?: string): void;
/**
 * Add console error evidence.
 * Called after checking browser console for errors.
 */
export declare function addConsoleEvidence(feature: string, data: ConsoleData, projectDir?: string): void;
/**
 * Add accessibility audit evidence.
 * Called after running accessibility snapshot via MCP.
 *
 * gstack pattern absorbed: ARIA-tree refs instead of DOM mutation.
 * Use Playwright's ariaSnapshot() for element addressing.
 */
export declare function addAccessibilityEvidence(feature: string, data: AccessibilityData, projectDir?: string): void;
/**
 * Add visual diff evidence (before/after comparison).
 *
 * gstack pattern: screenshot diff between two states.
 */
export declare function addVisualDiffEvidence(feature: string, data: VisualDiffData, projectDir?: string): void;
/**
 * Build a QA test plan for browser-based verification.
 * Returns structured test cases for agents to execute via MCP Playwright.
 */
export declare function buildBrowserTestPlan(context: BrowserTestPlanContext): BrowserTestCase[];
/**
 * Format browser evidence summary for display.
 */
export declare function formatBrowserEvidence(entries: BrowserEvidenceEntry[]): string;
/**
 * Orchestrate a complete browser QA session.
 * Combines: navigate → snapshot → ARIA refs → test actions → evidence collection.
 *
 * This is the high-level function agents call to run browser-based QA.
 * It uses MCP Playwright tools under the hood.
 */
export declare function orchestrateBrowserQA(feature: string, config: BrowserQAConfig, _projectDir?: string): BrowserQAResult;
/**
 * Parse and analyze an ARIA snapshot for QA purposes.
 * Combines ARIA parsing with evidence recording.
 */
export declare function analyzeSnapshot(feature: string, snapshotText: string, url: string, projectDir?: string): SnapshotAnalysis;
//# sourceMappingURL=browser-evidence.d.ts.map