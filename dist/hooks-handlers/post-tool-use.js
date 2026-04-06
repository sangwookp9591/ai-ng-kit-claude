/**
 * aing PostToolUse Hook v1.5.0
 */
import { readStdinJSON } from '../scripts/core/stdin.js';
import { collectBasicEvidence } from '../scripts/evidence/evidence-collector-lite.js';
import { recordToolUse } from '../scripts/trace/agent-trace.js';
import { recordToolError, clearToolErrors } from '../scripts/hooks/error-recovery.js';
import { resetErrorCount } from '../scripts/guardrail/safety-invariants.js';
import { norchToolUse, norchAgentDone } from '../scripts/core/norch-bridge.js';
import { detectLearnablePattern, recordPatternUse } from '../scripts/hooks/learnable-pattern.js';
import { autoAdvancePhase } from '../scripts/hooks/plan-state.js';
import { recordAgentCompletion } from '../scripts/guardrail/agent-budget.js';
import { capturePassive } from '../scripts/memory/learning-capture.js';
import { runRealityCheck } from '../scripts/hooks/reality-check.js';
import { isDryRunActive } from '../scripts/guardrail/dry-run.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
function isPdcaActive(dir) {
    try {
        const stateFile = join(dir, '.aing', 'state', 'pdca-status.json');
        if (!existsSync(stateFile))
            return false;
        const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
        return !!(state.activeFeature);
    }
    catch {
        return false;
    }
}
function detectStage(dir) {
    try {
        const sessionPath = join(dir, '.aing', 'state', 'team-session.json');
        if (existsSync(sessionPath)) {
            const session = JSON.parse(readFileSync(sessionPath, 'utf-8'));
            const stage = session.currentStage || '';
            if (stage.includes('plan'))
                return 'plan';
            if (stage.includes('exec'))
                return 'exec';
            if (stage.includes('verify'))
                return 'verify';
            if (stage.includes('fix'))
                return 'fix';
        }
    }
    catch { /* best-effort */ }
    return 'other';
}
const parsed = await readStdinJSON();
const projectDir = process.env.PROJECT_DIR || process.cwd();
try {
    const toolName = parsed.tool_name || '';
    const toolResponse = parsed.tool_response || '';
    if (toolName) {
        // For Agent/Task calls, extract the actual agent name from subagent_type
        const toolInput = parsed.tool_input || {};
        if ((toolName === 'Agent' || toolName === 'Task') && toolInput.subagent_type) {
            const agentKey = toolInput.name || toolInput.subagent_type.replace('aing:', '');
            const agentName = toolInput.name || toolInput.subagent_type.replace('aing:', '');
            recordToolUse(toolName, { ...toolInput, _agentName: agentName }, toolResponse, projectDir);
            norchAgentDone('session', agentKey, toolInput.description);
            // AING-DR phase auto-advance: when an aing: agent completes, advance to next phase
            const subagentType = toolInput.subagent_type;
            if (subagentType.startsWith('aing:')) {
                try {
                    const newPhase = autoAdvancePhase(projectDir, subagentType);
                    if (newPhase) {
                        process.stderr.write(`[aing:phase-gate] Phase advanced → ${newPhase}\n`);
                    }
                }
                catch { /* phase advance is best-effort */ }
            }
            // Activity summary: extract file operations from agent response and show inline
            if (subagentType.startsWith('aing:') && toolResponse) {
                try {
                    const files = [];
                    // Parse tool call patterns: Read(...), Write(...), Edit(...)
                    const readMatches = toolResponse.match(/Read\(([^)]+)\)/g) || [];
                    const writeMatches = toolResponse.match(/Write\(([^)]+)\)/g) || [];
                    const editMatches = toolResponse.match(/Edit\(([^)]+)\)/g) || [];
                    const bashMatches = toolResponse.match(/Bash\(([^)]{0,60})/g) || [];
                    for (const m of readMatches)
                        files.push(`📖 ${m.slice(5, -1)}`);
                    for (const m of writeMatches)
                        files.push(`✏️ ${m.slice(6, -1)}`);
                    for (const m of editMatches)
                        files.push(`🔧 ${m.slice(5, -1)}`);
                    // Deduplicate and limit
                    const unique = [...new Set(files)].slice(0, 8);
                    const bashCount = bashMatches.length;
                    if (unique.length > 0 || bashCount > 0) {
                        const summary = unique.join(', ') + (bashCount > 0 ? ` ⚡bash×${bashCount}` : '');
                        const more = files.length > 8 ? ` +${files.length - 8} more` : '';
                        process.stderr.write(`[aing:${agentName}] ${summary}${more}\n`);
                    }
                }
                catch { /* activity summary is best-effort */ }
            }
            // Token tracking: parse <usage> from agent response and log automatically
            try {
                const usageMatch = toolResponse.match(/<usage>([\s\S]*?)<\/usage>/);
                if (usageMatch) {
                    const usageText = usageMatch[1];
                    const totalTokensMatch = usageText.match(/total_tokens:\s*(\d+)/);
                    const toolUsesMatch = usageText.match(/tool_uses:\s*(\d+)/);
                    const durationMsMatch = usageText.match(/duration_ms:\s*(\d+)/);
                    const durationMs = durationMsMatch ? parseInt(durationMsMatch[1], 10) : null;
                    const { logTokenUsage } = await import('../scripts/telemetry/token-tracker.js');
                    logTokenUsage({
                        ts: new Date().toISOString(),
                        agent: agentName,
                        stage: detectStage(projectDir),
                        model: toolInput.model || 'sonnet',
                        totalTokens: totalTokensMatch ? parseInt(totalTokensMatch[1], 10) : null,
                        toolUses: toolUsesMatch ? parseInt(toolUsesMatch[1], 10) : null,
                        durationMs,
                    }, projectDir);
                    // Agent budget: record completion + slow agent detection
                    if (durationMs) {
                        const budgetWarn = recordAgentCompletion(projectDir, agentName, durationMs);
                        if (budgetWarn)
                            process.stderr.write(budgetWarn + '\n');
                    }
                }
            }
            catch { /* token tracking is best-effort */ }
            // Reality check: feedback violation + autonomy risk (Agent/Task 완료 시에만 실행)
            try {
                if (!isDryRunActive(projectDir)) {
                    const sessionId = process.env.SESSION_ID || 'unknown';
                    const rcResults = runRealityCheck({
                        toolInput,
                        agentResponse: toolResponse,
                        sessionId,
                        projectDir,
                    });
                    for (const rc of rcResults) {
                        if (rc.verdict === 'block') {
                            process.stderr.write(`[aing:reality-check] BLOCK — ${rc.scenario}: ${rc.evidence}\n`);
                        }
                        else if (rc.verdict === 'warn') {
                            process.stderr.write(`[aing:reality-check] WARN — ${rc.scenario}: ${rc.evidence}\n`);
                        }
                    }
                }
            }
            catch { /* reality check is best-effort */ }
        }
        else if (toolName === 'SendMessage' && toolInput.to) {
            const agentKey = toolInput.to.replace('aing:', '');
            recordToolUse(toolName, { ...toolInput, _agentName: agentKey }, toolResponse, projectDir);
            norchToolUse('session', 'SendMessage', toolInput.to, agentKey);
        }
        else {
            recordToolUse(toolName, toolInput, toolResponse, projectDir);
            norchToolUse('session', toolName, toolInput.file_path || toolInput.command?.slice(0, 60), undefined);
        }
        resetErrorCount(projectDir);
    }
    // Passive learning: guardrail denial capture (PDCA 비활성 시)
    try {
        if (!isPdcaActive(projectDir)) {
            const toolInput = parsed.tool_input || {};
            if (toolName === 'Bash' && toolInput.command) {
                const { checkBashCommand } = await import('../scripts/guardrail/guardrail-engine.js');
                const gr = checkBashCommand(toolInput.command, projectDir);
                if (!gr.allowed || gr.violations.some(v => v.rule.action === 'block')) {
                    capturePassive({ trigger: 'guardrail-denial', content: `가드레일 차단: ${toolInput.command.slice(0, 80)}`, context: 'bash' }, projectDir);
                }
            }
            else if ((toolName === 'Write' || toolName === 'Edit') && toolInput.file_path) {
                const { checkFilePath } = await import('../scripts/guardrail/guardrail-engine.js');
                const gr = checkFilePath(toolInput.file_path, projectDir);
                if (!gr.allowed || gr.violations.some(v => v.rule.action === 'block')) {
                    capturePassive({ trigger: 'guardrail-denial', content: `가드레일 차단: ${toolInput.file_path}`, context: 'file' }, projectDir);
                }
            }
        }
    }
    catch { /* passive learning is best-effort */ }
    if (toolName === 'Bash' && toolResponse) {
        const ev = collectBasicEvidence(toolName, toolResponse);
        if (ev)
            process.stderr.write(`[aing:evidence] ${ev.type}: ${ev.result}\n`);
        // Error recovery: track repeated failures and suggest alternatives
        const isError = toolResponse.includes('Error') || toolResponse.includes('FAIL') || toolResponse.includes('error:');
        if (isError) {
            const { guidance } = recordToolError(projectDir, toolName, toolResponse.slice(0, 500));
            if (guidance) {
                process.stderr.write(`\n${guidance}\n`);
            }
        }
        else {
            // Passive learning: error→success recovery (only when PDCA is inactive)
            try {
                if (!isPdcaActive(projectDir)) {
                    const toolInput = parsed.tool_input || {};
                    const cmd = toolInput.command || '';
                    const { readState } = await import('../scripts/core/state.js');
                    const errState = readState(join(projectDir, '.aing', 'state', 'error-recovery.json'));
                    const hadError = errState.ok && Array.isArray(errState.data?.errors) &&
                        errState.data.errors.some((e) => e.toolName === toolName);
                    if (cmd && hadError) {
                        capturePassive({ trigger: 'error-recovery', content: `에러 복구 성공: ${cmd.slice(0, 80)}`, context: 'bash' }, projectDir);
                    }
                }
            }
            catch { /* passive learning is best-effort */ }
            clearToolErrors(projectDir, toolName);
        }
    }
    // Pattern learning: detect and record reusable patterns (lightweight — skip short commands)
    if ((toolName === 'Bash' || toolName === 'Glob') && toolResponse.length > 0) {
        const toolInput = parsed.tool_input || {};
        try {
            // Only record patterns for non-trivial commands (skip simple ls, pwd, etc.)
            const cmd = toolInput.command || toolInput.pattern || '';
            if (cmd.length > 10) {
                if (toolName === 'Bash' && toolInput.command) {
                    recordPatternUse(projectDir, 'command', toolInput.command);
                }
                else if (toolName === 'Glob' && toolInput.pattern) {
                    recordPatternUse(projectDir, 'filePattern', toolInput.pattern);
                }
                const pattern = detectLearnablePattern(projectDir, toolName, toolInput, toolResponse);
                if (pattern) {
                    process.stderr.write(`[aing:learn] ${pattern.type}: ${pattern.suggestion || pattern.pattern}\n`);
                }
            }
        }
        catch { /* pattern learning is best-effort */ }
    }
    process.stdout.write('{}');
}
catch (err) {
    process.stderr.write(`[aing:post-tool-use] ${err.message}\n`);
    process.stdout.write('{}');
}
//# sourceMappingURL=post-tool-use.js.map