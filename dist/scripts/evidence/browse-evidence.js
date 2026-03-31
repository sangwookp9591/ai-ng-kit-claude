/**
 * Browser-based evidence collection for the evidence chain.
 * Creates structured evidence entries from browse QA results.
 */
import { findBrowseBin, browseExec, browseConsoleErrors, browsePerf, browseScreenshot, browseSnapshot } from '../review/browse-integration.js';
/** Collect visual evidence for a URL */
export function collectVisualEvidence(projectDir, url, outputDir) {
    const bin = findBrowseBin(projectDir);
    if (!bin) {
        return {
            type: 'browser',
            category: 'visual',
            passed: false,
            details: 'Browse daemon not available',
            artifacts: [],
            timestamp: new Date().toISOString(),
        };
    }
    try {
        const screenshotPath = `${outputDir}/visual-evidence.png`;
        browseScreenshot(bin, url, screenshotPath);
        const snapshot = browseSnapshot(bin, url, true);
        return {
            type: 'browser',
            category: 'visual',
            passed: true,
            details: `Page loaded successfully. Interactive elements: ${(snapshot.match(/@e/g) || []).length}`,
            artifacts: [screenshotPath],
            timestamp: new Date().toISOString(),
        };
    }
    catch (err) {
        return {
            type: 'browser',
            category: 'visual',
            passed: false,
            details: `Visual check failed: ${err.message}`,
            artifacts: [],
            timestamp: new Date().toISOString(),
        };
    }
}
/** Collect console error evidence */
export function collectConsoleEvidence(projectDir) {
    const bin = findBrowseBin(projectDir);
    if (!bin) {
        return { type: 'browser', category: 'console', passed: false, details: 'Browse daemon not available', artifacts: [], timestamp: new Date().toISOString() };
    }
    const errors = browseConsoleErrors(bin);
    return {
        type: 'browser',
        category: 'console',
        passed: errors.length === 0,
        details: errors.length === 0 ? 'No console errors' : `${errors.length} error(s): ${errors.slice(0, 3).join('; ')}`,
        artifacts: [],
        timestamp: new Date().toISOString(),
    };
}
/** Collect performance evidence */
export function collectPerfEvidence(projectDir) {
    const bin = findBrowseBin(projectDir);
    if (!bin) {
        return { type: 'browser', category: 'performance', passed: false, details: 'Browse daemon not available', artifacts: [], timestamp: new Date().toISOString() };
    }
    const metrics = browsePerf(bin);
    return {
        type: 'browser',
        category: 'performance',
        passed: true,
        details: metrics,
        artifacts: [],
        timestamp: new Date().toISOString(),
    };
}
/** Collect accessibility evidence */
export function collectAccessibilityEvidence(projectDir) {
    const bin = findBrowseBin(projectDir);
    if (!bin) {
        return { type: 'browser', category: 'accessibility', passed: false, details: 'Browse daemon not available', artifacts: [], timestamp: new Date().toISOString() };
    }
    try {
        const tree = browseExec(bin, 'accessibility');
        const hasLandmarks = tree.includes('[banner]') || tree.includes('[main]') || tree.includes('[navigation]');
        return {
            type: 'browser',
            category: 'accessibility',
            passed: hasLandmarks,
            details: hasLandmarks ? 'ARIA landmarks found' : 'Missing ARIA landmarks (banner, main, navigation)',
            artifacts: [],
            timestamp: new Date().toISOString(),
        };
    }
    catch (err) {
        return {
            type: 'browser',
            category: 'accessibility',
            passed: false,
            details: `Accessibility check failed: ${err.message}`,
            artifacts: [],
            timestamp: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=browse-evidence.js.map