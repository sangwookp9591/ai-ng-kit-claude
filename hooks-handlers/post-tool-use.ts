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
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function detectStage(dir: string): string {
  try {
    const sessionPath = join(dir, '.aing', 'state', 'team-session.json');
    if (existsSync(sessionPath)) {
      const session = JSON.parse(readFileSync(sessionPath, 'utf-8')) as Record<string, unknown>;
      const stage = (session.currentStage as string) || '';
      if (stage.includes('plan')) return 'plan';
      if (stage.includes('exec')) return 'exec';
      if (stage.includes('verify')) return 'verify';
      if (stage.includes('fix')) return 'fix';
    }
  } catch { /* best-effort */ }
  return 'other';
}

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

      // AING-DR phase auto-advance: when an aing: agent completes, advance to next phase
      const subagentType = toolInput.subagent_type as string;
      if (subagentType.startsWith('aing:')) {
        try {
          const newPhase = autoAdvancePhase(projectDir, subagentType);
          if (newPhase) {
            process.stderr.write(`[aing:phase-gate] Phase advanced → ${newPhase}\n`);
          }
        } catch { /* phase advance is best-effort */ }
      }

      // Activity summary: extract file operations from agent response and show inline
      if (subagentType.startsWith('aing:') && toolResponse) {
        try {
          const files: string[] = [];
          // Parse tool call patterns: Read(...), Write(...), Edit(...)
          const readMatches = toolResponse.match(/Read\(([^)]+)\)/g) || [];
          const writeMatches = toolResponse.match(/Write\(([^)]+)\)/g) || [];
          const editMatches = toolResponse.match(/Edit\(([^)]+)\)/g) || [];
          const bashMatches = toolResponse.match(/Bash\(([^)]{0,60})/g) || [];

          for (const m of readMatches) files.push(`📖 ${m.slice(5, -1)}`);
          for (const m of writeMatches) files.push(`✏️ ${m.slice(6, -1)}`);
          for (const m of editMatches) files.push(`🔧 ${m.slice(5, -1)}`);

          // Deduplicate and limit
          const unique = [...new Set(files)].slice(0, 8);
          const bashCount = bashMatches.length;

          if (unique.length > 0 || bashCount > 0) {
            const summary = unique.join(', ') + (bashCount > 0 ? ` ⚡bash×${bashCount}` : '');
            const more = files.length > 8 ? ` +${files.length - 8} more` : '';
            process.stderr.write(`[aing:${agentName}] ${summary}${more}\n`);
          }
        } catch { /* activity summary is best-effort */ }
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
            model: (toolInput.model as string) || 'sonnet',
            totalTokens: totalTokensMatch ? parseInt(totalTokensMatch[1], 10) : null,
            toolUses: toolUsesMatch ? parseInt(toolUsesMatch[1], 10) : null,
            durationMs,
          }, projectDir);

          // Agent budget: record completion + slow agent detection
          if (durationMs) {
            const budgetWarn = recordAgentCompletion(projectDir, agentName, durationMs);
            if (budgetWarn) process.stderr.write(budgetWarn + '\n');
          }
        }
      } catch { /* token tracking is best-effort */ }
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

  // Pattern learning: detect and record reusable patterns (lightweight — skip short commands)
  if ((toolName === 'Bash' || toolName === 'Glob') && toolResponse.length > 0) {
    const toolInput: Record<string, unknown> = parsed.tool_input || {};
    try {
      // Only record patterns for non-trivial commands (skip simple ls, pwd, etc.)
      const cmd = (toolInput.command as string) || (toolInput.pattern as string) || '';
      if (cmd.length > 10) {
        if (toolName === 'Bash' && toolInput.command) {
          recordPatternUse(projectDir, 'command', toolInput.command as string);
        } else if (toolName === 'Glob' && toolInput.pattern) {
          recordPatternUse(projectDir, 'filePattern', toolInput.pattern as string);
        }
        const pattern = detectLearnablePattern(projectDir, toolName, toolInput, toolResponse);
        if (pattern) {
          process.stderr.write(`[aing:learn] ${pattern.type}: ${pattern.suggestion || pattern.pattern}\n`);
        }
      }
    } catch { /* pattern learning is best-effort */ }
  }

  process.stdout.write('{}');
} catch (err: unknown) {
  process.stderr.write(`[aing:post-tool-use] ${(err as Error).message}\n`);
  process.stdout.write('{}');
}
