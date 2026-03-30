/**
 * aing PreToolUse Hook v1.3.2
 */
import { readStdinJSON } from '../scripts/core/stdin.js';
import { norchToolUse, norchAgentSpawn } from '../scripts/core/norch-bridge.js';
import { checkBashCommand, checkFilePath, formatViolations } from '../scripts/guardrail/guardrail-engine.js';
import { checkStepLimit, checkFileChangeLimit, checkForbiddenPath } from '../scripts/guardrail/safety-invariants.js';
import { isDryRunActive, queueChange, formatPreview } from '../scripts/guardrail/dry-run.js';

interface ParsedInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CheckResult {
  ok: boolean;
  message?: string;
}


const parsed: ParsedInput = await readStdinJSON();

try {
  const toolName: string = parsed.tool_name || '';
  const toolInput: Record<string, unknown> = parsed.tool_input || {};
  const projectDir: string = process.env.PROJECT_DIR || process.cwd();
  const ctx: string[] = [];

  // Agent/Task spawn
  if ((toolName === 'Agent' || toolName === 'Task') && toolInput.subagent_type) {
    const agentKey = (toolInput.name as string) || (toolInput.subagent_type as string).replace('aing:', '');
    norchAgentSpawn('session', agentKey, toolInput.description as string);
  } else if (toolName === 'SendMessage' && toolInput.to) {
    const agentKey = (toolInput.to as string).replace('aing:', '');
    norchToolUse('session', 'SendMessage', toolInput.to as string, agentKey);
  } else {
    norchToolUse('session', toolName, (toolInput.file_path as string) || (toolInput.command as string)?.slice(0, 50), undefined);
  }
  const step: CheckResult = checkStepLimit(projectDir);
  if (!step.ok) ctx.push(step.message!);

  if (toolName === 'Bash' && toolInput.command) {
    const r = checkBashCommand(toolInput.command as string, projectDir);
    if (!r.allowed) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { decision: 'block', reason: formatViolations(r.violations) } }));
      process.exit(0);
    }
    if (r.violations.length > 0) ctx.push(formatViolations(r.violations));
  }

  if ((toolName === 'Write' || toolName === 'Edit') && toolInput.file_path) {
    const fb: CheckResult = checkForbiddenPath(toolInput.file_path as string, projectDir);
    if (!fb.ok) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { decision: 'block', reason: fb.message } }));
      process.exit(0);
    }
    const fc: CheckResult = checkFileChangeLimit(toolInput.file_path as string, projectDir);
    if (!fc.ok) ctx.push(fc.message!);
    const fr = checkFilePath(toolInput.file_path as string, projectDir);
    if (fr.violations.length > 0) ctx.push(formatViolations(fr.violations));
    if (isDryRunActive(projectDir)) {
      queueChange({ type: toolName.toLowerCase() as 'write' | 'edit', target: toolInput.file_path as string }, projectDir);
      ctx.push(formatPreview(projectDir));
    }
  }

  process.stdout.write(ctx.length > 0
    ? JSON.stringify({ hookSpecificOutput: { additionalContext: ctx.join('\n\n') } })
    : '{}');
} catch (err: unknown) {
  process.stderr.write(`[aing:pre-tool-use] ${(err as Error).message}\n`);
  process.stdout.write('{}');
}
