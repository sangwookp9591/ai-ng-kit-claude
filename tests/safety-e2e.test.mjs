/**
 * aing Safety & CLI E2E Tests
 * Tests careful checklist, mutation guard, canary, config, diff-scope, analytics, doctor.
 *
 * Run: node --test tests/safety-e2e.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Careful Checklist', () => {
  it('should detect dangerous commands', async () => {
    const { checkCommand } = await import('../dist/scripts/guardrail/careful-checklist.js');

    assert.strictEqual(checkCommand('rm -rf /').safe, false);
    assert.strictEqual(checkCommand('git push --force').safe, false);
    assert.strictEqual(checkCommand('git reset --hard').safe, false);
    assert.strictEqual(checkCommand('DROP TABLE users').safe, false);
    assert.strictEqual(checkCommand('kubectl delete pod').safe, false);
  });

  it('should allow safe commands', async () => {
    const { checkCommand } = await import('../dist/scripts/guardrail/careful-checklist.js');

    assert.strictEqual(checkCommand('rm -rf node_modules').safe, true);
    assert.strictEqual(checkCommand('git push origin main').safe, true);
    assert.strictEqual(checkCommand('npm install').safe, true);
    assert.strictEqual(checkCommand('ls -la').safe, true);
    assert.strictEqual(checkCommand(null).safe, true);
    assert.strictEqual(checkCommand('').safe, true);
  });

  it('should format safety warnings', async () => {
    const { checkCommand, formatSafetyCheck } = await import('../dist/scripts/guardrail/careful-checklist.js');
    const result = checkCommand('rm -rf /important');
    const formatted = formatSafetyCheck(result);
    assert.ok(formatted.includes('SAFETY WARNING'));
    assert.ok(formatted.includes('CRITICAL'));
  });
});

describe('Mutation Guard', () => {
  it('should record and retrieve mutations', async () => {
    const { recordMutation, getRecentMutations, formatMutationAudit } = await import('../dist/scripts/guardrail/mutation-guard.js');
    const { mkdtempSync, rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const tmpDir = mkdtempSync(join(tmpdir(), 'mutation-test-'));
    try {
      recordMutation('src/auth.ts', 'edit', 'jay', tmpDir);
      recordMutation('src/api.ts', 'create', 'jay', tmpDir);

      const recent = getRecentMutations(10, tmpDir);
      assert.ok(recent.length >= 2);
      assert.strictEqual(recent[recent.length - 1].file, 'src/api.ts');

      const formatted = formatMutationAudit(recent);
      assert.ok(formatted.includes('Mutation Audit'));
      assert.ok(formatted.includes('src/auth.ts'));
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('Canary Monitor', () => {
  it('should export healthCheck and alert thresholds', async () => {
    const { healthCheck, ALERT_THRESHOLDS } = await import('../dist/scripts/ship/canary-monitor.js');

    assert.ok(typeof healthCheck === 'function');
    assert.ok(ALERT_THRESHOLDS.CRITICAL);
    assert.ok(ALERT_THRESHOLDS.HIGH);

    // Test with no URL
    const noUrl = healthCheck(null);
    assert.strictEqual(noUrl.healthy, false);
  });

  it('should format canary results', async () => {
    const { formatCanaryResult } = await import('../dist/scripts/ship/canary-monitor.js');

    const healthy = formatCanaryResult({
      passed: true,
      checks: [{ check: 1, healthy: true, statusCode: 200, responseTimeMs: 150 }],
      alerts: [],
    });
    assert.ok(healthy.includes('HEALTHY'));

    const alert = formatCanaryResult({
      passed: false,
      checks: [{ check: 1, healthy: false, statusCode: null, responseTimeMs: 5000 }],
      alerts: [{ type: 'CRITICAL', check: 1, message: 'Unreachable' }],
    });
    assert.ok(alert.includes('ALERT'));
    assert.ok(alert.includes('CRITICAL'));
  });
});

describe('Config Manager', () => {
  it('should set and get config values', async () => {
    const { setConfig, getConfig, listConfig } = await import('../dist/scripts/cli/aing-config.js');

    setConfig('test.key', 'value123', '/tmp');
    const value = getConfig('test.key', null, '/tmp');
    assert.strictEqual(value, 'value123');

    const missing = getConfig('nonexistent', 'default', '/tmp');
    assert.strictEqual(missing, 'default');

    const all = listConfig('/tmp');
    assert.ok(all.test?.key === 'value123');
  });
});

describe('Diff Scope', () => {
  it('should export detectScope and formatScope', async () => {
    const { detectScope, formatScope } = await import('../dist/scripts/cli/aing-diff-scope.js');
    assert.ok(typeof detectScope === 'function');
    assert.ok(typeof formatScope === 'function');

    const formatted = formatScope({ frontend: true, backend: true, tests: false, docs: false, config: false, prompts: false, files: ['a.tsx', 'b.ts'] });
    assert.ok(formatted.includes('frontend'));
    assert.ok(formatted.includes('backend'));
  });
});

describe('Analytics', () => {
  it('should generate analytics report', async () => {
    const { generateAnalyticsReport } = await import('../dist/scripts/cli/aing-analytics.js');
    // Will show no activity or existing telemetry data
    const report = generateAnalyticsReport('7d', '/tmp');
    assert.ok(typeof report === 'string');
  });
});

describe('Doctor', () => {
  it('should run health check', async () => {
    const { runHealthCheck, formatHealthCheck } = await import('../dist/scripts/cli/aing-doctor.js');
    const result = runHealthCheck();
    assert.ok(result.checks.length >= 5);
    assert.ok(result.checks.some(c => c.name === 'Node.js'));
    assert.ok(result.checks.some(c => c.name === 'Agents'));

    const formatted = formatHealthCheck(result);
    assert.ok(formatted.includes('aing Doctor'));
    assert.ok(formatted.includes('Node.js'));
  });
});
