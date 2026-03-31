/**
 * Browse daemon integration for browser evidence collection.
 * Uses the aing-browse daemon (browse/) instead of MCP Playwright.
 */
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
/** Find the browse binary */
export function findBrowseBin(projectDir) {
    const candidates = [
        join(projectDir, 'browse', 'dist', 'cli.js'),
        join(projectDir, 'node_modules', '.bin', 'aing-browse'),
    ];
    for (const c of candidates) {
        if (existsSync(c))
            return c;
    }
    return null;
}
/** Execute a browse command and return output */
export function browseExec(bin, command, args = [], timeout = 30000) {
    const fullArgs = [bin, command, ...args].join(' ');
    try {
        return execSync(`node ${fullArgs}`, { timeout, encoding: 'utf-8' }).trim();
    }
    catch (err) {
        throw new Error(`Browse command failed: ${command} — ${err.message}`);
    }
}
/** Take a screenshot and return the path */
export function browseScreenshot(bin, url, outputPath) {
    browseExec(bin, 'goto', [url]);
    browseExec(bin, 'screenshot', [outputPath]);
    return outputPath;
}
/** Get annotated snapshot with @refs */
export function browseSnapshot(bin, url, interactive = true) {
    browseExec(bin, 'goto', [url]);
    const flags = interactive ? ['-i'] : [];
    return browseExec(bin, 'snapshot', flags);
}
/** Check page for console errors */
export function browseConsoleErrors(bin) {
    const output = browseExec(bin, 'console', ['--errors']);
    return output ? output.split('\n').filter(Boolean) : [];
}
/** Check if element is visible */
export function browseIsVisible(bin, selector) {
    try {
        const result = browseExec(bin, 'is', ['visible', selector]);
        return result.includes('true');
    }
    catch {
        return false;
    }
}
/** Run responsive screenshots (mobile, tablet, desktop) */
export function browseResponsive(bin, url, prefix) {
    browseExec(bin, 'goto', [url]);
    browseExec(bin, 'responsive', [prefix]);
    return [`${prefix}-mobile.png`, `${prefix}-tablet.png`, `${prefix}-desktop.png`];
}
/** Get page performance metrics */
export function browsePerf(bin) {
    return browseExec(bin, 'perf');
}
//# sourceMappingURL=browse-integration.js.map