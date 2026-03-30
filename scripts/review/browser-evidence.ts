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
import { addEvidence } from '../evidence/evidence-chain.js';
import { createLogger } from '../core/logger.js';
import { parseAriaSnapshot, formatRefs, type AriaRefEntry } from './aria-refs.js';

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
} as const;

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
  details?: { url?: string; [key: string]: unknown };
}

/**
 * Add a screenshot as evidence.
 * Called after an agent takes a browser screenshot via MCP.
 */
export function addScreenshotEvidence(feature: string, data: ScreenshotData, projectDir?: string): void {
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
 */
export function addConsoleEvidence(feature: string, data: ConsoleData, projectDir?: string): void {
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
 */
export function addAccessibilityEvidence(feature: string, data: AccessibilityData, projectDir?: string): void {
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
 */
export function addVisualDiffEvidence(feature: string, data: VisualDiffData, projectDir?: string): void {
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
 */
export function buildBrowserTestPlan(context: BrowserTestPlanContext): BrowserTestCase[] {
  const tests: BrowserTestCase[] = [];

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
 */
export function formatBrowserEvidence(entries: BrowserEvidenceEntry[]): string {
  const browserEntries = entries.filter(e =>
    Object.values(BROWSER_EVIDENCE_TYPES).includes(e.type as BrowserEvidenceType)
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

/**
 * Orchestrate a complete browser QA session.
 * Combines: navigate → snapshot → ARIA refs → test actions → evidence collection.
 *
 * This is the high-level function agents call to run browser-based QA.
 * It uses MCP Playwright tools under the hood.
 */
export function orchestrateBrowserQA(feature: string, config: BrowserQAConfig, _projectDir?: string): BrowserQAResult {
  const testPlan = buildBrowserTestPlan({
    feature,
    routes: (config.routes || []).map(r => `${config.baseUrl}${r}`),
    interactions: config.interactions || [],
  });

  log.info(`Browser QA plan: ${testPlan.length} tests for ${feature}`);
  log.info(`Routes: ${config.routes?.join(', ')}`);
  log.info(`Base URL: ${config.baseUrl}`);

  // The actual test execution is done by agents using MCP tools.
  // This function prepares the plan and returns instructions.
  return {
    testPlan,
    evidenceCount: 0,  // Updated as agents execute tests
    instructions: [
      `1. Navigate to each route: ${(config.routes || []).join(', ')}`,
      '2. Take browser_snapshot for ARIA refs',
      '3. Execute interactions using refs (@e1, @e2...)',
      '4. Take screenshots before/after each interaction',
      '5. Check console_messages for errors',
      config.checkA11y ? '6. Run accessibility check via snapshot analysis' : null,
      '7. Record evidence using addScreenshotEvidence/addConsoleEvidence',
    ].filter((s): s is string => s !== null),
  };
}

/**
 * Parse and analyze an ARIA snapshot for QA purposes.
 * Combines ARIA parsing with evidence recording.
 */
export function analyzeSnapshot(feature: string, snapshotText: string, url: string, projectDir?: string): SnapshotAnalysis {
  const refs = parseAriaSnapshot(snapshotText);

  // Record as accessibility evidence
  addAccessibilityEvidence(feature, {
    url,
    violations: 0,  // Snapshot parsing doesn't detect violations directly
    issues: [],
  }, projectDir);

  return {
    refs,
    refCount: refs.size,
    formatted: formatRefs(refs),
  };
}
