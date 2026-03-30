/**
 * aing QA Orchestrator — Complete QA Cycle Controller
 * Runs tests, calculates health score, manages fix loop.
 * Note: Uses execSync for test commands from package.json (not user input), safe from injection.
 *
 * @module scripts/qa/qa-orchestrator
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createLogger } from '../core/logger.js';
import { calculateHealthScore } from '../review/qa-health-score.js';
import { addEvidence } from '../evidence/evidence-chain.js';
import { writeState } from '../core/state.js';
import { join } from 'node:path';
import { logSkillUsage } from '../telemetry/telemetry-engine.js';

const log = createLogger('qa-orchestrator');

const MAX_FIX_CYCLES = 5;
const SAME_ERROR_THRESHOLD = 3;

export interface QAResult {
  healthScore: number;
  grade: string;
  cycles: number;
  findings: string[];
  allFixed: boolean;
  healthHistory?: HealthScoreEntry[];
}

export interface QAOptions {
  feature: string;
  testCommand?: string;
  fixMode?: boolean;
  projectDir?: string;
}

interface HealthScoreEntry {
  cycle: number;
  score: number;
  grade: string;
}

interface QAState {
  feature: string;
  startedAt: string;
  cycles: number;
  findings: string[];
  errorHistory: Record<string, number>;
  healthScores: HealthScoreEntry[];
}

interface TestRunResult {
  passed: boolean;
  passCount: number;
  totalCount: number;
  errors: string[];
  output: string;
}

interface HealthData {
  console: { errors: number };
  functional: {
    issues: Array<{ severity: string }>;
  };
}

/**
 * Run a complete QA cycle.
 */
export function runQACycle(options: QAOptions): QAResult {
  const {
    feature,
    testCommand = detectTestCommand(options.projectDir),
    fixMode = true,
    projectDir,
  } = options;

  const dir = projectDir || process.cwd();
  const startTime = Date.now();
  const statePath = join(dir, '.aing', 'state', 'qa-state.json');

  const qaState: QAState = {
    feature,
    startedAt: new Date().toISOString(),
    cycles: 0,
    findings: [],
    errorHistory: {},
    healthScores: [],
  };

  // Initial test run
  let testResult = runTests(testCommand, dir);
  let healthData = buildHealthData(testResult);
  let health = calculateHealthScore(healthData as unknown as Record<string, import('../review/qa-health-score.js').CategoryData>);

  qaState.healthScores.push({ cycle: 0, score: health.overall, grade: health.grade });
  log.info(`Initial health: ${health.overall}/100 (${health.grade})`);

  // Record initial evidence
  addEvidence(feature, {
    type: 'test',
    result: testResult.passed ? 'pass' : 'fail',
    source: 'qa-initial',
    details: { passed: testResult.passCount, total: testResult.totalCount, errors: testResult.errors.slice(0, 5) },
  }, dir);

  if (!fixMode || testResult.passed) {
    const durationS = Math.round((Date.now() - startTime) / 1000);
    logSkillUsage({ skill: 'qa-loop', duration_s: durationS, outcome: testResult.passed ? 'success' : 'error' }, dir);
    writeState(statePath, qaState);
    return {
      healthScore: health.overall,
      grade: health.grade,
      cycles: 0,
      findings: testResult.errors,
      allFixed: testResult.passed,
    };
  }

  // Fix loop
  for (let cycle = 1; cycle <= MAX_FIX_CYCLES; cycle++) {
    qaState.cycles = cycle;
    log.info(`Fix cycle ${cycle}/${MAX_FIX_CYCLES}`);

    // Check for repeated errors (same error 3x = give up on it)
    const currentErrors = testResult.errors.map(e => e.slice(0, 80));
    const skipErrors: string[] = [];
    for (const err of currentErrors) {
      qaState.errorHistory[err] = (qaState.errorHistory[err] || 0) + 1;
      if (qaState.errorHistory[err] >= SAME_ERROR_THRESHOLD) {
        skipErrors.push(err);
        log.warn(`Skipping repeated error (${SAME_ERROR_THRESHOLD}x): ${err.slice(0, 50)}`);
      }
    }

    // All remaining errors are repeated = stop
    const actionableErrors = currentErrors.filter(e => !skipErrors.includes(e));
    if (actionableErrors.length === 0) {
      log.info('All remaining errors are repeated. Stopping fix loop.');
      break;
    }

    // Record fix attempt evidence
    addEvidence(feature, {
      type: 'test',
      result: 'fail',
      source: `qa-cycle-${cycle}`,
      details: { errors: actionableErrors.slice(0, 3), skipped: skipErrors.length },
    }, dir);

    // Re-run tests after agent fixes
    testResult = runTests(testCommand, dir);
    healthData = buildHealthData(testResult);
    health = calculateHealthScore(healthData as unknown as Record<string, import('../review/qa-health-score.js').CategoryData>);
    qaState.healthScores.push({ cycle, score: health.overall, grade: health.grade });

    log.info(`Cycle ${cycle} health: ${health.overall}/100 (${health.grade})`);

    if (testResult.passed) {
      log.info(`All tests pass after ${cycle} fix cycles`);
      break;
    }
  }

  // Final evidence
  addEvidence(feature, {
    type: 'test',
    result: testResult.passed ? 'pass' : 'fail',
    source: 'qa-final',
    details: { passed: testResult.passCount, total: testResult.totalCount, cycles: qaState.cycles },
  }, dir);

  const durationS = Math.round((Date.now() - startTime) / 1000);
  logSkillUsage({ skill: 'qa-loop', duration_s: durationS, outcome: testResult.passed ? 'success' : 'error' }, dir);
  writeState(statePath, qaState);

  return {
    healthScore: health.overall,
    grade: health.grade,
    cycles: qaState.cycles,
    findings: testResult.errors,
    allFixed: testResult.passed,
    healthHistory: qaState.healthScores,
  };
}

/**
 * Format QA result for display.
 */
export function formatQAResult(result: QAResult): string {
  const lines: string[] = [
    `QA Result: ${result.grade} (${result.healthScore}/100)`,
    `Cycles: ${result.cycles}`,
    `Status: ${result.allFixed ? 'ALL FIXED' : `${result.findings.length} remaining issues`}`,
  ];

  if (result.healthHistory) {
    lines.push('', 'Health Score Trend:');
    for (const h of result.healthHistory) {
      const bar = '\u2588'.repeat(Math.round(h.score / 10));
      lines.push(`  Cycle ${h.cycle}: ${bar} ${h.score}/100 (${h.grade})`);
    }
  }

  if (result.findings.length > 0 && !result.allFixed) {
    lines.push('', 'Remaining Issues:');
    for (const f of result.findings.slice(0, 5)) {
      lines.push(`  \u2717 ${f}`);
    }
  }

  return lines.join('\n');
}

// -- Internal --
// Note: execSync is used intentionally here to run user-configured test commands.
// The test command comes from package.json scripts or a hardcoded default, not user input.

function detectTestCommand(projectDir?: string): string {
  const dir = projectDir || process.cwd();
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
    if (pkg.scripts?.test) return 'npm test';
  } catch {}
  return 'node --test tests/*.test.mjs';
}

function runTests(cmd: string, dir: string): TestRunResult {
  try {
    const output = execSync(cmd, { cwd: dir, encoding: 'utf-8', timeout: 120000 });
    const passMatch = output.match(/pass\s+(\d+)/i);
    const failMatch = output.match(/fail\s+(\d+)/i);
    const totalMatch = output.match(/tests?\s+(\d+)/i);

    return {
      passed: !failMatch || parseInt(failMatch[1]) === 0,
      passCount: passMatch ? parseInt(passMatch[1]) : 0,
      totalCount: totalMatch ? parseInt(totalMatch[1]) : 0,
      errors: [],
      output: output.slice(-500),
    };
  } catch (err: unknown) {
    const stdout = (err as { stdout?: string }).stdout || '';
    const stderr = (err as { stderr?: string }).stderr || '';
    const output = stdout + stderr;
    const errors = output.split('\n')
      .filter((l: string) => l.match(/\u2716|FAIL|Error|\u2717/i))
      .map((l: string) => l.trim())
      .filter(Boolean)
      .slice(0, 10);

    return {
      passed: false,
      passCount: 0,
      totalCount: 0,
      errors,
      output: output.slice(-500),
    };
  }
}

function buildHealthData(testResult: TestRunResult): HealthData {
  return {
    console: { errors: testResult.errors.length },
    functional: {
      issues: testResult.errors.map(e => ({
        severity: e.toLowerCase().includes('critical') ? 'CRITICAL' : 'HIGH',
      })),
    },
  };
}
