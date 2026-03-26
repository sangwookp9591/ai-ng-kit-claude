/**
 * TDD: cost-reporter.mjs tests
 * 비용/토큰 투명성 보고 기능 검증.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeState } from '../scripts/core/state.mjs';

const TEST_DIR = join(tmpdir(), `aing-cost-reporter-test-${Date.now()}`);
const COST_PATH = join(TEST_DIR, '.aing', 'state', 'cost-tracker.json');
const TRACE_PATH = join(TEST_DIR, '.aing', 'state', 'agent-traces.json');

function makeCostTracker(overrides = {}) {
  return {
    sessionStart: new Date().toISOString(),
    tokensUsed: 0,
    taskTokens: {},
    apiCalls: 0,
    warnings: [],
    ...overrides
  };
}

function makeTraceData(overrides = {}) {
  return {
    events: [],
    summary: {},
    ...overrides
  };
}

describe('cost-reporter: generateCostReport', () => {
  before(() => {
    mkdirSync(join(TEST_DIR, '.aing', 'state'), { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns report object with required shape', async () => {
    const { generateCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData());

    const report = generateCostReport(TEST_DIR);

    assert.ok('timestamp' in report, 'report should have timestamp');
    assert.ok('agents' in report, 'report should have agents');
    assert.ok('totals' in report, 'report should have totals');
    assert.ok('costTracker' in report, 'report should have costTracker');
  });

  it('totals has required fields', async () => {
    const { generateCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData());

    const report = generateCostReport(TEST_DIR);

    assert.ok('actions' in report.totals, 'totals should have actions');
    assert.ok('estimatedTokens' in report.totals, 'totals should have estimatedTokens');
    assert.ok('estimatedCostUSD' in report.totals, 'totals should have estimatedCostUSD');
  });

  it('aggregates agent actions from trace summary', async () => {
    const { generateCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData({
      summary: {
        Jay: { actions: 5, reads: 2, writes: 3, errors: 0 },
        Sam: { actions: 3, reads: 1, writes: 2, errors: 0 }
      }
    }));

    const report = generateCostReport(TEST_DIR);

    assert.ok('Jay' in report.agents, 'Jay should be in agents');
    assert.ok('Sam' in report.agents, 'Sam should be in agents');
    assert.equal(report.agents.Jay.actions, 5);
    assert.equal(report.agents.Sam.actions, 3);
  });

  it('totals.actions is sum of all agent actions', async () => {
    const { generateCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData({
      summary: {
        Jay: { actions: 4, reads: 1, writes: 3, errors: 0 },
        Jerry: { actions: 6, reads: 3, writes: 3, errors: 0 }
      }
    }));

    const report = generateCostReport(TEST_DIR);

    assert.equal(report.totals.actions, 10);
  });

  it('estimatedTokens is actions * 2000 per agent', async () => {
    const { generateCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData({
      summary: {
        Jay: { actions: 3, reads: 0, writes: 3, errors: 0 }
      }
    }));

    const report = generateCostReport(TEST_DIR);

    assert.equal(report.agents.Jay.estimatedTokens, 6000);
    assert.equal(report.totals.estimatedTokens, 6000);
  });

  it('estimatedCostUSD is non-negative number', async () => {
    const { generateCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker({ tokensUsed: 50000, apiCalls: 10 }));
    writeState(TRACE_PATH, makeTraceData({
      summary: {
        Sam: { actions: 10, reads: 5, writes: 5, errors: 0 }
      }
    }));

    const report = generateCostReport(TEST_DIR);

    assert.ok(typeof report.totals.estimatedCostUSD === 'number');
    assert.ok(report.totals.estimatedCostUSD >= 0);
  });

  it('works with empty trace (no agents)', async () => {
    const { generateCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData());

    const report = generateCostReport(TEST_DIR);

    assert.deepEqual(report.agents, {});
    assert.equal(report.totals.actions, 0);
    assert.equal(report.totals.estimatedTokens, 0);
    assert.equal(report.totals.estimatedCostUSD, 0);
  });

  it('works when state files do not exist (graceful fallback)', async () => {
    const { generateCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    const emptyDir = join(tmpdir(), `aing-cost-empty-${Date.now()}`);

    const report = generateCostReport(emptyDir);

    assert.ok(report, 'should return report even with missing files');
    assert.equal(report.totals.actions, 0);
  });

  it('costTracker reflects data from cost-tracker.json', async () => {
    const { generateCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    const trackerData = makeCostTracker({ tokensUsed: 12345, apiCalls: 7 });
    writeState(COST_PATH, trackerData);
    writeState(TRACE_PATH, makeTraceData());

    const report = generateCostReport(TEST_DIR);

    assert.equal(report.costTracker.tokensUsed, 12345);
    assert.equal(report.costTracker.apiCalls, 7);
  });
});

describe('cost-reporter: formatCostReport', () => {
  before(() => {
    mkdirSync(join(TEST_DIR, '.aing', 'state'), { recursive: true });
  });

  it('returns a non-empty string', async () => {
    const { generateCostReport, formatCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData());

    const report = generateCostReport(TEST_DIR);
    const formatted = formatCostReport(report);

    assert.ok(typeof formatted === 'string');
    assert.ok(formatted.length > 0);
  });

  it('contains aing Cost Report header', async () => {
    const { generateCostReport, formatCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData());

    const report = generateCostReport(TEST_DIR);
    const formatted = formatCostReport(report);

    assert.ok(formatted.includes('aing Cost Report'), 'should contain header');
  });

  it('shows agent names when agents are present', async () => {
    const { generateCostReport, formatCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData({
      summary: {
        Jay: { actions: 5, reads: 2, writes: 3, errors: 0 }
      }
    }));

    const report = generateCostReport(TEST_DIR);
    const formatted = formatCostReport(report);

    assert.ok(formatted.includes('Jay'), 'should mention Jay agent');
    assert.ok(formatted.includes('5'), 'should mention action count');
  });

  it('shows Totals section with actions and cost', async () => {
    const { generateCostReport, formatCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData({
      summary: {
        Sam: { actions: 2, reads: 1, writes: 1, errors: 0 }
      }
    }));

    const report = generateCostReport(TEST_DIR);
    const formatted = formatCostReport(report);

    assert.ok(formatted.includes('Totals'), 'should have Totals section');
    assert.ok(formatted.includes('Actions'), 'should show Actions');
    assert.ok(formatted.includes('Est. Cost'), 'should show estimated cost');
  });

  it('contains disclaimer that cost is estimated', async () => {
    const { generateCostReport, formatCostReport } = await import('../scripts/evidence/cost-reporter.mjs');
    writeState(COST_PATH, makeCostTracker());
    writeState(TRACE_PATH, makeTraceData());

    const report = generateCostReport(TEST_DIR);
    const formatted = formatCostReport(report);

    const lower = formatted.toLowerCase();
    assert.ok(
      lower.includes('est') || lower.includes('추정') || lower.includes('approx'),
      'should indicate cost is estimated'
    );
  });
});
