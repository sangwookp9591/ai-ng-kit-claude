/**
 * aing PreToolUse Hook v1.3.2
 */
import { readStdinJSON } from '../scripts/core/stdin.js';
import { norchToolUse, norchAgentSpawn } from '../scripts/core/norch-bridge.js';
import { checkBashCommand, checkFilePath, formatViolations } from '../scripts/guardrail/guardrail-engine.js';
import { checkStepLimit, checkFileChangeLimit, checkForbiddenPath } from '../scripts/guardrail/safety-invariants.js';
import { isDryRunActive, queueChange, formatPreview } from '../scripts/guardrail/dry-run.js';
const parsed = await readStdinJSON();
try {
    const toolName = parsed.tool_name || '';
    const toolInput = parsed.tool_input || {};
    const projectDir = process.env.PROJECT_DIR || process.cwd();
    const ctx = [];
    // Agent/Task spawn
    if ((toolName === 'Agent' || toolName === 'Task') && toolInput.subagent_type) {
        const agentKey = toolInput.name || toolInput.subagent_type.replace('aing:', '');
        norchAgentSpawn('session', agentKey, toolInput.description);
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
    process.stdout.write(ctx.length > 0
        ? JSON.stringify({ hookSpecificOutput: { additionalContext: ctx.join('\n\n') } })
        : '{}');
}
catch (err) {
    process.stderr.write(`[aing:pre-tool-use] ${err.message}\n`);
    process.stdout.write('{}');
}
//# sourceMappingURL=pre-tool-use.js.map