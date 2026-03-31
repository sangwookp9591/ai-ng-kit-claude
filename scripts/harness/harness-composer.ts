/**
 * aing Harness Composer — Multi-harness pipeline composition
 * Chains multiple harnesses into sequential/parallel pipelines.
 * @module scripts/harness/harness-composer
 */

import { createLogger } from '../core/logger.js';
import { sanitizeFeature } from '../core/path-utils.js';
import type {
  ComposedPipeline,
  PipelineStage,
  DataFlowEdge,
} from './harness-types.js';

const log = createLogger('harness-composer');

// ─── Parse Composition String ───────────────────────────────────

/**
 * Parse "research → design → build → qa" into stage names.
 */
export function parseCompositionString(input: string): string[] {
  return input
    .split(/→|->|>>/)
    .map(s => s.trim())
    .filter(Boolean);
}

// ─── Compose Pipeline ───────────────────────────────────────────

export function composeHarnesses(stageNames: string[]): ComposedPipeline {
  if (stageNames.length < 2) {
    log.warn('Composition requires at least 2 stages');
    return { stages: [], dataFlow: [], totalAgents: 0 };
  }

  const stages: PipelineStage[] = [];
  const dataFlow: DataFlowEdge[] = [];
  let totalAgents = 0;

  for (let i = 0; i < stageNames.length; i++) {
    const name = stageNames[i];
    const prevName = i > 0 ? stageNames[i - 1] : null;
    const prevOutput = prevName ? `_workspace/${sanitizeFeature(prevName)}_output/` : null;

    const stage: PipelineStage = {
      name,
      harnessId: sanitizeFeature(name),
      inputs: prevOutput ? [prevOutput] : ['user_input'],
      outputs: [`_workspace/${sanitizeFeature(name)}_output/`],
      dependsOn: prevName ? [prevName] : [],
    };

    stages.push(stage);
    totalAgents += estimateAgentCount(name);

    // Data flow edge
    if (prevName) {
      dataFlow.push({
        source: prevName,
        target: name,
        artifact: prevOutput!,
        phase: i + 1,
      });
    }
  }

  log.info('Pipeline composed', { stages: stageNames.length, totalAgents });
  return { stages, dataFlow, totalAgents };
}

function estimateAgentCount(stageName: string): number {
  const lower = stageName.toLowerCase();
  if (/research|리서치|조사/.test(lower)) return 4;
  if (/review|리뷰/.test(lower)) return 3;
  if (/build|빌드|구현/.test(lower)) return 3;
  if (/qa|테스트|test/.test(lower)) return 2;
  if (/design|설계/.test(lower)) return 2;
  return 2; // default
}

// ─── Validate Composition ───────────────────────────────────────

export function validateComposition(pipeline: ComposedPipeline): string[] {
  const errors: string[] = [];

  if (pipeline.stages.length < 2) {
    errors.push('파이프라인에 최소 2개 스테이지가 필요합니다.');
  }

  // Check for duplicate names
  const names = pipeline.stages.map(s => s.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length) {
    errors.push(`중복 스테이지: ${dupes.join(', ')}`);
  }

  // Check dependencies are valid
  for (const stage of pipeline.stages) {
    for (const dep of stage.dependsOn) {
      if (!names.includes(dep)) {
        errors.push(`${stage.name}: 의존 스테이지 "${dep}"이 존재하지 않습니다.`);
      }
    }
  }

  // Check for cycles
  if (hasCycle(pipeline.stages)) {
    errors.push('순환 의존성이 감지되었습니다.');
  }

  return errors;
}

function hasCycle(stages: PipelineStage[]): boolean {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(name: string): boolean {
    if (inStack.has(name)) return true;
    if (visited.has(name)) return false;
    visited.add(name);
    inStack.add(name);

    const stage = stages.find(s => s.name === name);
    if (stage) {
      for (const dep of stage.dependsOn) {
        if (dfs(dep)) return true;
      }
    }
    inStack.delete(name);
    return false;
  }

  return stages.some(s => dfs(s.name));
}

// ─── Execution Plan ─────────────────────────────────────────────

export interface ExecutionPlan {
  waves: string[][]; // groups of stages that can run in parallel
  totalStages: number;
  estimatedAgents: number;
}

export function buildExecutionPlan(pipeline: ComposedPipeline): ExecutionPlan {
  const waves: string[][] = [];
  const completed = new Set<string>();

  while (completed.size < pipeline.stages.length) {
    const wave: string[] = [];
    for (const stage of pipeline.stages) {
      if (completed.has(stage.name)) continue;
      if (stage.dependsOn.every(d => completed.has(d))) {
        wave.push(stage.name);
      }
    }
    if (wave.length === 0) break; // stuck (cycle or missing dep)
    for (const name of wave) completed.add(name);
    waves.push(wave);
  }

  return {
    waves,
    totalStages: pipeline.stages.length,
    estimatedAgents: pipeline.totalAgents,
  };
}

// ─── Display ────────────────────────────────────────────────────

export function formatComposition(pipeline: ComposedPipeline): string {
  const plan = buildExecutionPlan(pipeline);
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '  aing harness chain: 파이프라인 구성',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `  스테이지: ${plan.totalStages}개 | 에이전트: ~${plan.estimatedAgents}명`,
    '',
  ];

  for (let i = 0; i < plan.waves.length; i++) {
    const wave = plan.waves[i];
    const parallel = wave.length > 1 ? ' (병렬)' : '';
    lines.push(`  Wave ${i + 1}${parallel}:`);
    for (const name of wave) {
      const stage = pipeline.stages.find(s => s.name === name)!;
      const input = stage.inputs.join(', ');
      const output = stage.outputs.join(', ');
      lines.push(`    [${name}] ← ${input} → ${output}`);
    }
    if (i < plan.waves.length - 1) lines.push('        ↓');
  }

  // Data flow visualization
  lines.push('');
  lines.push('  Flow: ' + pipeline.stages.map(s => s.name).join(' → '));

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}
