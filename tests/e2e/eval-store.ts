/**
 * Eval Store — persist, load, compare, and report evaluation results.
 *
 * Results are stored as JSON files under ~/.aing/evals/.
 * File naming: {timestamp}-{testName}.json
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ── Public types ──────────────────────────────────────────────────────────

export interface EvalResult {
  testName: string;
  timestamp: string;
  duration: number;
  passed: boolean;
  score?: number;
  details: Record<string, unknown>;
}

export interface EvalComparison {
  improved: string[];
  regressed: string[];
  unchanged: string[];
  newTests: string[];
}

// ── Internal helpers ──────────────────────────────────────────────────────

const EVALS_DIR = join(homedir(), '.aing', 'evals');

function ensureDir(): void {
  if (!existsSync(EVALS_DIR)) {
    mkdirSync(EVALS_DIR, { recursive: true });
  }
}

/** Turn an ISO timestamp into a filesystem-safe prefix: 20260330T143012Z */
function toFilePrefix(iso: string): string {
  return iso.replace(/[:\-]/g, '').replace(/\.\d+Z$/, 'Z');
}

/** Sanitise test name for use in filenames. */
function sanitise(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function readEvalFile(path: string): EvalResult | null {
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as EvalResult;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Persist an {@link EvalResult} to disk.
 * @returns The absolute path of the saved file.
 */
export function saveEval(result: EvalResult): string {
  ensureDir();
  const prefix = toFilePrefix(result.timestamp);
  const name = sanitise(result.testName);
  const filename = `${prefix}-${name}.json`;
  const filePath = join(EVALS_DIR, filename);
  writeFileSync(filePath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  return filePath;
}

/**
 * Load the most recent eval result for a given test name.
 * Returns `null` when no prior result exists.
 */
export function loadLatestEval(testName: string): EvalResult | null {
  ensureDir();
  const sanitised = sanitise(testName);

  const files = readdirSync(EVALS_DIR)
    .filter((f) => f.endsWith('.json') && f.includes(sanitised))
    .sort()
    .reverse();

  if (files.length === 0) return null;
  return readEvalFile(join(EVALS_DIR, files[0]));
}

/**
 * List stored eval results, newest first.
 * @param limit Maximum number of results to return (default 50).
 */
export function listEvals(limit = 50): EvalResult[] {
  ensureDir();
  const files = readdirSync(EVALS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit);

  const results: EvalResult[] = [];
  for (const f of files) {
    const r = readEvalFile(join(EVALS_DIR, f));
    if (r) results.push(r);
  }
  return results;
}

/**
 * Compare two sets of eval results (baseline vs current).
 *
 * Classification logic:
 *   - **improved**: failed -> passed, or score increased by >= 0.5
 *   - **regressed**: passed -> failed, or score decreased by >= 0.5
 *   - **unchanged**: no meaningful change
 *   - **newTests**: present in current but not in baseline
 */
export function compareEvals(
  baseline: EvalResult[],
  current: EvalResult[],
): EvalComparison {
  const baseMap = new Map<string, EvalResult>();
  for (const b of baseline) baseMap.set(b.testName, b);

  const improved: string[] = [];
  const regressed: string[] = [];
  const unchanged: string[] = [];
  const newTests: string[] = [];

  for (const cur of current) {
    const base = baseMap.get(cur.testName);

    if (!base) {
      newTests.push(cur.testName);
      continue;
    }

    // Pass/fail transition.
    if (!base.passed && cur.passed) {
      improved.push(cur.testName);
      continue;
    }
    if (base.passed && !cur.passed) {
      regressed.push(cur.testName);
      continue;
    }

    // Score-based comparison (when both have scores).
    const bs = base.score ?? (base.passed ? 10 : 0);
    const cs = cur.score ?? (cur.passed ? 10 : 0);
    const delta = cs - bs;

    if (delta >= 0.5) {
      improved.push(cur.testName);
    } else if (delta <= -0.5) {
      regressed.push(cur.testName);
    } else {
      unchanged.push(cur.testName);
    }
  }

  return { improved, regressed, unchanged, newTests };
}

/**
 * Generate a human-readable summary string from an {@link EvalComparison}.
 */
export function formatComparison(cmp: EvalComparison): string {
  const lines: string[] = ['=== Eval Comparison ==='];

  if (cmp.improved.length > 0) {
    lines.push(`\n[Improved] (${cmp.improved.length})`);
    for (const t of cmp.improved) lines.push(`  + ${t}`);
  }
  if (cmp.regressed.length > 0) {
    lines.push(`\n[Regressed] (${cmp.regressed.length})`);
    for (const t of cmp.regressed) lines.push(`  - ${t}`);
  }
  if (cmp.unchanged.length > 0) {
    lines.push(`\n[Unchanged] (${cmp.unchanged.length})`);
    for (const t of cmp.unchanged) lines.push(`  = ${t}`);
  }
  if (cmp.newTests.length > 0) {
    lines.push(`\n[New] (${cmp.newTests.length})`);
    for (const t of cmp.newTests) lines.push(`  * ${t}`);
  }

  const total =
    cmp.improved.length + cmp.regressed.length + cmp.unchanged.length + cmp.newTests.length;
  lines.push(`\nTotal: ${total} tests compared`);

  return lines.join('\n');
}
