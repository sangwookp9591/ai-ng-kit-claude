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

import { createPlan, listPlans } from '../task/plan-manager.js';
import { createTask, listTasks, formatAllTasks } from '../task/task-manager.js';
import { generateReport } from '../evidence/evidence-report.js';
import { readStdinRaw } from '../core/stdin.js';
import { checkQualityGate } from '../hooks/quality-gate.js';

const args: string[] = process.argv.slice(2);
const command: string = args[0];
const useStdin: boolean = args.includes('--stdin');

function getArg(name: string): string | null {
  const idx = args.indexOf(`--${name}`);
  if (idx < 0 || !args[idx + 1]) return null;
  // Reject values that look like flags (e.g., --goal when expecting a value)
  if (args[idx + 1].startsWith('--')) return null;
  return args[idx + 1];
}

function splitPipe(str: string | null): string[] {
  return str ? str.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
}

const projectDir: string = getArg('dir') || process.cwd();

interface PlanStdinData {
  feature: string;
  goal: string;
  steps: string[];
  acceptanceCriteria?: string[];
  risks?: string[];
  options?: Array<{ name: string; pros: string[]; cons: string[] }>;
  reviewNotes?: Array<{ reviewer: string; verdict: string; highlights: string[] }>;
  complexityScore?: number;
  complexityLevel?: string;
  // AING-DR fields
  constraints?: Array<{ name: string; source: string; evidence: string; violationImpact: string }>;
  preferences?: Array<{ name: string; priority: string; tradeoffThreshold: string; why: string }>;
  drivers?: Array<{ name: string; status: string; source?: string }>;
  steelman?: { antithesis: string; tradeoffs: string[]; newDrivers: string[]; synthesisPath: string | null };
  noaVerdict?: { verdict: string; absorbed: number; rebutted: number; acknowledged: number; ignored: number; reflectionScore: number; deltaScore: number | null; confidence: string };
  criticVerdict?: { verdict: string; mode: string; critical: number; major: number; minor: number; selfAuditDowngrades: number; constraintCompliance: string; criteriaTestability: string; evidenceCoverage: string };
  adr?: { decision: string; confidence: string; constraintsHonored: string[]; alternativesRejected: string[]; consequences: { positive: string[]; negative: string[] } };
}

(async () => {
try {
  let result: unknown;

  switch (command) {
    case 'plan': {
      if (useStdin) {
        let data: PlanStdinData;
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

        // Quality Gate check (if AING-DR fields present)
        if (data.noaVerdict || data.criticVerdict) {
          const planText = [
            `## Steps`,
            ...steps.map(s => `- ${s}`),
            `## Risks`,
            ...(data.risks || []).map(r => `- ${r}`),
          ].join('\n');
          const qg = checkQualityGate(
            planText,
            data as unknown as Record<string, unknown>,
            data.criticVerdict ? JSON.stringify(data.criticVerdict) : '',
            data.noaVerdict ? JSON.stringify(data.noaVerdict) : ''
          );
          if (!qg.pass) {
            console.error(`[aing:quality-gate] FAIL — ${qg.failures.join('; ')}`);
            // Continue with save but emit warning (non-blocking — Critic already gated)
          }
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
          // AING-DR fields pass-through
          constraints: Array.isArray(data.constraints) && data.constraints.length > 0 ? data.constraints : undefined,
          preferences: Array.isArray(data.preferences) && data.preferences.length > 0 ? data.preferences : undefined,
          drivers: Array.isArray(data.drivers) && data.drivers.length > 0 ? data.drivers : undefined,
          steelman: data.steelman || undefined,
          noaVerdict: data.noaVerdict || undefined,
          criticVerdict: data.criticVerdict || undefined,
          adr: data.adr || undefined,
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
        subtasks: subtasks.map((s: string) => ({ title: s }))
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
} catch (err: unknown) {
  console.log(JSON.stringify({ ok: false, error: (err as Error).message }));
  process.exit(1);
}
})();
