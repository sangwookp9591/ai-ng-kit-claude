/**
 * Browse daemon integration for browser evidence collection.
 * Uses the aing-browse daemon (browse/) instead of MCP Playwright.
 */
export interface BrowseConfig {
    browseBin: string;
    timeout: number;
}
/** Find the browse binary */
export declare function findBrowseBin(projectDir: string): string | null;
/** Execute a browse command and return output */
export declare function browseExec(bin: string, command: string, args?: string[], timeout?: number): string;
/** Take a screenshot and return the path */
export declare function browseScreenshot(bin: string, url: string, outputPath: string): string;
/** Get annotated snapshot with @refs */
export declare function browseSnapshot(bin: string, url: string, interactive?: boolean): string;
/** Check page for console errors */
export declare function browseConsoleErrors(bin: string): string[];
/** Check if element is visible */
export declare function browseIsVisible(bin: string, selector: string): boolean;
/** Run responsive screenshots (mobile, tablet, desktop) */
export declare function browseResponsive(bin: string, url: string, prefix: string): string[];
/** Get page performance metrics */
export declare function browsePerf(bin: string): string;
//# sourceMappingURL=browse-integration.d.ts.map