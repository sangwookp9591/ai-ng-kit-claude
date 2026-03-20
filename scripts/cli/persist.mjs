#!/usr/bin/env node
/**
 * sw-kit Persistence CLI
 * Called by skills to persist plans and tasks to .sw-kit/ directories.
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

const args = process.argv.slice(2);
const command = args[0];

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

function splitPipe(str) {
  return str ? str.split('|').map(s => s.trim()).filter(Boolean) : [];
}

const projectDir = getArg('dir') || process.cwd();

try {
  let result;

  switch (command) {
    case 'plan': {
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
