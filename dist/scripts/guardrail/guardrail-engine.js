/**
 * aing Guardrail Engine v0.3.0
 * Declarative rule engine for constraining agent behavior.
 * Harness Engineering: Constrain axis — define boundaries.
 * @module scripts/guardrail/guardrail-engine
 */
import { getConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
const log = createLogger('guardrail');
/**
 * Default guardrail rules (active even without config)
 */
const DEFAULT_RULES = [
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
export function loadRules(_projectDir) {
    const configRules = getConfig('guardrail.rules', []);
    // Parse user-defined pattern strings into RegExp
    const userRules = configRules.map(rule => ({
        ...rule,
        pattern: typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'i') : rule.pattern
    }));
    // Disabled rules from config
    const disabledIds = new Set(getConfig('guardrail.disabled', []));
    return [...DEFAULT_RULES, ...userRules].filter(r => !disabledIds.has(r.id));
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