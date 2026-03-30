/**
 * LLM-based quality evaluation.
 * Sends skill output to Claude for scoring (1-10) on 7 criteria.
 * Only runs when EVALS=1 environment variable is set.
 */
import { execFileSync } from 'node:child_process';

export const CRITERIA = [
  'completeness', 'accuracy', 'actionability',
  'conciseness', 'safety', 'formatting', 'tone',
];

export function isEvalsEnabled() {
  return process.env.EVALS === '1' || process.env.EVALS_ALL === '1';
}

export function judgeSkillOutput(skillName, output, context = '') {
  if (!isEvalsEnabled()) return null;

  const prompt = `Score this AI skill output on 7 criteria (1-10 each). Return ONLY valid JSON, no markdown.

Skill: ${skillName}
Context: ${context}

Output to judge:
${output.slice(0, 10000)}

JSON format: {"completeness":N,"accuracy":N,"actionability":N,"conciseness":N,"safety":N,"formatting":N,"tone":N,"overall":N,"notes":"..."}`;

  try {
    const result = execFileSync('claude', ['-p', prompt, '--model', 'haiku'], {
      encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe']
    });
    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch {
    return null;
  }
}
