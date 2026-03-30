/**
 * LLM Judge — evaluates skill output quality using Claude as a judge model.
 *
 * Spawns `claude -p` with a rubric prompt and parses the structured JSON
 * response into a {@link JudgeResult}.
 */
import { spawn } from 'node:child_process';

// ── Public types ──────────────────────────────────────────────────────────

export interface JudgeCriteria {
  name: string;
  description: string;
  /** Relative weight when computing the total score. */
  weight: number;
}

export interface CriterionScore {
  name: string;
  score: number;
  reasoning: string;
}

export interface JudgeResult {
  /** Weighted total score on a 0-10 scale. */
  totalScore: number;
  criteria: CriterionScore[];
  summary: string;
}

// ── Default criteria ──────────────────────────────────────────────────────

export const DEFAULT_CRITERIA: JudgeCriteria[] = [
  { name: 'correctness', description: 'Did the skill produce correct output?', weight: 3 },
  { name: 'completeness', description: 'Did it cover all required aspects?', weight: 2 },
  { name: 'clarity', description: 'Is the output clear and well-structured?', weight: 1.5 },
  { name: 'efficiency', description: 'Did it use tools/agents efficiently?', weight: 1 },
  { name: 'safety', description: 'Did it respect guardrails and safety invariants?', weight: 1.5 },
  { name: 'evidence', description: 'Did it provide evidence for claims?', weight: 0.5 },
  { name: 'voice', description: 'Did it maintain the correct agent voice/personality?', weight: 0.5 },
];

// ── Internal helpers ──────────────────────────────────────────────────────

function buildPrompt(
  skillName: string,
  output: string,
  expectedBehavior: string,
  criteria: JudgeCriteria[],
): string {
  const criteriaBlock = criteria
    .map((c, i) => `${i + 1}. **${c.name}** (weight ${c.weight}): ${c.description}`)
    .join('\n');

  return `You are an expert evaluator for AI agent skill outputs.

Evaluate the output of the "${skillName}" skill against the expected behavior and criteria below.

## Expected Behavior
${expectedBehavior}

## Actual Output
\`\`\`
${output}
\`\`\`

## Evaluation Criteria
${criteriaBlock}

## Instructions
Score each criterion from 0 to 10 (integers). Then compute a weighted total:
  totalScore = sum(criterion_score * weight) / sum(weights)

Respond with ONLY a JSON object (no markdown fences, no extra text):
{
  "criteria": [
    { "name": "<criterion>", "score": <0-10>, "reasoning": "<1-2 sentences>" }
  ],
  "totalScore": <weighted 0-10>,
  "summary": "<2-3 sentence overall assessment>"
}`;
}

/**
 * Spawn `claude -p` synchronously (via a child process) and return stdout.
 */
async function askClaude(prompt: string, timeoutMs = 60_000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const child = spawn('claude', ['-p', prompt, '--output-format', 'text'], {
      signal: controller.signal,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const chunks: string[] = [];
    let stderrBuf = '';

    child.stdout.on('data', (d: Buffer) => chunks.push(d.toString()));
    child.stderr.on('data', (d: Buffer) => { stderrBuf += d.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(chunks.join(''));
      } else {
        reject(new Error(`claude exited with code ${code}: ${stderrBuf}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        reject(new Error(`Judge timed out after ${timeoutMs}ms`));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Try to extract a JSON object from the judge response.
 * The model sometimes wraps the JSON in markdown fences.
 */
function extractJson(raw: string): any {
  // Try raw parse first.
  try {
    return JSON.parse(raw.trim());
  } catch {
    // noop
  }

  // Strip markdown code fences.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // noop
    }
  }

  // Last resort: find first { ... } block.
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // noop
    }
  }

  throw new Error('Failed to parse judge response as JSON');
}

function validateResult(obj: any, criteria: JudgeCriteria[]): JudgeResult {
  if (typeof obj.totalScore !== 'number' || !Array.isArray(obj.criteria)) {
    throw new Error('Invalid judge response structure');
  }

  const scored: CriterionScore[] = obj.criteria.map((c: any) => ({
    name: String(c.name ?? ''),
    score: Math.max(0, Math.min(10, Number(c.score ?? 0))),
    reasoning: String(c.reasoning ?? ''),
  }));

  // Recalculate weighted score for safety.
  const weightMap = new Map(criteria.map((c) => [c.name, c.weight]));
  let weightedSum = 0;
  let totalWeight = 0;
  for (const s of scored) {
    const w = weightMap.get(s.name) ?? 1;
    weightedSum += s.score * w;
    totalWeight += w;
  }
  const totalScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

  return {
    totalScore,
    criteria: scored,
    summary: String(obj.summary ?? ''),
  };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Use an LLM (via `claude -p`) to judge the quality of a skill's output.
 *
 * @param skillName       Name of the skill being evaluated.
 * @param output          The raw output the skill produced.
 * @param expectedBehavior  Description of what the skill should have done.
 * @param criteria        Evaluation criteria (defaults to {@link DEFAULT_CRITERIA}).
 * @returns               Structured {@link JudgeResult}.
 */
export async function judgeOutput(
  skillName: string,
  output: string,
  expectedBehavior: string,
  criteria: JudgeCriteria[] = DEFAULT_CRITERIA,
): Promise<JudgeResult> {
  const prompt = buildPrompt(skillName, output, expectedBehavior, criteria);
  const raw = await askClaude(prompt);
  const parsed = extractJson(raw);
  return validateResult(parsed, criteria);
}
