/**
 * sw-kit PreToolUse Hook Handler v1.3.1
 * Guardrail + Safety Invariants + Dry-Run check before tool execution.
 */
import { readFileSync } from 'node:fs';
import { checkBashCommand, checkFilePath, formatViolations } from '../scripts/guardrail/guardrail-engine.mjs';
import { checkStepLimit, checkFileChangeLimit, checkForbiddenPath } from '../scripts/guardrail/safety-invariants.mjs';
import { isDryRunActive, queueChange, formatPreview } from '../scripts/guardrail/dry-run.mjs';

let parsed = {};
try { parsed = JSON.parse(readFileSync(0, 'utf-8')); } catch (_) {}

try {
  const toolName = parsed.tool_name || '';
  const toolInput = parsed.tool_input || {};
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const contextParts = [];

  const stepCheck = checkStepLimit(projectDir);
  if (!stepCheck.ok) contextParts.push(stepCheck.message);

  if (toolName === 'Bash' && toolInput.command) {
    const result = checkBashCommand(toolInput.command, projectDir);
    if (!result.allowed) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { decision: 'block', reason: formatViolations(result.violations) }
      }));
      process.exit(0);
    }
    if (result.violations.length > 0) contextParts.push(formatViolations(result.violations));
  }

  if ((toolName === 'Write' || toolName === 'Edit') && toolInput.file_path) {
    const forbidden = checkForbiddenPath(toolInput.file_path, projectDir);
    if (!forbidden.ok) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { decision: 'block', reason: forbidden.message }
      }));
      process.exit(0);
    }
    const fileCheck = checkFileChangeLimit(toolInput.file_path, projectDir);
    if (!fileCheck.ok) contextParts.push(fileCheck.message);
    const fileResult = checkFilePath(toolInput.file_path, projectDir);
    if (fileResult.violations.length > 0) contextParts.push(formatViolations(fileResult.violations));
    if (isDryRunActive(projectDir)) {
      queueChange({ type: toolName.toLowerCase(), target: toolInput.file_path }, projectDir);
      contextParts.push(formatPreview(projectDir));
    }
  }

  if (contextParts.length > 0) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { additionalContext: contextParts.join('\n\n') }
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }
} catch (err) {
  process.stderr.write(`[sw-kit:pre-tool-use] ${err.message}\n`);
  process.stdout.write(JSON.stringify({}));
}
