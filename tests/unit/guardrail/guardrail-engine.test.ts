/**
 * Unit tests for scripts/guardrail/guardrail-engine.ts
 * Covers: checkBashCommand, checkFilePath, loadRules, formatViolations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../scripts/core/state.js', () => ({
  readState: vi.fn(() => ({ ok: false, error: 'not found' })),
  readStateOrDefault: vi.fn(() => ({})),
  writeState: vi.fn(),
}));

vi.mock('../../../scripts/core/config.js', () => ({
  loadConfig: vi.fn(() => ({})),
  getConfig: vi.fn((_path: string, fallback: unknown) => fallback),
  resetConfigCache: vi.fn(),
}));

vi.mock('../../../scripts/core/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../../../scripts/guardrail/denial-tracker.js', () => ({
  recordDenial: vi.fn(),
}));

import {
  checkBashCommand,
  checkFilePath,
  loadRules,
  formatViolations,
} from '../../../scripts/guardrail/guardrail-engine.js';
import { getConfig } from '../../../scripts/core/config.js';

const mockGetConfig = vi.mocked(getConfig);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no custom rules, no disabled rules
  mockGetConfig.mockImplementation((_path: string, fallback: unknown) => fallback);
});

// ---------------------------------------------------------------------------
// checkBashCommand — dangerous commands (block)
// ---------------------------------------------------------------------------
describe('checkBashCommand — dangerous commands', () => {
  it('warns on rm -rf (not block — Claude BashTool handles blocking)', () => {
    const result = checkBashCommand('rm -rf /');
    expect(result.allowed).toBe(true);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0].rule.id).toBe('warn-rm-rf');
  });

  it('warns on rm -fr (reversed flags)', () => {
    const result = checkBashCommand('rm -fr /tmp/data ');
    expect(result.allowed).toBe(true);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
  });

  it('warns on git push --force (not block)', () => {
    const result = checkBashCommand('git push --force origin main');
    expect(result.allowed).toBe(true);
    expect(result.violations.some(v => v.rule.id === 'warn-force-push')).toBe(true);
  });

  it('warns on git reset --hard (not block)', () => {
    const result = checkBashCommand('git reset --hard HEAD~5');
    expect(result.allowed).toBe(true);
    expect(result.violations.some(v => v.rule.id === 'warn-reset-hard')).toBe(true);
  });

  it('warns on DROP TABLE (not block)', () => {
    const result = checkBashCommand('psql -c "DROP TABLE users;"');
    // DROP TABLE is action=warn, not block
    expect(result.allowed).toBe(true);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0].rule.id).toBe('warn-drop-table');
  });

  it('warns on DROP DATABASE', () => {
    const result = checkBashCommand('DROP DATABASE production;');
    expect(result.allowed).toBe(true);
    expect(result.violations.some(v => v.rule.id === 'warn-drop-table')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkBashCommand — safe commands
// ---------------------------------------------------------------------------
describe('checkBashCommand — safe commands', () => {
  it('allows simple rm (no -rf)', () => {
    const result = checkBashCommand('rm file.txt');
    expect(result.allowed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('allows git push without --force', () => {
    const result = checkBashCommand('git push origin feature-branch');
    expect(result.allowed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('allows git push --force-with-lease', () => {
    const result = checkBashCommand('git push --force-with-lease origin main');
    expect(result.allowed).toBe(true);
  });

  it('allows git reset --soft', () => {
    const result = checkBashCommand('git reset --soft HEAD~1');
    expect(result.allowed).toBe(true);
  });

  it('allows npm test', () => {
    const result = checkBashCommand('npm test');
    expect(result.allowed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('allows SELECT queries', () => {
    const result = checkBashCommand('psql -c "SELECT * FROM users;"');
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkFilePath — protected files (action:'block' since v0.3.0)
// ---------------------------------------------------------------------------
describe('checkFilePath', () => {
  it('blocks .env file (action changed from warn to block)', () => {
    const result = checkFilePath('.env');
    expect(result.allowed).toBe(false); // block, not warn
    expect(result.violations.some(v => v.rule.id === 'protect-env')).toBe(true);
    expect(result.violations.find(v => v.rule.id === 'protect-env')?.rule.action).toBe('block');
  });

  it('blocks .env.local', () => {
    const result = checkFilePath('.env.local');
    expect(result.allowed).toBe(false);
    expect(result.violations.some(v => v.rule.id === 'protect-env')).toBe(true);
  });

  it('blocks .env.production', () => {
    const result = checkFilePath('.env.production');
    expect(result.allowed).toBe(false);
    expect(result.violations.some(v => v.rule.id === 'protect-env')).toBe(true);
  });

  it('blocks package-lock.json', () => {
    const result = checkFilePath('package-lock.json');
    expect(result.allowed).toBe(false);
    expect(result.violations.some(v => v.rule.id === 'protect-lockfile')).toBe(true);
  });

  it('blocks yarn.lock', () => {
    const result = checkFilePath('yarn.lock');
    expect(result.allowed).toBe(false);
    expect(result.violations.some(v => v.rule.id === 'protect-lockfile')).toBe(true);
  });

  it('blocks .github directory files', () => {
    const result = checkFilePath('.github/workflows/ci.yml');
    expect(result.allowed).toBe(false);
    expect(result.violations.some(v => v.rule.id === 'protect-ci')).toBe(true);
  });

  it('violation messages include [aing guardrail] tag', () => {
    const result = checkFilePath('.env');
    const envViolation = result.violations.find(v => v.rule.id === 'protect-env');
    expect(envViolation?.rule.message).toContain('[aing guardrail]');
  });

  it('allows normal source files', () => {
    const result = checkFilePath('src/index.ts');
    expect(result.allowed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('allows README.md', () => {
    const result = checkFilePath('README.md');
    expect(result.allowed).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// loadRules — custom rules and disabled rules
// ---------------------------------------------------------------------------
describe('loadRules', () => {
  it('returns default rules when no config', () => {
    const rules = loadRules();
    expect(rules.length).toBeGreaterThanOrEqual(7); // 7 default rules (4 bash-warn + 3 file-block)
  });

  it('file rules have action block by default', () => {
    const rules = loadRules();
    const fileRules = rules.filter(r => r.type === 'file');
    for (const r of fileRules) {
      expect(r.action).toBe('block');
    }
  });

  it('bash rules retain warn action', () => {
    const rules = loadRules();
    const bashRules = rules.filter(r => r.type === 'bash');
    for (const r of bashRules) {
      expect(r.action).toBe('warn');
    }
  });

  it('applies severityOverrides from config', () => {
    mockGetConfig.mockImplementation((path: string, fallback: unknown) => {
      if (path === 'guardrail.severityOverrides') return { medium: 'warn' };
      return fallback;
    });

    const rules = loadRules();
    // protect-lockfile has severity:'medium', should be overridden to 'warn'
    const lockfileRule = rules.find(r => r.id === 'protect-lockfile');
    expect(lockfileRule?.action).toBe('warn');
    // protect-env has severity:'high', should remain 'block'
    const envRule = rules.find(r => r.id === 'protect-env');
    expect(envRule?.action).toBe('block');
  });

  it('filters out disabled rules', () => {
    mockGetConfig.mockImplementation((path: string, fallback: unknown) => {
      if (path === 'guardrail.disabled') return ['warn-rm-rf'];
      return fallback;
    });

    const rules = loadRules();
    expect(rules.find(r => r.id === 'warn-rm-rf')).toBeUndefined();
    // Other rules still present
    expect(rules.find(r => r.id === 'warn-force-push')).toBeDefined();
  });

  it('includes user-defined rules from config', () => {
    mockGetConfig.mockImplementation((path: string, fallback: unknown) => {
      if (path === 'guardrail.rules') {
        return [{
          id: 'custom-no-sudo',
          type: 'bash',
          pattern: 'sudo\\s+',
          action: 'block',
          severity: 'high',
          message: 'sudo blocked',
        }];
      }
      return fallback;
    });

    const rules = loadRules();
    const customRule = rules.find(r => r.id === 'custom-no-sudo');
    expect(customRule).toBeDefined();
    expect(customRule!.pattern).toBeInstanceOf(RegExp);
  });
});

// ---------------------------------------------------------------------------
// formatViolations
// ---------------------------------------------------------------------------
describe('formatViolations', () => {
  it('returns empty string when no violations', () => {
    expect(formatViolations([])).toBe('');
  });

  it('formats block violations with header', () => {
    const violations = [{
      rule: {
        id: 'warn-rm-rf',
        type: 'bash' as const,
        pattern: /rm/,
        action: 'warn' as const,
        severity: 'critical' as const,
        message: 'rm -rf blocked',
      },
      match: 'rm -rf',
    }];

    const output = formatViolations(violations);
    expect(output).toContain('[aing Guardrail]');
    expect(output).toContain('CRITICAL');
    expect(output).toContain('rm -rf blocked');
  });

  it('formats warn violations differently from block', () => {
    const violations = [{
      rule: {
        id: 'warn-drop-table',
        type: 'bash' as const,
        pattern: /drop/,
        action: 'warn' as const,
        severity: 'critical' as const,
        message: 'DROP detected',
      },
      match: 'drop table',
    }];

    const output = formatViolations(violations);
    expect(output).toContain('[aing Guardrail]');
    expect(output).toContain('DROP detected');
  });
});
