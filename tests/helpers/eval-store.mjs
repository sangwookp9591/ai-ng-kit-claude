/**
 * Persist and compare eval results across runs.
 * Stores at .aing/evals/{skill}-{date}.json
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const EVAL_DIR = join(process.cwd(), '.aing', 'evals');

export function saveEval(skillName, scores) {
  if (!existsSync(EVAL_DIR)) mkdirSync(EVAL_DIR, { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  const file = join(EVAL_DIR, `${skillName}-${date}.json`);
  writeFileSync(file, JSON.stringify({ skillName, date, scores, ts: new Date().toISOString() }, null, 2));
  return file;
}

export function loadLatestEval(skillName) {
  if (!existsSync(EVAL_DIR)) return null;
  const files = readdirSync(EVAL_DIR)
    .filter(f => f.startsWith(`${skillName}-`) && f.endsWith('.json'))
    .sort().reverse();
  if (files.length === 0) return null;
  return JSON.parse(readFileSync(join(EVAL_DIR, files[0]), 'utf-8'));
}

export function compareEvals(skillName, current) {
  const previous = loadLatestEval(skillName);
  if (!previous) return { improved: [], regressed: [], message: 'No previous eval' };
  const improved = [], regressed = [];
  for (const key of Object.keys(current)) {
    if (typeof current[key] !== 'number') continue;
    const prev = previous.scores?.[key];
    if (prev === undefined) continue;
    if (current[key] > prev) improved.push({ criterion: key, from: prev, to: current[key] });
    if (current[key] < prev) regressed.push({ criterion: key, from: prev, to: current[key] });
  }
  return { improved, regressed, message: regressed.length > 0 ? 'REGRESSION' : 'OK' };
}
