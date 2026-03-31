/**
 * aing Harness Parser — Parse agent/skill markdown files
 * Extracts structured data from .claude/agents/ and .claude/skills/ files.
 * @module scripts/harness/harness-parser
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
const log = createLogger('harness-parser');
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match)
        return { meta: {}, body: content };
    const meta = {};
    for (const line of match[1].split('\n')) {
        const kv = line.match(/^(\w+):\s*(.+)$/);
        if (!kv)
            continue;
        const [, key, rawVal] = kv;
        let val = rawVal.replace(/^["']|["']$/g, '');
        // Parse arrays like ["a", "b"]
        if (rawVal.startsWith('[')) {
            try {
                val = JSON.parse(rawVal);
            }
            catch {
                val = rawVal;
            }
        }
        meta[key] = val;
    }
    return { meta, body: match[2] };
}
// ─── Section Extractor ──────────────────────────────────────────
function extractSection(body, heading) {
    const alternatives = heading.split('|').map(h => h.trim()).join('|');
    const pattern = new RegExp(`##\\s+(?:${alternatives})[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
    const match = body.match(pattern);
    if (!match)
        return [];
    return match[1]
        .split('\n')
        .filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./))
        .map(l => l.replace(/^[\s-]*\d*\.?\s*/, '').trim())
        .filter(Boolean);
}
function extractBlock(body, heading) {
    const alternatives = heading.split('|').map(h => h.trim()).join('|');
    const pattern = new RegExp(`##\\s+(?:${alternatives})[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
    const match = body.match(pattern);
    return match ? match[1].trim() : '';
}
// ─── Agent File Parser ──────────────────────────────────────────
export function parseAgentFile(filePath) {
    try {
        const raw = readFileSync(filePath, 'utf-8');
        const { meta, body } = parseFrontmatter(raw);
        if (!meta.name) {
            log.warn(`Agent file missing name: ${filePath}`);
            return null;
        }
        const ioBlock = extractBlock(body, '입력/출력 프로토콜|Input/Output');
        const ioLines = ioBlock.split('\n').filter(l => l.trim().startsWith('-'));
        const input = ioLines.find(l => /입력|input/i.test(l))?.replace(/^.*?:\s*/, '') || '';
        const output = ioLines.find(l => /출력|output/i.test(l))?.replace(/^.*?:\s*/, '') || '';
        const format = ioLines.find(l => /형식|format/i.test(l))?.replace(/^.*?:\s*/, '');
        return {
            name: meta.name,
            description: meta.description || '',
            model: meta.model || 'opus',
            subagentType: meta.name,
            filePath,
            role: extractSection(body, '핵심 역할|Core Role'),
            principles: extractSection(body, '작업 원칙|Principles'),
            inputOutput: { input, output, format },
            teamProtocol: parseTeamProtocol(body),
            errorHandling: extractSection(body, '에러 핸들링|Error Handling'),
            collaboration: extractSection(body, '협업|Collaboration'),
            skills: extractSkillRefs(body),
        };
    }
    catch (e) {
        log.error(`Failed to parse agent: ${filePath}`, e);
        return null;
    }
}
function parseTeamProtocol(body) {
    const block = extractBlock(body, '팀 통신 프로토콜|Team Communication');
    if (!block)
        return undefined;
    const receives = [];
    const sends = [];
    const taskClaims = [];
    for (const line of block.split('\n')) {
        const trimmed = line.trim().replace(/^-\s*/, '');
        if (!trimmed)
            continue;
        // Pattern: "X에게: ... SendMessage" or "X에게 ... 공유"
        const sendMatch = trimmed.match(/([\w-]+)에게\s*[:：]\s*(.+)/i);
        if (sendMatch) {
            sends.push({ to: sendMatch[1], content: sendMatch[2] });
            continue;
        }
        // Pattern: "X로부터: ..." or "X에게서: ..."
        const recvMatch = trimmed.match(/([\w-]+)(?:로부터|에게서|from)\s*[:：]\s*(.+)/i);
        if (recvMatch) {
            receives.push({ from: recvMatch[1], content: recvMatch[2] });
            continue;
        }
        // English patterns
        const sendEnMatch = trimmed.match(/(?:send|to)\s+([\w-]+)\s*[:：]\s*(.+)/i);
        if (sendEnMatch) {
            sends.push({ to: sendEnMatch[1], content: sendEnMatch[2] });
            continue;
        }
        const recvEnMatch = trimmed.match(/(?:receive|from)\s+([\w-]+)\s*[:：]\s*(.+)/i);
        if (recvEnMatch) {
            receives.push({ from: recvEnMatch[1], content: recvEnMatch[2] });
            continue;
        }
        // Task claims
        if (/작업 요청|task|claim/i.test(trimmed)) {
            taskClaims.push(trimmed);
        }
    }
    if (!receives.length && !sends.length && !taskClaims.length)
        return undefined;
    return { receives, sends, taskClaims };
}
function extractSkillRefs(body) {
    const skills = [];
    const matches = body.matchAll(/(?:skill|스킬)[:\s]*[`"']?([\w-]+)[`"']?/gi);
    for (const m of matches)
        skills.push(m[1]);
    return [...new Set(skills)];
}
// ─── Skill File Parser ──────────────────────────────────────────
export function parseSkillFile(filePath) {
    try {
        const raw = readFileSync(filePath, 'utf-8');
        const { meta } = parseFrontmatter(raw);
        if (!meta.name) {
            log.warn(`Skill file missing name: ${filePath}`);
            return null;
        }
        const skillDir = join(filePath, '..');
        const refDir = join(skillDir, 'references');
        const hasRefs = existsSync(refDir) && statSync(refDir).isDirectory();
        const refFiles = hasRefs
            ? readdirSync(refDir).filter(f => f.endsWith('.md'))
            : [];
        return {
            name: meta.name,
            description: meta.description || '',
            triggers: Array.isArray(meta.triggers) ? meta.triggers : [],
            filePath,
            lineCount: raw.split('\n').length,
            hasReferences: hasRefs,
            referenceFiles: refFiles,
        };
    }
    catch (e) {
        log.error(`Failed to parse skill: ${filePath}`, e);
        return null;
    }
}
// ─── Harness Directory Scanner ──────────────────────────────────
export function scanHarnessDir(projectDir) {
    const agentsDir = join(projectDir, '.claude', 'agents');
    const skillsDir = join(projectDir, '.claude', 'skills');
    const agents = [];
    const skills = [];
    // Scan agents
    if (existsSync(agentsDir)) {
        for (const file of readdirSync(agentsDir)) {
            if (!file.endsWith('.md'))
                continue;
            const agent = parseAgentFile(join(agentsDir, file));
            if (agent)
                agents.push(agent);
        }
    }
    // Scan skills
    if (existsSync(skillsDir)) {
        for (const dir of readdirSync(skillsDir)) {
            const skillFile = join(skillsDir, dir, 'skill.md');
            if (!existsSync(skillFile))
                continue;
            const skill = parseSkillFile(skillFile);
            if (skill)
                skills.push(skill);
        }
    }
    if (!agents.length && !skills.length) {
        log.info('No agents or skills found in project');
        return null;
    }
    const dataFlow = extractDataFlow(agents);
    const pattern = detectPattern(agents, dataFlow);
    const executionMode = detectExecutionMode(agents);
    const orchestrator = skills.find(s => /orchestrator|오케스트레이터/i.test(s.name));
    return {
        projectDir,
        agents,
        skills,
        pattern,
        executionMode,
        dataFlow,
        orchestrator,
    };
}
// ─── Data Flow Extraction ───────────────────────────────────────
export function extractDataFlow(agents) {
    const edges = [];
    for (const agent of agents) {
        // From input/output protocol
        if (agent.inputOutput.input) {
            const inputMatch = agent.inputOutput.input.match(/[`"']([\w/.{}_-]+\.\w+)[`"']/);
            if (inputMatch) {
                edges.push({
                    source: 'input',
                    target: agent.name,
                    artifact: inputMatch[1],
                });
            }
        }
        if (agent.inputOutput.output) {
            const outputMatch = agent.inputOutput.output.match(/[`"']([\w/.{}_-]+\.\w+)[`"']/);
            if (outputMatch) {
                edges.push({
                    source: agent.name,
                    target: 'output',
                    artifact: outputMatch[1],
                });
            }
        }
        // From team protocol sends
        if (agent.teamProtocol) {
            for (const send of agent.teamProtocol.sends) {
                edges.push({
                    source: agent.name,
                    target: send.to,
                    artifact: send.content,
                    format: 'message',
                });
            }
        }
    }
    return edges;
}
// ─── Pattern Detection ──────────────────────────────────────────
function detectPattern(agents, flow) {
    const agentCount = agents.length;
    // Check for reviewer/inspector agents → producer-reviewer
    if (agents.some(a => /review|검수|검증|inspector/i.test(a.name + a.description))) {
        if (agentCount <= 3)
            return 'producer-reviewer';
    }
    // Check for supervisor/controller agents → supervisor
    if (agents.some(a => /supervisor|감독|controller/i.test(a.name + a.description))) {
        return 'supervisor';
    }
    // Check for hierarchical mentions → hierarchical
    if (agents.some(a => /팀장|총괄|하위|tier/i.test(a.description))) {
        return 'hierarchical';
    }
    // Check for router/dispatcher → expert-pool
    if (agents.some(a => /router|라우터|dispatcher/i.test(a.name + a.description))) {
        return 'expert-pool';
    }
    // Multiple agents with parallel outputs → fanout
    const outputAgents = flow.filter(e => e.target === 'output');
    if (outputAgents.length >= 3)
        return 'fanout';
    // Sequential chain detected → pipeline
    const chainLength = detectChainLength(flow);
    if (chainLength >= 3)
        return 'pipeline';
    // Default: fanout for teams, pipeline for pairs
    return agentCount >= 3 ? 'fanout' : 'pipeline';
}
function detectChainLength(flow) {
    const graph = new Map();
    for (const edge of flow) {
        if (!graph.has(edge.source))
            graph.set(edge.source, []);
        graph.get(edge.source).push(edge.target);
    }
    let maxLen = 0;
    function dfs(node, depth, visited) {
        maxLen = Math.max(maxLen, depth);
        for (const next of graph.get(node) || []) {
            if (!visited.has(next)) {
                visited.add(next);
                dfs(next, depth + 1, visited);
                visited.delete(next);
            }
        }
    }
    for (const start of graph.keys()) {
        dfs(start, 1, new Set([start]));
    }
    return maxLen;
}
function detectExecutionMode(agents) {
    const hasTeamProtocol = agents.some(a => a.teamProtocol);
    return hasTeamProtocol ? 'agent-team' : 'sub-agent';
}
// ─── Display Helpers ────────────────────────────────────────────
export function formatHarnessConfig(config) {
    const lines = [
        '┌─────────────────────────────────────────┐',
        `│  Harness: ${config.agents.length} agents, ${config.skills.length} skills`,
        `│  Pattern: ${config.pattern}`,
        `│  Mode: ${config.executionMode}`,
        '├─────────────────────────────────────────┤',
        '│  Agents:',
    ];
    for (const a of config.agents) {
        lines.push(`│    ${a.name} (${a.model}) — ${a.role[0] || a.description.slice(0, 40)}`);
    }
    if (config.dataFlow.length) {
        lines.push('│  Data Flow:');
        for (const e of config.dataFlow.slice(0, 8)) {
            lines.push(`│    ${e.source} → ${e.target}: ${e.artifact}`);
        }
        if (config.dataFlow.length > 8) {
            lines.push(`│    ... +${config.dataFlow.length - 8} more`);
        }
    }
    lines.push('└─────────────────────────────────────────┘');
    return lines.join('\n');
}
//# sourceMappingURL=harness-parser.js.map