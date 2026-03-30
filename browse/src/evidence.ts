/**
 * Browse Evidence Collector — Screenshot and snapshot evidence for review pipelines.
 *
 * Captures before/after state, generates comparison reports, and saves
 * artifacts to .aing/browse-evidence/ for traceability.
 *
 * Zero external deps — uses Node.js built-in only.
 * @module browse/src/evidence
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowseWrapper, Result, RefEntry } from './browse-wrapper.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvidenceCapture {
  id: string;
  timestamp: number;
  url: string;
  title: string;
  screenshotPath: string;
  snapshotTree: string;
  refs: RefEntry[];
  consoleErrors: string[];
  metadata: Record<string, string>;
}

export interface EvidenceComparison {
  before: EvidenceCapture;
  after: EvidenceCapture;
  diff: SnapshotDiff;
  summary: string;
}

export interface SnapshotDiff {
  added: string[];
  removed: string[];
  unchanged: number;
  totalBefore: number;
  totalAfter: number;
}

export interface EvidenceReport {
  title: string;
  captures: EvidenceCapture[];
  comparisons: EvidenceComparison[];
  verdict: 'pass' | 'fail' | 'warning';
  notes: string[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// EvidenceCollector
// ---------------------------------------------------------------------------

export class EvidenceCollector {
  private readonly evidenceDir: string;
  private readonly sessionId: string;
  private captures: EvidenceCapture[] = [];
  private comparisons: EvidenceComparison[] = [];
  private notes: string[] = [];

  constructor(projectRoot: string, sessionId?: string) {
    this.sessionId = sessionId ?? `ev-${Date.now()}`;
    this.evidenceDir = join(projectRoot, '.aing', 'browse-evidence', this.sessionId);
    mkdirSync(this.evidenceDir, { recursive: true });
  }

  /** Get the evidence directory path */
  getEvidenceDir(): string {
    return this.evidenceDir;
  }

  /** Get current session ID */
  getSessionId(): string {
    return this.sessionId;
  }

  // -------------------------------------------------------------------------
  // Capture
  // -------------------------------------------------------------------------

  /**
   * Capture current browser state as evidence.
   * Takes screenshot + snapshot + console errors.
   */
  async capture(
    browse: BrowseWrapper,
    label: string,
    metadata?: Record<string, string>,
  ): Promise<Result<EvidenceCapture>> {
    const captureId = `${label}-${Date.now()}`;
    const screenshotPath = join(this.evidenceDir, `${captureId}.png`);

    // Take screenshot
    const screenshotResult = await browse.screenshot(screenshotPath);
    if (!screenshotResult.ok) {
      return screenshotResult;
    }

    // Take snapshot with interactive elements
    const snapshotResult = await browse.snapshot({ interactive: true });
    if (!snapshotResult.ok) {
      return snapshotResult;
    }

    // Get console errors
    const consoleResult = await browse.console(true);
    const consoleErrors: string[] = [];
    if (consoleResult.ok) {
      for (const entry of consoleResult.data) {
        consoleErrors.push(`[${entry.level}] ${entry.message}`);
      }
    }

    // Get URL
    const urlResult = await browse.url();
    const currentUrl = urlResult.ok ? urlResult.data : '';

    const pageState = browse.getPageState();

    const capture: EvidenceCapture = {
      id: captureId,
      timestamp: Date.now(),
      url: currentUrl,
      title: pageState.title,
      screenshotPath: screenshotResult.data,
      snapshotTree: snapshotResult.data.tree,
      refs: snapshotResult.data.refs,
      consoleErrors,
      metadata: metadata ?? {},
    };

    this.captures.push(capture);

    // Save capture metadata
    const metaPath = join(this.evidenceDir, `${captureId}.json`);
    writeFileSync(metaPath, JSON.stringify(capture, null, 2), 'utf-8');

    return { ok: true, data: capture };
  }

  // -------------------------------------------------------------------------
  // Comparison
  // -------------------------------------------------------------------------

  /**
   * Compare two captures (before/after).
   * Produces a diff of the snapshot trees and a human-readable summary.
   */
  compare(beforeId: string, afterId: string): Result<EvidenceComparison> {
    const before = this.captures.find((c) => c.id === beforeId);
    const after = this.captures.find((c) => c.id === afterId);

    if (!before) {
      return { ok: false, error: `Capture not found: ${beforeId}` };
    }
    if (!after) {
      return { ok: false, error: `Capture not found: ${afterId}` };
    }

    const diff = diffSnapshots(before.snapshotTree, after.snapshotTree);
    const summary = buildComparisonSummary(before, after, diff);

    const comparison: EvidenceComparison = {
      before,
      after,
      diff,
      summary,
    };

    this.comparisons.push(comparison);

    // Save comparison
    const compPath = join(this.evidenceDir, `compare-${beforeId}-vs-${afterId}.json`);
    writeFileSync(compPath, JSON.stringify(comparison, null, 2), 'utf-8');

    return { ok: true, data: comparison };
  }

  /**
   * Capture before state, run an action, capture after state, and compare.
   * Returns the comparison result.
   */
  async captureBeforeAfter(
    browse: BrowseWrapper,
    label: string,
    action: () => Promise<void>,
  ): Promise<Result<EvidenceComparison>> {
    // Before
    const beforeResult = await this.capture(browse, `${label}-before`);
    if (!beforeResult.ok) return beforeResult;

    // Run action
    try {
      await action();
    } catch (err) {
      return { ok: false, error: `Action failed: ${(err as Error).message}` };
    }

    // Small delay for page to settle
    await new Promise((r) => setTimeout(r, 500));

    // After
    const afterResult = await this.capture(browse, `${label}-after`);
    if (!afterResult.ok) return afterResult;

    return this.compare(beforeResult.data.id, afterResult.data.id);
  }

  // -------------------------------------------------------------------------
  // Notes & Report
  // -------------------------------------------------------------------------

  addNote(note: string): void {
    this.notes.push(note);
  }

  /** Generate a final evidence report */
  generateReport(title: string, verdict: 'pass' | 'fail' | 'warning'): EvidenceReport {
    const report: EvidenceReport = {
      title,
      captures: this.captures,
      comparisons: this.comparisons,
      verdict,
      notes: this.notes,
      createdAt: new Date().toISOString(),
    };

    // Save report
    const reportPath = join(this.evidenceDir, 'report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    // Save human-readable summary
    const summaryPath = join(this.evidenceDir, 'report.txt');
    writeFileSync(summaryPath, formatReportText(report), 'utf-8');

    return report;
  }

  /** List all captures in this session */
  listCaptures(): EvidenceCapture[] {
    return [...this.captures];
  }

  /** List all evidence sessions in project */
  static listSessions(projectRoot: string): string[] {
    const dir = join(projectRoot, '.aing', 'browse-evidence');
    if (!existsSync(dir)) return [];
    try {
      return readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
    } catch {
      return [];
    }
  }

  /** Load an existing report from a session */
  static loadReport(projectRoot: string, sessionId: string): Result<EvidenceReport> {
    const reportPath = join(projectRoot, '.aing', 'browse-evidence', sessionId, 'report.json');
    if (!existsSync(reportPath)) {
      return { ok: false, error: `Report not found: ${reportPath}` };
    }
    try {
      const raw = readFileSync(reportPath, 'utf-8');
      return { ok: true, data: JSON.parse(raw) as EvidenceReport };
    } catch (err) {
      return { ok: false, error: `Failed to load report: ${(err as Error).message}` };
    }
  }
}

// ---------------------------------------------------------------------------
// Diff Logic
// ---------------------------------------------------------------------------

/** Line-by-line diff of two snapshot trees */
export function diffSnapshots(before: string, after: string): SnapshotDiff {
  const beforeLines = before.split('\n').map((l) => l.trim()).filter(Boolean);
  const afterLines = after.split('\n').map((l) => l.trim()).filter(Boolean);

  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);

  const added: string[] = [];
  const removed: string[] = [];
  let unchanged = 0;

  for (const line of afterLines) {
    if (beforeSet.has(line)) {
      unchanged++;
    } else {
      added.push(line);
    }
  }

  for (const line of beforeLines) {
    if (!afterSet.has(line)) {
      removed.push(line);
    }
  }

  return {
    added,
    removed,
    unchanged,
    totalBefore: beforeLines.length,
    totalAfter: afterLines.length,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function buildComparisonSummary(
  before: EvidenceCapture,
  after: EvidenceCapture,
  diff: SnapshotDiff,
): string {
  const lines: string[] = [];

  lines.push(`Before: ${before.url} (${new Date(before.timestamp).toISOString()})`);
  lines.push(`After:  ${after.url} (${new Date(after.timestamp).toISOString()})`);
  lines.push('');

  if (diff.added.length === 0 && diff.removed.length === 0) {
    lines.push('No changes detected in accessibility tree.');
  } else {
    if (diff.added.length > 0) {
      lines.push(`Added (${diff.added.length}):`);
      for (const line of diff.added.slice(0, 20)) {
        lines.push(`  + ${line}`);
      }
      if (diff.added.length > 20) {
        lines.push(`  ... and ${diff.added.length - 20} more`);
      }
    }

    if (diff.removed.length > 0) {
      lines.push(`Removed (${diff.removed.length}):`);
      for (const line of diff.removed.slice(0, 20)) {
        lines.push(`  - ${line}`);
      }
      if (diff.removed.length > 20) {
        lines.push(`  ... and ${diff.removed.length - 20} more`);
      }
    }

    lines.push(`Unchanged: ${diff.unchanged} lines`);
  }

  // Console error delta
  const newErrors = after.consoleErrors.filter(
    (e) => !before.consoleErrors.includes(e),
  );
  if (newErrors.length > 0) {
    lines.push('');
    lines.push(`New console errors (${newErrors.length}):`);
    for (const err of newErrors) {
      lines.push(`  ! ${err}`);
    }
  }

  return lines.join('\n');
}

function formatReportText(report: EvidenceReport): string {
  const lines: string[] = [];
  const divider = '='.repeat(60);

  lines.push(divider);
  lines.push(`Browse Evidence Report: ${report.title}`);
  lines.push(`Verdict: ${report.verdict.toUpperCase()}`);
  lines.push(`Created: ${report.createdAt}`);
  lines.push(divider);
  lines.push('');

  if (report.captures.length > 0) {
    lines.push(`Captures (${report.captures.length}):`);
    for (const cap of report.captures) {
      lines.push(`  [${cap.id}] ${cap.url}`);
      lines.push(`    Screenshot: ${cap.screenshotPath}`);
      lines.push(`    Refs: ${cap.refs.length} elements`);
      if (cap.consoleErrors.length > 0) {
        lines.push(`    Console errors: ${cap.consoleErrors.length}`);
      }
    }
    lines.push('');
  }

  if (report.comparisons.length > 0) {
    lines.push(`Comparisons (${report.comparisons.length}):`);
    for (const comp of report.comparisons) {
      lines.push('-'.repeat(40));
      lines.push(comp.summary);
    }
    lines.push('');
  }

  if (report.notes.length > 0) {
    lines.push('Notes:');
    for (const note of report.notes) {
      lines.push(`  * ${note}`);
    }
  }

  lines.push(divider);
  return lines.join('\n');
}
