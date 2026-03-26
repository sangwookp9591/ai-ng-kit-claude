#!/usr/bin/env node
/**
 * aing Persistence CLI
 * Called by skills to persist plans and tasks to .aing/ directories.
 *
 * Usage:
 *   node scripts/cli/persist.mjs plan --feature <name> --goal <text> --steps "s1|s2|s3" [--criteria "c1|c2"] [--risks "r1|r2"]
 *   node scripts/cli/persist.mjs task --feature <name> --title <text> --subtasks "s1|s2|s3"
 *   node scripts/cli/persist.mjs report --feature <name> [--lessons "l1|l2"]
 *
 * Output: JSON { ok, planPath?, taskId?, ... }
 */

import { createPlan, getPlan, listPlans } from '../task/plan-manager.mjs';
import { createTask, listTasks, formatTaskChecklist, formatAllTasks } from '../task/task-manager.mjs';
import { generateReport } from '../evidence/evidence-report.mjs';
import { readStdinRaw } from '../core/stdin.mjs';

const args = process.argv.slice(2);
const command = args[0];
const useStdin = args.includes('--stdin');

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx < 0 || !args[idx + 1]) return null;
  // Reject values that look like flags (e.g., --goal when expecting a value)
  if (args[idx + 1].startsWith('--')) return null;
  return args[idx + 1];
}

function splitPipe(str) {
  return str ? str.split('|').map(s => s.trim()).filter(Boolean) : [];
}

const projectDir = getArg('dir') || process.cwd();

(async () => {
try {
  let result;

  switch (command) {
    case 'plan': {
      if (useStdin) {
        let data;
        try {
          const raw = await readStdinRaw(5000);
          data = JSON.parse(raw);
        } catch (_) {
          console.log(JSON.stringify({ ok: false, error: 'Invalid JSON on stdin' }));
          process.exit(1);
        }

        const feature = data.feature;
        const goal = data.goal;
        const steps = Array.isArray(data.steps) ? data.steps : [];

        if (!feature || !goal || steps.length === 0) {
          console.log(JSON.stringify({ ok: false, error: 'Required: feature, goal, steps (non-empty array)' }));
          process.exit(1);
        }

        result = createPlan({
          feature,
          goal,
          steps,
          acceptanceCriteria: Array.isArray(data.acceptanceCriteria) && data.acceptanceCriteria.length > 0 ? data.acceptanceCriteria : undefined,
          risks: Array.isArray(data.risks) && data.risks.length > 0 ? data.risks : undefined,
          options: Array.isArray(data.options) && data.options.length > 0 ? data.options : undefined,
          reviewNotes: Array.isArray(data.reviewNotes) && data.reviewNotes.length > 0 ? data.reviewNotes : undefined,
          complexityScore: data.complexityScore,
          complexityLevel: data.complexityLevel,
        }, projectDir);
      } else {
        const feature = getArg('feature');
        const goal = getArg('goal');
        const steps = splitPipe(getArg('steps'));
        const criteria = splitPipe(getArg('criteria'));
        const risks = splitPipe(getArg('risks'));

        if (!feature || !goal || steps.length === 0) {
          console.log(JSON.stringify({ ok: false, error: 'Required: --feature, --goal, --steps "s1|s2|s3"' }));
          process.exit(1);
        }

        result = createPlan({
          feature,
          goal,
          steps,
          acceptanceCriteria: criteria.length > 0 ? criteria : undefined,
          risks: risks.length > 0 ? risks : undefined
        }, projectDir);
      }
      break;
    }

    case 'task': {
      const title = getArg('title');
      const feature = getArg('feature');
      const description = getArg('description') || '';
      const subtasks = splitPipe(getArg('subtasks'));

      if (!title) {
        console.log(JSON.stringify({ ok: false, error: 'Required: --title' }));
        process.exit(1);
      }

      result = createTask({
        title,
        feature,
        description,
        subtasks: subtasks.map(s => ({ title: s }))
      }, projectDir);
      break;
    }

    case 'report': {
      const feature = getArg('feature');
      const lessons = splitPipe(getArg('lessons'));

      if (!feature) {
        console.log(JSON.stringify({ ok: false, error: 'Required: --feature' }));
        process.exit(1);
      }

      result = generateReport(feature, { lessons: lessons.length > 0 ? lessons : undefined }, projectDir);
      break;
    }

    case 'list-plans': {
      result = { ok: true, plans: listPlans(projectDir) };
      break;
    }

    case 'list-tasks': {
      result = { ok: true, tasks: listTasks(projectDir) };
      break;
    }

    case 'show-tasks': {
      result = { ok: true, display: formatAllTasks(projectDir) };
      break;
    }

    default:
      console.log(JSON.stringify({
        ok: false,
        error: `Unknown command: ${command}`,
        usage: 'plan | task | report | list-plans | list-tasks | show-tasks'
      }));
      process.exit(1);
  }

  console.log(JSON.stringify(result));
} catch (err) {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
}
})();
