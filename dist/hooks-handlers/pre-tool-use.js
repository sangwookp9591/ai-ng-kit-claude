/**
 * aing PreToolUse Hook v1.3.2
 */
import { readStdinJSON } from '../scripts/core/stdin.js';
import { norchToolUse, norchAgentSpawn } from '../scripts/core/norch-bridge.js';
import { checkBashCommand, checkFilePath, formatViolations } from '../scripts/guardrail/guardrail-engine.js';
import { checkStepLimit, checkFileChangeLimit, checkForbiddenPath } from '../scripts/guardrail/safety-invariants.js';
import { isDryRunActive, queueChange, formatPreview } from '../scripts/guardrail/dry-run.js';
import { checkAgentAllowed, getExpectedAgent, isIterationTimedOut, trackAgentCall } from '../scripts/hooks/plan-state.js';
import { trackAgentSpawn } from '../scripts/guardrail/agent-budget.js';
const parsed = await readStdinJSON();
try {
    const toolName = parsed.tool_name || '';
    const toolInput = parsed.tool_input || {};
    const projectDir = process.env.PROJECT_DIR || process.cwd();
    const ctx = [];
    // Agent/Task spawn — AING-DR phase enforcement
    if ((toolName === 'Agent' || toolName === 'Task') && toolInput.subagent_type) {
        const agentKey = toolInput.name || toolInput.subagent_type.replace('aing:', '');
        norchAgentSpawn('session', agentKey, toolInput.description);
        // Universal agent budget guard (works for all skills: auto, team, plan-task, etc.)
        const subagentType = toolInput.subagent_type;
        if (subagentType.startsWith('aing:')) {
            const budget = trackAgentSpawn(projectDir, agentKey);
            if (budget.warn)
                ctx.push(budget.warn);
        }
        // Phase gate: only enforce AING-DR phase ordering when a plan session is actively running
        if (subagentType.startsWith('aing:')) {
            // Iteration timeout guard: warn (not block) when iteration budget is exceeded
            if (isIterationTimedOut(projectDir)) {
                ctx.push('[aing:iteration-timeout] Iteration time budget (3min) exceeded. Consider using current best plan version and proceeding to persist.');
            }
            // Agent call cap: warn when approaching/exceeding limit
            if (!trackAgentCall(projectDir)) {
                ctx.push('[aing:agent-cap] Agent call limit (10) exceeded for this plan session. Consider finalizing with current best version.');
            }
            const phaseCheck = checkAgentAllowed(projectDir, subagentType);
            // Only block if phase check explicitly says not allowed AND has an active reason
            // (avoids blocking due to stale state files from completed/terminated sessions)
            if (!phaseCheck.allowed && phaseCheck.reason && !phaseCheck.reason.includes('no active')) {
                const expected = getExpectedAgent(projectDir);
                const guidance = expected
                    ? `Current phase "${expected.phase}" expects: ${expected.agents.map(a => `aing:${a}`).join(' or ')}. Spawn the correct agent first.`
                    : phaseCheck.reason || 'Agent not allowed in current phase.';
                process.stdout.write(JSON.stringify({
                    hookSpecificOutput: { decision: 'block', reason: `[aing:phase-gate] ${guidance}` }
                }));
                process.exit(0);
            }
        }
    }
    else if (toolName === 'SendMessage' && toolInput.to) {
        const agentKey = toolInput.to.replace('aing:', '');
        norchToolUse('session', 'SendMessage', toolInput.to, agentKey);
    }
    else {
        norchToolUse('session', toolName, toolInput.file_path || toolInput.command?.slice(0, 50), undefined);
    }
    const step = checkStepLimit(projectDir);
    if (!step.ok)
        ctx.push(step.message);
    if (toolName === 'Bash' && toolInput.command) {
        const r = checkBashCommand(toolInput.command, projectDir);
        if (!r.allowed) {
            process.stdout.write(JSON.stringify({ hookSpecificOutput: { decision: 'block', reason: formatViolations(r.violations) } }));
            process.exit(0);
        }
        if (r.violations.length > 0)
            ctx.push(formatViolations(r.violations));
    }
    if ((toolName === 'Write' || toolName === 'Edit') && toolInput.file_path) {
        const fb = checkForbiddenPath(toolInput.file_path, projectDir);
        if (!fb.ok) {
            process.stdout.write(JSON.stringify({ hookSpecificOutput: { decision: 'block', reason: fb.message } }));
            process.exit(0);
        }
        const fc = checkFileChangeLimit(toolInput.file_path, projectDir);
        if (!fc.ok)
            ctx.push(fc.message);
        const fr = checkFilePath(toolInput.file_path, projectDir);
        if (fr.violations.length > 0)
            ctx.push(formatViolations(fr.violations));
        if (isDryRunActive(projectDir)) {
            queueChange({ type: toolName.toLowerCase(), target: toolInput.file_path }, projectDir);
            ctx.push(formatPreview(projectDir));
        }
    }
    // Reality check flag: indirect block (set by post-tool-use, cleared on session stop)
    // Placed after isDryRunActive() check to avoid conflict with dry-run queuing
    if (!isDryRunActive(projectDir)) {
        try {
            const { existsSync, readFileSync } = await import('node:fs');
            const { join } = await import('node:path');
            const flagPath = join(projectDir, '.aing', 'state', 'reality-check-flag.json');
            if (existsSync(flagPath)) {
                const flag = JSON.parse(readFileSync(flagPath, 'utf-8'));
                if (flag.active) {
                    process.stdout.write(JSON.stringify({
                        hookSpecificOutput: {
                            decision: 'block',
                            reason: `[aing:reality-check] Reality check flag active (scenario: ${flag.scenario || 'unknown'}). Session requires review before proceeding.`,
                        }
                    }));
                    process.exit(0);
                }
            }
        }
        catch { /* flag check is best-effort — never block on error */ }
    }
    process.stdout.write(ctx.length > 0
        ? JSON.stringify({ hookSpecificOutput: { additionalContext: ctx.join('\n\n') } })
        : '{}');
}
catch (err) {
    process.stderr.write(`[aing:pre-tool-use] ${err.message}\n`);
    process.stdout.write('{}');
}
//# sourceMappingURL=pre-tool-use.js.map