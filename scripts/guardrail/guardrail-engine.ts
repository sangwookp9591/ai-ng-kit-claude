/**
 * aing Guardrail Engine v0.3.0
 * Declarative rule engine for constraining agent behavior.
 * Harness Engineering: Constrain axis — define boundaries.
 * @module scripts/guardrail/guardrail-engine
 */

import { getConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('guardrail');

interface GuardrailRule {
  id: string;
  type: 'bash' | 'file';
  pattern: RegExp;
  action: 'block' | 'warn';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

interface Violation {
  rule: GuardrailRule;
  match: string;
}

interface CheckResult {
  allowed: boolean;
  violations: Violation[];
}

/**
 * Default guardrail rules (active even without config)
 */
const DEFAULT_RULES: GuardrailRule[] = [
  // Dangerous bash commands
  {
    id: 'block-rm-rf',
    type: 'bash',
    pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive\s+--force|-[a-zA-Z]*f[a-zA-Z]*r)\s/,
    action: 'block',
    severity: 'critical',
    message: 'rm -rf 명령이 차단되었습니다. 파일 삭제는 개별적으로 수행하세요.'
  },
  {
    id: 'block-force-push',
    type: 'bash',
    pattern: /git\s+push\s+.*--force(?!\-with\-lease)/,
    action: 'block',
    severity: 'critical',
    message: 'git push --force가 차단되었습니다. --force-with-lease를 사용하세요.'
  },
  {
    id: 'block-reset-hard',
    type: 'bash',
    pattern: /git\s+reset\s+--hard/,
    action: 'block',
    severity: 'high',
    message: 'git reset --hard가 차단되었습니다. 변경사항을 먼저 확인하세요.'
  },
  {
    id: 'warn-drop-table',
    type: 'bash',
    pattern: /drop\s+(table|database|schema)/i,
    action: 'warn',
    severity: 'critical',
    message: 'DROP TABLE/DATABASE 명령이 감지되었습니다. 정말 실행하시겠습니까?'
  },
  // Protected file patterns
  {
    id: 'protect-env',
    type: 'file',
    pattern: /\.env($|\.local$|\.production$|\.staging$)/,
    action: 'warn',
    severity: 'high',
    message: '.env 파일 수정이 감지되었습니다. 민감 정보가 포함될 수 있습니다.'
  },
  {
    id: 'protect-lockfile',
    type: 'file',
    pattern: /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/,
    action: 'warn',
    severity: 'medium',
    message: '잠금 파일 직접 수정이 감지되었습니다. 패키지 매니저를 통해 수정하세요.'
  },
  {
    id: 'protect-ci',
    type: 'file',
    pattern: /\.(github|gitlab-ci|circleci)/,
    action: 'warn',
    severity: 'high',
    message: 'CI/CD 설정 수정이 감지되었습니다. 변경사항을 신중히 검토하세요.'
  }
];

/**
 * Load guardrail rules from config + defaults.
 */
export function loadRules(_projectDir?: string): GuardrailRule[] {
  const configRules = getConfig('guardrail.rules', []) as Array<{
    id: string;
    type: 'bash' | 'file';
    pattern: string | RegExp;
    action: 'block' | 'warn';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
  }>;

  // Parse user-defined pattern strings into RegExp
  const userRules: GuardrailRule[] = configRules.map(rule => ({
    ...rule,
    pattern: typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'i') : rule.pattern
  }));

  // Disabled rules from config
  const disabledIds = new Set<string>(getConfig('guardrail.disabled', []) as string[]);

  return [...DEFAULT_RULES, ...userRules].filter(r => !disabledIds.has(r.id));
}

/**
 * Check a bash command against guardrail rules.
 */
export function checkBashCommand(command: string, projectDir?: string): CheckResult {
  const rules = loadRules(projectDir).filter(r => r.type === 'bash');
  const violations: Violation[] = [];

  for (const rule of rules) {
    const match = command.match(rule.pattern);
    if (match) {
      violations.push({ rule, match: match[0] });
      log.warn(`Guardrail triggered: ${rule.id}`, { command: command.slice(0, 100), severity: rule.severity });
    }
  }

  const blocked = violations.some(v => v.rule.action === 'block');
  return { allowed: !blocked, violations };
}

/**
 * Check a file path against guardrail rules.
 */
export function checkFilePath(filePath: string, projectDir?: string): CheckResult {
  const rules = loadRules(projectDir).filter(r => r.type === 'file');
  const violations: Violation[] = [];

  for (const rule of rules) {
    if (rule.pattern.test(filePath)) {
      violations.push({ rule, match: filePath });
      log.warn(`Guardrail triggered: ${rule.id}`, { file: filePath, severity: rule.severity });
    }
  }

  const blocked = violations.some(v => v.rule.action === 'block');
  return { allowed: !blocked, violations };
}

/**
 * Format guardrail violation for display.
 */
export function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) return '';

  const lines: string[] = ['[aing Guardrail]'];
  for (const v of violations) {
    const icon = v.rule.action === 'block' ? '🚫' : '⚠️';
    const tag = v.rule.severity.toUpperCase();
    lines.push(`${icon} [${tag}] ${v.rule.message}`);
  }
  return lines.join('\n');
}
