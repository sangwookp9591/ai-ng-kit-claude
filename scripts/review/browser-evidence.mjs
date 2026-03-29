/**
 * aing Browser Evidence Collector
 * 200% Synergy: gstack Browser QA + aing Evidence Chain
 *
 * Screenshots and browser state become evidence chain entries.
 * Uses MCP Playwright tools (mcp__playwright__*) — no separate daemon needed.
 *
 * Pattern absorbed from gstack:
 * - ARIA-tree refs for element addressing (accessibility-first)
 * - Screenshot diff for before/after verification
 * - Console/network log capture for bug evidence
 *
 * @module scripts/review/browser-evidence
 */
import { addEvidence } from '../evidence/evidence-chain.mjs';
import { createLogger } from '../core/logger.mjs';

const log = createLogger('browser-evidence');

/**
 * Browser evidence types that can be added to the evidence chain.
 */
export const BROWSER_EVIDENCE_TYPES = {
  SCREENSHOT: 'browser-screenshot',
  CONSOLE: 'browser-console',
  NETWORK: 'browser-network',
  ACCESSIBILITY: 'browser-a11y',
  VISUAL_DIFF: 'browser-visual-diff',
};

/**
 * Add a screenshot as evidence.
 * Called after an agent takes a browser screenshot via MCP.
 *
 * @param {string} feature - Feature being tested
 * @param {object} data
 * @param {string} data.url - Page URL
 * @param {string} data.screenshotPath - Path to screenshot file
 * @param {string} data.description - What was captured
 * @param {boolean} data.passed - Whether the visual check passed
 * @param {string} [projectDir]
 */
export function addScreenshotEvidence(feature, data, projectDir) {
  addEvidence(feature, {
    type: BROWSER_EVIDENCE_TYPES.SCREENSHOT,
    result: data.passed ? 'pass' : 'fail',
    source: 'mcp-playwright',
    details: {
      url: data.url,
      screenshot: data.screenshotPath,
      description: data.description,
      capturedAt: new Date().toISOString(),
    },
  }, projectDir);

  log.info(`Screenshot evidence: ${data.url} → ${data.passed ? 'PASS' : 'FAIL'}`);
}

/**
 * Add console error evidence.
 * Called after checking browser console for errors.
 *
 * @param {string} feature
 * @param {object} data
 * @param {string} data.url
 * @param {string[]} data.errors - Console error messages
 * @param {string[]} data.warnings - Console warnings
 * @param {string} [projectDir]
 */
export function addConsoleEvidence(feature, data, projectDir) {
  const hasErrors = (data.errors || []).length > 0;

  addEvidence(feature, {
    type: BROWSER_EVIDENCE_TYPES.CONSOLE,
    result: hasErrors ? 'fail' : 'pass',
    source: 'mcp-playwright',
    details: {
      url: data.url,
      errorCount: (data.errors || []).length,
      warningCount: (data.warnings || []).length,
      errors: (data.errors || []).slice(0, 10),  // Cap at 10
      warnings: (data.warnings || []).slice(0, 5),
    },
  }, projectDir);

  log.info(`Console evidence: ${data.url} → ${hasErrors ? 'FAIL' : 'PASS'} (${(data.errors || []).length} errors)`);
}

/**
 * Add accessibility audit evidence.
 * Called after running accessibility snapshot via MCP.
 *
 * gstack pattern absorbed: ARIA-tree refs instead of DOM mutation.
 * Use Playwright's ariaSnapshot() for element addressing.
 *
 * @param {string} feature
 * @param {object} data
 * @param {string} data.url
 * @param {number} data.violations - Number of a11y violations
 * @param {string[]} data.issues - Violation descriptions
 * @param {string} [projectDir]
 */
export function addAccessibilityEvidence(feature, data, projectDir) {
  addEvidence(feature, {
    type: BROWSER_EVIDENCE_TYPES.ACCESSIBILITY,
    result: (data.violations || 0) === 0 ? 'pass' : 'fail',
    source: 'mcp-playwright',
    details: {
      url: data.url,
      violations: data.violations || 0,
      issues: (data.issues || []).slice(0, 10),
    },
  }, projectDir);

  log.info(`A11y evidence: ${data.url} → ${data.violations || 0} violations`);
}

/**
 * Add visual diff evidence (before/after comparison).
 *
 * gstack pattern: screenshot diff between two states.
 *
 * @param {string} feature
 * @param {object} data
 * @param {string} data.url
 * @param {string} data.beforePath - Before screenshot
 * @param {string} data.afterPath - After screenshot
 * @param {number} data.diffPercent - Pixel difference percentage
 * @param {boolean} data.acceptable - Whether diff is within threshold
 * @param {string} [projectDir]
 */
export function addVisualDiffEvidence(feature, data, projectDir) {
  addEvidence(feature, {
    type: BROWSER_EVIDENCE_TYPES.VISUAL_DIFF,
    result: data.acceptable ? 'pass' : 'fail',
    source: 'mcp-playwright',
    details: {
      url: data.url,
      before: data.beforePath,
      after: data.afterPath,
      diffPercent: data.diffPercent,
      threshold: data.threshold || 5,
    },
  }, projectDir);

  log.info(`Visual diff: ${data.url} → ${data.diffPercent}% diff (${data.acceptable ? 'OK' : 'EXCEEDED'})`);
}

/**
 * Build a QA test plan for browser-based verification.
 * Returns structured test cases for agents to execute via MCP Playwright.
 *
 * @param {object} context
 * @param {string} context.feature
 * @param {string[]} context.routes - Routes/URLs to test
 * @param {string[]} context.interactions - Key interactions to verify
 * @returns {Array<{ name: string, steps: string[], evidenceType: string }>}
 */
export function buildBrowserTestPlan(context) {
  const tests = [];

  for (const route of (context.routes || [])) {
    // Page load test
    tests.push({
      name: `Page load: ${route}`,
      steps: [
        `Navigate to ${route}`,
        'Take screenshot',
        'Check console for errors',
        'Verify accessibility snapshot',
      ],
      evidenceType: BROWSER_EVIDENCE_TYPES.SCREENSHOT,
    });
  }

  for (const interaction of (context.interactions || [])) {
    tests.push({
      name: `Interaction: ${interaction}`,
      steps: [
        'Take before screenshot',
        `Execute: ${interaction}`,
        'Take after screenshot',
        'Compare visual diff',
        'Check console for errors',
      ],
      evidenceType: BROWSER_EVIDENCE_TYPES.VISUAL_DIFF,
    });
  }

  return tests;
}

/**
 * Format browser evidence summary for display.
 * @param {Array} entries - Evidence chain entries with browser types
 * @returns {string}
 */
export function formatBrowserEvidence(entries) {
  const browserEntries = entries.filter(e =>
    Object.values(BROWSER_EVIDENCE_TYPES).includes(e.type)
  );

  if (browserEntries.length === 0) return 'No browser evidence collected.';

  const lines = ['Browser Evidence:'];
  for (const entry of browserEntries) {
    const icon = entry.result === 'pass' ? '✓' : entry.result === 'fail' ? '✗' : '○';
    const url = entry.details?.url || 'unknown';
    lines.push(`  ${icon} [${entry.type}] ${url} — ${entry.result.toUpperCase()}`);
  }

  const passed = browserEntries.filter(e => e.result === 'pass').length;
  const total = browserEntries.length;
  lines.push(`  Total: ${passed}/${total} passed`);

  return lines.join('\n');
}
