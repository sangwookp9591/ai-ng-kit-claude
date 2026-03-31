/**
 * aing Harness Debugger — Runtime diagnosis for harness issues
 * Analyzes stalled agents, broken data flow, and suggests fixes.
 * @module scripts/harness/harness-debugger
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
import { scanHarnessDir } from './harness-parser.js';
const log = createLogger('harness-debugger');
// ─── Main Diagnosis ─────────────────────────────────────────────
export function diagnoseHarness(feature, projectDir) {
    const config = scanHarnessDir(projectDir);
    if (!config) {
        return {
            feature,
            status: 'unknown',
            stalledAgents: [],
            missingArtifacts: [],
            brokenLinks: [],
            suggestions: [{ type: 'fix-path', detail: '.claude/agents/ 디렉토리가 없습니다.', priority: 'high' }],
        };
    }
    const stalledAgents = detectStalledAgents(feature, config, projectDir);
    const missingArtifacts = detectMissingArtifacts(config, projectDir);
    const brokenLinks = detectBrokenLinks(config, projectDir);
    const suggestions = generateSuggestions(stalledAgents, missingArtifacts, brokenLinks, config);
    const status = stalledAgents.length > 0 ? 'stalled'
        : brokenLinks.length > 0 ? 'failed'
            : missingArtifacts.length > 0 ? 'stalled'
                : 'healthy';
    log.info('Diagnosis complete', { feature, status, stalled: stalledAgents.length });
    return { feature, status, stalledAgents, missingArtifacts, brokenLinks, suggestions };
}
// ─── Stalled Agent Detection ────────────────────────────────────
function detectStalledAgents(_feature, config, projectDir) {
    const stalled = [];
    const workspaceDir = join(projectDir, '_workspace');
    if (!existsSync(workspaceDir))
        return stalled;
    // Check which agents have produced output
    const producedOutput = new Set();
    for (const file of safeReaddir(workspaceDir)) {
        for (const agent of config.agents) {
            if (file.includes(agent.name)) {
                producedOutput.add(agent.name);
            }
        }
    }
    // Agents that should have produced output but haven't
    for (const agent of config.agents) {
        if (agent.inputOutput.output && !producedOutput.has(agent.name)) {
            // Check if agent's dependencies are met
            const deps = config.dataFlow.filter(e => e.target === agent.name);
            const depsProduced = deps.every(d => d.source === 'input' || producedOutput.has(d.source));
            if (depsProduced && deps.length > 0) {
                stalled.push(agent.name);
            }
        }
    }
    return stalled;
}
// ─── Missing Artifact Detection ─────────────────────────────────
function detectMissingArtifacts(config, projectDir) {
    const missing = [];
    const workspaceDir = join(projectDir, '_workspace');
    for (const edge of config.dataFlow) {
        if (edge.source === 'input')
            continue;
        if (!edge.artifact)
            continue;
        // Check if the artifact file exists
        const artifactPath = join(projectDir, edge.artifact);
        const workspacePath = join(workspaceDir, edge.artifact.replace('_workspace/', ''));
        if (!existsSync(artifactPath) && !existsSync(workspacePath)) {
            // Only flag if the source agent has been active
            missing.push(`${edge.source} → ${edge.artifact}`);
        }
    }
    return missing;
}
// ─── Broken Link Detection ──────────────────────────────────────
function detectBrokenLinks(config, _projectDir) {
    const broken = [];
    const agentNames = new Set(config.agents.map(a => a.name));
    for (const edge of config.dataFlow) {
        // Source doesn't exist
        if (edge.source !== 'input' && !agentNames.has(edge.source)) {
            broken.push(edge);
            continue;
        }
        // Target doesn't exist
        if (edge.target !== 'output' && edge.target !== 'integrator' && edge.target !== 'workers' && !agentNames.has(edge.target)) {
            broken.push(edge);
            continue;
        }
        // Check for filename mismatch between output and input
        if (edge.source !== 'input' && edge.target !== 'output') {
            const sourceAgent = config.agents.find(a => a.name === edge.source);
            const targetAgent = config.agents.find(a => a.name === edge.target);
            if (sourceAgent && targetAgent) {
                const sourceOutput = sourceAgent.inputOutput.output;
                const targetInput = targetAgent.inputOutput.input;
                if (sourceOutput && targetInput) {
                    const sourceFile = extractFilename(sourceOutput);
                    const targetFile = extractFilename(targetInput);
                    if (sourceFile && targetFile && sourceFile !== targetFile) {
                        broken.push({
                            ...edge,
                            format: `파일명 불일치: "${sourceFile}" ≠ "${targetFile}"`,
                        });
                    }
                }
            }
        }
    }
    return broken;
}
function extractFilename(text) {
    const match = text.match(/[`"']([\w/.{}_-]+\.\w+)[`"']/);
    return match ? match[1] : null;
}
// ─── Fix Suggestions ────────────────────────────────────────────
function generateSuggestions(stalled, missing, broken, config) {
    const suggestions = [];
    for (const agent of stalled) {
        const deps = config.dataFlow.filter(e => e.target === agent);
        const missingDeps = missing.filter(m => deps.some(d => m.includes(d.artifact)));
        if (missingDeps.length > 0) {
            suggestions.push({
                type: 'restart',
                agent: deps[0]?.source,
                detail: `${agent}의 입력 에이전트(${deps[0]?.source})를 재시작하세요. 산출물이 누락되어 있습니다.`,
                priority: 'high',
            });
        }
        else {
            suggestions.push({
                type: 'restart',
                agent,
                detail: `${agent}가 멈춰있습니다. 에이전트를 재시작하세요.`,
                priority: 'medium',
            });
        }
    }
    for (const link of broken) {
        if (link.format?.startsWith('파일명 불일치')) {
            suggestions.push({
                type: 'fix-path',
                detail: `${link.source} → ${link.target}: ${link.format}. 에이전트 정의의 입출력 경로를 맞추세요.`,
                priority: 'high',
            });
        }
        else {
            suggestions.push({
                type: 'fix-path',
                detail: `데이터 흐름 단절: ${link.source} → ${link.target}. 에이전트가 존재하는지 확인하세요.`,
                priority: 'medium',
            });
        }
    }
    if (stalled.length > config.agents.length / 2) {
        suggestions.push({
            type: 'skip',
            detail: '과반 에이전트가 멈춤. /aing debug로 근본 원인 분석을 권장합니다.',
            priority: 'high',
        });
    }
    return suggestions;
}
// ─── Helpers ────────────────────────────────────────────────────
function safeReaddir(dir) {
    try {
        return existsSync(dir) ? readdirSync(dir) : [];
    }
    catch {
        return [];
    }
}
// ─── Display ────────────────────────────────────────────────────
export function formatDiagnosis(result) {
    const statusIcon = {
        healthy: '✓ 정상',
        stalled: '~ 정체',
        failed: '✗ 실패',
        unknown: '? 불명',
    };
    const lines = [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `  aing harness fix: ${statusIcon[result.status]}`,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
    ];
    if (result.stalledAgents.length) {
        lines.push('  멈춘 에이전트:');
        for (const agent of result.stalledAgents) {
            lines.push(`    [!] ${agent}`);
        }
        lines.push('');
    }
    if (result.missingArtifacts.length) {
        lines.push('  누락 산출물:');
        for (const artifact of result.missingArtifacts) {
            lines.push(`    [?] ${artifact}`);
        }
        lines.push('');
    }
    if (result.brokenLinks.length) {
        lines.push('  단절된 데이터 흐름:');
        for (const link of result.brokenLinks) {
            lines.push(`    [✗] ${link.source} → ${link.target}: ${link.format || link.artifact}`);
        }
        lines.push('');
    }
    if (result.suggestions.length) {
        lines.push('  권장 조치:');
        for (const fix of result.suggestions.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority))) {
            const icon = fix.priority === 'high' ? '[!]' : fix.priority === 'medium' ? '[~]' : '[.]';
            lines.push(`    ${icon} ${fix.detail}`);
        }
        lines.push('');
    }
    if (result.status === 'healthy') {
        lines.push('  모든 에이전트와 데이터 흐름이 정상입니다.');
        lines.push('');
    }
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return lines.join('\n');
}
function priorityOrder(p) {
    return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
}
//# sourceMappingURL=harness-debugger.js.map