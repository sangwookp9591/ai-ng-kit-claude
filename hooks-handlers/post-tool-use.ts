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

interface ParsedInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: string;
  [key: string]: unknown;
}

interface BasicEvidence {
  type: string;
  result: string;
}

const parsed: ParsedInput = await readStdinJSON();
const projectDir: string = process.env.PROJECT_DIR || process.cwd();

try {
  const toolName: string = parsed.tool_name || '';
  const toolResponse: string = parsed.tool_response || '';

  if (toolName) {
    // For Agent/Task calls, extract the actual agent name from subagent_type
    const toolInput: Record<string, unknown> = parsed.tool_input || {};
    if ((toolName === 'Agent' || toolName === 'Task') && toolInput.subagent_type) {
      const agentKey: string = (toolInput.name as string) || (toolInput.subagent_type as string).replace('aing:', '');
      const agentName: string = (toolInput.name as string) || (toolInput.subagent_type as string).replace('aing:', '');
      recordToolUse(toolName, { ...toolInput, _agentName: agentName }, toolResponse, projectDir);
      norchAgentDone('session', agentKey, toolInput.description as string);
    } else if (toolName === 'SendMessage' && toolInput.to) {
      const agentKey: string = (toolInput.to as string).replace('aing:', '');
      recordToolUse(toolName, { ...toolInput, _agentName: agentKey }, toolResponse, projectDir);
      norchToolUse('session', 'SendMessage', toolInput.to as string, agentKey);
    } else {
      recordToolUse(toolName, toolInput, toolResponse, projectDir);
      norchToolUse('session', toolName, (toolInput.file_path as string) || (toolInput.command as string)?.slice(0, 60), undefined);
    }
    resetErrorCount(projectDir);
  }

  if (toolName === 'Bash' && toolResponse) {
    const ev: BasicEvidence | null = collectBasicEvidence(toolName, toolResponse);
    if (ev) process.stderr.write(`[aing:evidence] ${ev.type}: ${ev.result}\n`);

    // Error recovery: track repeated failures and suggest alternatives
    const isError = toolResponse.includes('Error') || toolResponse.includes('FAIL') || toolResponse.includes('error:');
    if (isError) {
      const { guidance } = recordToolError(projectDir, toolName, toolResponse.slice(0, 500));
      if (guidance) {
        process.stderr.write(`\n${guidance}\n`);
      }
    } else {
      clearToolErrors(projectDir, toolName);
    }
  }

  // Pattern learning: detect and record reusable patterns
  if (toolName === 'Bash' || toolName === 'Glob') {
    const toolInput: Record<string, unknown> = parsed.tool_input || {};
    try {
      // Record use first (increments counter)
      if (toolName === 'Bash' && toolInput.command) {
        recordPatternUse(projectDir, 'command', toolInput.command as string);
      } else if (toolName === 'Glob' && toolInput.pattern) {
        recordPatternUse(projectDir, 'filePattern', toolInput.pattern as string);
      }
      // Then check if a threshold was crossed
      const pattern = detectLearnablePattern(projectDir, toolName, toolInput, toolResponse);
      if (pattern) {
        process.stderr.write(`[aing:learn] ${pattern.type}: ${pattern.suggestion || pattern.pattern}\n`);
      }
    } catch { /* pattern learning is best-effort */ }
  }

  process.stdout.write('{}');
} catch (err: unknown) {
  process.stderr.write(`[aing:post-tool-use] ${(err as Error).message}\n`);
  process.stdout.write('{}');
}
