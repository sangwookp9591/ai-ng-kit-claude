/**
 * aing Guardrail Engine v0.3.0
 * Declarative rule engine for constraining agent behavior.
 * Harness Engineering: Constrain axis — define boundaries.
 * @module scripts/guardrail/guardrail-engine
 */
import { getConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
import { recordDenial } from './denial-tracker.js';
const log = createLogger('guardrail');
/**
 * Default guardrail rules (active even without config)
 */
const DEFAULT_RULES = [
    // Dangerous bash commands
    // Note: Claude Code's BashTool already blocks these via Tree-sitter AST analysis.
    // aing adds warn-level context only, to avoid double-blocking with Claude's built-in checks.
    {
        id: 'warn-rm-rf',
        type: 'bash',
        pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive\s+--force|-[a-zA-Z]*f[a-zA-Z]*r)\s/,
        action: 'warn',
        severity: 'critical',
        message: 'rm -rf 명령이 감지되었습니다. 파일 삭제는 개별적으로 수행하세요.'
    },
    {
        id: 'warn-force-push',
        type: 'bash',
        pattern: /git\s+push\s+.*--force(?!\-with\-lease)/,
        action: 'warn',
        severity: 'critical',
        message: 'git push --force가 감지되었습니다. --force-with-lease를 사용하세요.'
    },
    {
        id: 'warn-reset-hard',
        type: 'bash',
        pattern: /git\s+reset\s+--hard/,
        action: 'warn',
        severity: 'high',
        message: 'git reset --hard가 감지되었습니다. 변경사항을 먼저 확인하세요.'
    },
    {
        id: 'warn-drop-table',
        type: 'bash',
        pattern: /drop\s+(table|database|schema)/i,
        action: 'warn',
        severity: 'critical',
        message: 'DROP TABLE/DATABASE 명령이 감지되었습니다. 정말 실행하시겠습니까?'
    },
    // Protected file patterns — action:'block' to prevent accidental writes
    // Note: bash-type rules remain 'warn' to avoid double-blocking with Claude's built-in AST checks.
    {
        id: 'protect-env',
        type: 'file',
        pattern: /\.env($|\.local$|\.production$|\.staging$)/,
        action: 'block',
        severity: 'high',
        message: '[aing guardrail] .env 파일 수정이 차단되었습니다. 민감 정보가 포함될 수 있습니다.'
    },
    {
        id: 'protect-lockfile',
        type: 'file',
        pattern: /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/,
        action: 'block',
        severity: 'medium',
        message: '[aing guardrail] 잠금 파일 직접 수정이 차단되었습니다. 패키지 매니저를 통해 수정하세요.'
    },
    {
        id: 'protect-ci',
        type: 'file',
        pattern: /\.(github|gitlab-ci|circleci)/,
        action: 'block',
        severity: 'high',
        message: '[aing guardrail] CI/CD 설정 수정이 차단되었습니다. 변경사항을 신중히 검토하세요.'
    }
];
/**
 * Load guardrail rules from config + defaults.
 * Supports severity-level action overrides via `guardrail.severityOverrides`.
 * Example config: { "guardrail": { "severityOverrides": { "medium": "warn" } } }
 */
export function loadRules(_projectDir) {
    const configRules = getConfig('guardrail.rules', []);
    // Parse user-defined pattern strings into RegExp
    const userRules = configRules.map(rule => ({
        ...rule,
        pattern: typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'i') : rule.pattern
    }));
    // Disabled rules from config
    const disabledIds = new Set(getConfig('guardrail.disabled', []));
    // Severity-level action overrides: { "high": "warn", "medium": "block" }
    const severityOverrides = getConfig('guardrail.severityOverrides', {});
    const allRules = [...DEFAULT_RULES, ...userRules].filter(r => !disabledIds.has(r.id));
    if (Object.keys(severityOverrides).length === 0)
        return allRules;
    return allRules.map(r => {
        const override = severityOverrides[r.severity];
        return override ? { ...r, action: override } : r;
    });
}
/**
 * Check a bash command against guardrail rules.
 */
export function checkBashCommand(command, projectDir) {
    const rules = loadRules(projectDir).filter(r => r.type === 'bash');
    const violations = [];
    for (const rule of rules) {
        const match = command.match(rule.pattern);
        if (match) {
            violations.push({ rule, match: match[0] });
            log.warn(`Guardrail triggered: ${rule.id}`, { command: command.slice(0, 100), severity: rule.severity });
            recordDenial({
                timestamp: new Date().toISOString(),
                toolName: 'Bash',
                ruleId: rule.id,
                action: rule.action,
                severity: rule.severity,
                message: rule.message,
                input: command.slice(0, 200),
            }, projectDir);
        }
    }
    const blocked = violations.some(v => v.rule.action === 'block');
    return { allowed: !blocked, violations };
}
/**
 * Check a file path against guardrail rules.
 */
export function checkFilePath(filePath, projectDir) {
    const rules = loadRules(projectDir).filter(r => r.type === 'file');
    const violations = [];
    for (const rule of rules) {
        if (rule.pattern.test(filePath)) {
            violations.push({ rule, match: filePath });
            log.warn(`Guardrail triggered: ${rule.id}`, { file: filePath, severity: rule.severity });
            recordDenial({
                timestamp: new Date().toISOString(),
                toolName: 'Write/Edit',
                ruleId: rule.id,
                action: rule.action,
                severity: rule.severity,
                message: rule.message,
                input: filePath,
            }, projectDir);
        }
    }
    const blocked = violations.some(v => v.rule.action === 'block');
    return { allowed: !blocked, violations };
}
/**
 * Format guardrail violation for display.
 */
export function formatViolations(violations) {
    if (violations.length === 0)
        return '';
    const lines = ['[aing Guardrail]'];
    for (const v of violations) {
        const icon = v.rule.action === 'block' ? '🚫' : '⚠️';
        const tag = v.rule.severity.toUpperCase();
        lines.push(`${icon} [${tag}] ${v.rule.message}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=guardrail-engine.js.map