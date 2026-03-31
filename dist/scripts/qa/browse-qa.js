/**
 * QA testing module using aing-browse wrapper.
 * Integrates with qa-orchestrator for browser-based evidence collection.
 *
 * Uses BrowseWrapper for typed, structured access to the browse daemon
 * and EvidenceCollector for screenshot/snapshot evidence.
 */
import { createBrowse } from '../../browse/src/browse-wrapper.js';
import { EvidenceCollector } from '../../browse/src/evidence.js';
/** Run a full QA check on a URL */
export async function runBrowseQA(projectDir, url, outputDir) {
    const browseResult = await createBrowse(projectDir);
    if (!browseResult.ok) {
        return {
            url,
            passed: false,
            consoleErrors: [],
            performanceMetrics: '',
            screenshots: [],
            snapshotTree: '',
            issues: [{ severity: 'critical', description: `Browse connection failed: ${browseResult.error}` }],
        };
    }
    const browse = browseResult.data;
    const evidence = new EvidenceCollector(projectDir);
    const issues = [];
    // 1. Navigate and get snapshot
    const gotoResult = await browse.goto(url);
    if (!gotoResult.ok) {
        return {
            url,
            passed: false,
            consoleErrors: [],
            performanceMetrics: '',
            screenshots: [],
            snapshotTree: '',
            issues: [{ severity: 'critical', description: `Navigation failed: ${gotoResult.error}` }],
        };
    }
    // Wait for page to settle
    await browse.waitFor('--load');
    const snapshotResult = await browse.snapshot({ interactive: true });
    const snapshotTree = snapshotResult.ok ? snapshotResult.data.tree : '';
    // 2. Check console errors
    const consoleResult = await browse.console(true);
    const consoleErrors = [];
    if (consoleResult.ok && consoleResult.data.length > 0) {
        for (const entry of consoleResult.data) {
            consoleErrors.push(`[${entry.level}] ${entry.message}`);
        }
        issues.push({
            severity: 'warning',
            description: `${consoleErrors.length} console error(s) found`,
        });
    }
    // 3. Performance check
    const perfResult = await browse.perf();
    const performanceMetrics = perfResult.ok ? perfResult.data : '';
    // 4. Responsive screenshots
    const responsiveResult = await browse.responsive(`${outputDir}/qa`);
    const screenshots = responsiveResult.ok ? responsiveResult.data : [];
    // 5. Take annotated screenshot
    const annotatedPath = `${outputDir}/qa-annotated.png`;
    const annotatedResult = await browse.screenshot(annotatedPath);
    if (annotatedResult.ok) {
        screenshots.push(annotatedResult.data);
    }
    // 6. Capture evidence
    await evidence.capture(browse, 'qa-check');
    return {
        url,
        passed: issues.filter((i) => i.severity === 'critical').length === 0,
        consoleErrors,
        performanceMetrics,
        screenshots,
        snapshotTree,
        issues,
        evidenceSessionId: evidence.getSessionId(),
    };
}
/** Run QA flow test (multi-step user journey) */
export async function runFlowTest(projectDir, steps, outputDir) {
    const browseResult = await createBrowse(projectDir);
    if (!browseResult.ok) {
        return {
            url: '',
            passed: false,
            consoleErrors: [],
            performanceMetrics: '',
            screenshots: [],
            snapshotTree: '',
            issues: [{ severity: 'critical', description: `Browse connection failed: ${browseResult.error}` }],
        };
    }
    const browse = browseResult.data;
    const evidence = new EvidenceCollector(projectDir);
    const issues = [];
    const screenshots = [];
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        try {
            let result;
            switch (step.action) {
                case 'goto':
                    result = await browse.goto(step.value);
                    if (!result.ok)
                        throw new Error(result.error);
                    break;
                case 'click':
                    result = await browse.click(step.selector);
                    if (!result.ok)
                        throw new Error(result.error);
                    break;
                case 'fill':
                    result = await browse.fill(step.selector, step.value);
                    if (!result.ok)
                        throw new Error(result.error);
                    break;
                case 'assert_visible': {
                    const isResult = await browse.is('visible', step.selector);
                    if (!isResult.ok) {
                        throw new Error(isResult.error);
                    }
                    if (!isResult.data.result) {
                        issues.push({
                            severity: 'critical',
                            description: `Step ${i + 1}: Expected ${step.selector} to be visible`,
                            selector: step.selector,
                        });
                    }
                    break;
                }
                case 'screenshot': {
                    const path = `${outputDir}/step-${i + 1}.png`;
                    const ssResult = await browse.screenshot(path);
                    if (ssResult.ok) {
                        screenshots.push(ssResult.data);
                    }
                    break;
                }
                case 'snapshot': {
                    await browse.snapshot({ interactive: true });
                    break;
                }
                case 'wait':
                    result = await browse.waitFor(step.value ?? step.selector ?? '--load');
                    if (!result.ok)
                        throw new Error(result.error);
                    break;
                default:
                    issues.push({
                        severity: 'warning',
                        description: `Step ${i + 1}: Unknown action "${step.action}"`,
                    });
            }
            // Capture evidence at each step
            await evidence.capture(browse, `step-${i + 1}-${step.action}`);
        }
        catch (err) {
            issues.push({
                severity: 'critical',
                description: `Step ${i + 1} failed: ${err.message}`,
            });
        }
    }
    // Final snapshot
    const snapshotResult = await browse.snapshot({ interactive: false });
    const snapshotTree = snapshotResult.ok ? snapshotResult.data.tree : '';
    // Console errors
    const consoleResult = await browse.console(true);
    const consoleErrors = [];
    if (consoleResult.ok) {
        for (const entry of consoleResult.data) {
            consoleErrors.push(`[${entry.level}] ${entry.message}`);
        }
    }
    // Performance
    const perfResult = await browse.perf();
    const performanceMetrics = perfResult.ok ? perfResult.data : '';
    // Generate evidence report
    const verdict = issues.filter((i) => i.severity === 'critical').length === 0 ? 'pass' : 'fail';
    evidence.generateReport('Flow Test', verdict);
    return {
        url: browse.getPageState().url,
        passed: verdict === 'pass',
        consoleErrors,
        performanceMetrics,
        screenshots,
        snapshotTree,
        issues,
        evidenceSessionId: evidence.getSessionId(),
    };
}
//# sourceMappingURL=browse-qa.js.map