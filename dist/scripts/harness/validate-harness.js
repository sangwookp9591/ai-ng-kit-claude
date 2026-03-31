/**
 * aing Harness Validator — Automated structure & quality checks
 * Validates agent definitions, skill files, data flow, and team sizing.
 * @module scripts/harness/validate-harness
 */
import { createLogger } from '../core/logger.js';
import { scanHarnessDir } from './harness-parser.js';
const log = createLogger('validate-harness');
// ─── Main Validator ─────────────────────────────────────────────
export function validateHarness(projectDir) {
    const config = scanHarnessDir(projectDir);
    if (!config) {
        return {
            passed: false,
            score: 0,
            issues: [{ severity: 'error', category: 'structure', message: '.claude/agents/ 또는 .claude/skills/ 디렉토리가 없습니다.' }],
            summary: '하네스를 찾을 수 없습니다.',
        };
    }
    const issues = [
        ...validateStructure(config),
        ...validateConnections(config),
        ...validateQuality(config),
        ...validateTeamSizing(config),
    ];
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warnCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 100 - errorCount * 15 - warnCount * 5);
    const passed = errorCount === 0;
    const summary = passed
        ? `검증 통과 (${score}/100) — ${warnCount}개 경고`
        : `검증 실패 (${score}/100) — ${errorCount}개 에러, ${warnCount}개 경고`;
    log.info('Validation complete', { passed, score, errors: errorCount, warnings: warnCount });
    return { passed, score, issues, summary };
}
// ─── Structure Validation ───────────────────────────────────────
function validateStructure(config) {
    const issues = [];
    for (const agent of config.agents) {
        // Check frontmatter
        if (!agent.name) {
            issues.push(issue('error', 'structure', `에이전트 파일에 name이 없습니다.`, agent.filePath));
        }
        if (!agent.description) {
            issues.push(issue('warning', 'structure', `에이전트 ${agent.name}: description이 비어있습니다.`, agent.filePath));
        }
        // Check required sections
        if (!agent.role.length) {
            issues.push(issue('error', 'structure', `에이전트 ${agent.name}: "핵심 역할" 섹션이 없습니다.`, agent.filePath));
        }
        if (!agent.principles.length) {
            issues.push(issue('warning', 'structure', `에이전트 ${agent.name}: "작업 원칙" 섹션이 없습니다.`, agent.filePath));
        }
        if (!agent.inputOutput.input && !agent.inputOutput.output) {
            issues.push(issue('warning', 'structure', `에이전트 ${agent.name}: 입력/출력 프로토콜이 정의되지 않았습니다.`, agent.filePath));
        }
        if (!agent.errorHandling.length) {
            issues.push(issue('info', 'structure', `에이전트 ${agent.name}: 에러 핸들링 섹션이 없습니다.`, agent.filePath));
        }
        // Team mode specific
        if (config.executionMode === 'agent-team' && !agent.teamProtocol) {
            issues.push(issue('warning', 'team', `에이전트 ${agent.name}: 팀 통신 프로토콜이 없습니다. 팀 모드에서는 필수.`, agent.filePath));
        }
    }
    for (const skill of config.skills) {
        if (!skill.name) {
            issues.push(issue('error', 'structure', `스킬 파일에 name이 없습니다.`, skill.filePath));
        }
        if (!skill.description) {
            issues.push(issue('warning', 'structure', `스킬 ${skill.name}: description이 비어있습니다.`, skill.filePath));
        }
        if (skill.lineCount > 500) {
            issues.push(issue('warning', 'quality', `스킬 ${skill.name}: ${skill.lineCount}줄 — 500줄 초과. references/로 분리 필요.`, skill.filePath));
        }
    }
    return issues;
}
// ─── Connection Validation ──────────────────────────────────────
function validateConnections(config) {
    const issues = [];
    const agentNames = new Set(config.agents.map(a => a.name));
    // Check SendMessage targets exist
    for (const agent of config.agents) {
        if (!agent.teamProtocol)
            continue;
        for (const send of agent.teamProtocol.sends) {
            if (!agentNames.has(send.to) && send.to !== 'all' && send.to !== 'leader' && send.to !== 'team-lead') {
                issues.push(issue('error', 'connection', `에이전트 ${agent.name}: SendMessage 대상 "${send.to}"가 존재하지 않습니다.`, agent.filePath));
            }
        }
        for (const recv of agent.teamProtocol.receives) {
            if (!agentNames.has(recv.from) && recv.from !== 'leader' && recv.from !== 'team-lead') {
                issues.push(issue('warning', 'connection', `에이전트 ${agent.name}: 수신 대상 "${recv.from}"가 존재하지 않습니다.`, agent.filePath));
            }
        }
    }
    // Check skill references
    const skillNames = new Set(config.skills.map(s => s.name));
    for (const agent of config.agents) {
        for (const skill of agent.skills) {
            if (!skillNames.has(skill)) {
                issues.push(issue('warning', 'connection', `에이전트 ${agent.name}: 참조 스킬 "${skill}"이 존재하지 않습니다.`, agent.filePath));
            }
        }
    }
    // Check data flow dead links
    for (const edge of config.dataFlow) {
        if (edge.source !== 'input' && !agentNames.has(edge.source)) {
            issues.push(issue('error', 'dataflow', `데이터 흐름: 소스 "${edge.source}"가 존재하지 않습니다.`));
        }
        if (edge.target !== 'output' && edge.target !== 'integrator' && edge.target !== 'workers' && !agentNames.has(edge.target)) {
            issues.push(issue('error', 'dataflow', `데이터 흐름: 타겟 "${edge.target}"이 존재하지 않습니다.`));
        }
    }
    // Check for isolated agents (no communication)
    for (const agent of config.agents) {
        const hasIncoming = config.dataFlow.some(e => e.target === agent.name);
        const hasOutgoing = config.dataFlow.some(e => e.source === agent.name);
        const hasProtocol = !!agent.teamProtocol;
        if (!hasIncoming && !hasOutgoing && !hasProtocol) {
            issues.push(issue('warning', 'connection', `에이전트 ${agent.name}: 통신 경로가 없는 고립된 에이전트입니다.`, agent.filePath));
        }
    }
    // Check for circular dependencies
    const visited = new Set();
    const inStack = new Set();
    for (const edge of config.dataFlow) {
        if (detectCycle(edge.source, config.dataFlow, visited, inStack)) {
            issues.push(issue('error', 'dataflow', `순환 의존성이 감지되었습니다: ${edge.source} → ${edge.target}`));
            break;
        }
    }
    return issues;
}
function detectCycle(node, edges, visited, inStack) {
    if (inStack.has(node))
        return true;
    if (visited.has(node))
        return false;
    visited.add(node);
    inStack.add(node);
    for (const edge of edges) {
        if (edge.source === node && edge.target !== 'output' && edge.target !== 'integrator') {
            if (detectCycle(edge.target, edges, visited, inStack))
                return true;
        }
    }
    inStack.delete(node);
    return false;
}
// ─── Quality Validation ─────────────────────────────────────────
function validateQuality(config) {
    const issues = [];
    for (const skill of config.skills) {
        // Description pushy score
        const descLen = skill.description.length;
        if (descLen < 30) {
            issues.push(issue('warning', 'quality', `스킬 ${skill.name}: description이 너무 짧습니다 (${descLen}자). 트리거 확률이 낮을 수 있습니다.`, skill.filePath));
        }
        if (descLen < 80 && !skill.description.includes('반드시') && !skill.description.includes('사용할 것')) {
            issues.push(issue('info', 'quality', `스킬 ${skill.name}: description에 적극적 트리거 문구가 없습니다. "반드시 이 스킬을 사용할 것" 등 추가 권장.`, skill.filePath));
        }
        // Reference files for large skills
        if (skill.lineCount > 300 && !skill.hasReferences) {
            issues.push(issue('info', 'quality', `스킬 ${skill.name}: ${skill.lineCount}줄이지만 references/가 없습니다. 분리 고려.`, skill.filePath));
        }
    }
    // Check orchestrator exists
    if (!config.orchestrator && config.agents.length > 1) {
        issues.push(issue('warning', 'quality', '오케스트레이터 스킬이 없습니다. 팀 조율을 위해 생성을 권장합니다.'));
    }
    return issues;
}
// ─── Team Sizing Validation ─────────────────────────────────────
function validateTeamSizing(config) {
    const issues = [];
    const agentCount = config.agents.length;
    if (agentCount > 7) {
        issues.push(issue('warning', 'team', `에이전트 ${agentCount}명 — 7명 초과. 조율 오버헤드가 큽니다. 분할을 권장합니다.`));
    }
    if (config.executionMode === 'agent-team' && agentCount === 1) {
        issues.push(issue('info', 'team', '에이전트 1명에 팀 모드 — 서브 에이전트 모드가 더 효율적입니다.'));
    }
    return issues;
}
// ─── Helpers ────────────────────────────────────────────────────
function issue(severity, category, message, file) {
    return { severity, category, message, file };
}
// ─── Display ────────────────────────────────────────────────────
export function formatValidation(result) {
    const icon = result.passed ? '✓' : '✗';
    const lines = [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `  aing harness check: ${icon} ${result.summary}`,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
    ];
    const grouped = groupBy(result.issues, i => i.severity);
    for (const [severity, items] of Object.entries(grouped)) {
        const prefix = severity === 'error' ? '[E]' : severity === 'warning' ? '[W]' : '[I]';
        for (const item of items) {
            const filePart = item.file ? ` (${item.file.split('/').pop()})` : '';
            lines.push(`  ${prefix} ${item.message}${filePart}`);
        }
    }
    lines.push('');
    lines.push(`  Score: ${result.score}/100`);
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return lines.join('\n');
}
function groupBy(arr, fn) {
    const result = {};
    for (const item of arr) {
        const key = fn(item);
        (result[key] ||= []).push(item);
    }
    return result;
}
//# sourceMappingURL=validate-harness.js.map