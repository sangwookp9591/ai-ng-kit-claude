/**
 * aing Harness Simulator — Dry-run data flow simulation
 * Simulates agent communication and data flow before real execution.
 * @module scripts/harness/harness-simulator
 */

import { createLogger } from '../core/logger.js';
import { scanHarnessDir } from './harness-parser.js';
import type {
  HarnessConfig,
  SimulationResult,
  SimulationStep,
  DataFlowEdge,
} from './harness-types.js';

const log = createLogger('harness-simulator');

// ─── Main Simulator ─────────────────────────────────────────────

export function simulateHarness(projectDir: string): SimulationResult {
  const config = scanHarnessDir(projectDir);
  if (!config) {
    return {
      passed: false,
      steps: [],
      warnings: ['하네스를 찾을 수 없습니다.'],
      errors: ['.claude/agents/ 또는 .claude/skills/ 디렉토리가 없습니다.'],
      communicationGraph: [],
    };
  }

  const steps = simulateDataFlow(config);
  const commGraph = simulateCommunication(config);
  const errorScenarios = simulateErrors(config);

  const errors = steps.filter(s => s.status === 'missing').map(s =>
    `Phase ${s.phase}: ${s.agent}의 ${s.action} "${s.artifact}" — 소스 없음`
  );

  const warnings = [
    ...steps.filter(s => s.status === 'mismatch').map(s =>
      `Phase ${s.phase}: ${s.agent}의 ${s.action} "${s.artifact}" — ${s.detail}`
    ),
    ...errorScenarios,
  ];

  const passed = errors.length === 0;

  log.info('Simulation complete', { passed, steps: steps.length, errors: errors.length });
  return { passed, steps, warnings, errors, communicationGraph: commGraph };
}

// ─── Data Flow Simulation ───────────────────────────────────────

function simulateDataFlow(config: HarnessConfig): SimulationStep[] {
  const steps: SimulationStep[] = [];
  const agentOutputs = new Map<string, Set<string>>(); // agent → produced artifacts
  const agentNames = new Set(config.agents.map(a => a.name));

  // Initialize: each agent can produce their output
  for (const agent of config.agents) {
    const outputs = new Set<string>();
    if (agent.inputOutput.output) {
      const match = agent.inputOutput.output.match(/[`"']([\w/.{}_-]+\.\w+)[`"']/);
      if (match) outputs.add(match[1]);
    }
    agentOutputs.set(agent.name, outputs);
  }

  // Group edges by phase
  const phaseEdges = groupEdgesByPhase(config.dataFlow);

  for (const [phase, edges] of phaseEdges) {
    for (const edge of edges) {
      // Write step (source produces artifact)
      if (edge.source !== 'input' && agentNames.has(edge.source)) {
        const sourceOutputs = agentOutputs.get(edge.source) || new Set();
        sourceOutputs.add(edge.artifact);
        agentOutputs.set(edge.source, sourceOutputs);

        steps.push({
          phase,
          agent: edge.source,
          action: 'write',
          artifact: edge.artifact,
          status: 'ok',
        });
      }

      // Read step (target consumes artifact)
      if (edge.target !== 'output' && edge.target !== 'integrator' && edge.target !== 'workers') {
        const available = isArtifactAvailable(edge.artifact, edge.source, agentOutputs);

        steps.push({
          phase,
          agent: edge.target,
          action: 'read',
          artifact: edge.artifact,
          status: available ? 'ok' : 'missing',
          detail: available ? undefined : `"${edge.artifact}"이 Phase ${phase} 시점에 아직 생성되지 않았습니다.`,
        });
      }
    }
  }

  // Check for filename mismatches
  for (const agent of config.agents) {
    if (!agent.inputOutput.input || !agent.inputOutput.output) continue;

    const inputMatch = agent.inputOutput.input.match(/[`"']([\w/.{}_-]+\.\w+)[`"']/);
    const outputMatch = agent.inputOutput.output.match(/[`"']([\w/.{}_-]+\.\w+)[`"']/);

    if (inputMatch && outputMatch) {
      // Check if any other agent's output matches this agent's input
      const inputFile = inputMatch[1];
      let found = false;
      for (const other of config.agents) {
        if (other.name === agent.name) continue;
        const otherOutput = other.inputOutput.output?.match(/[`"']([\w/.{}_-]+\.\w+)[`"']/);
        if (otherOutput && otherOutput[1] === inputFile) {
          found = true;
          break;
        }
      }

      if (!found && inputFile !== 'task_description') {
        steps.push({
          phase: 0,
          agent: agent.name,
          action: 'read',
          artifact: inputFile,
          status: 'mismatch',
          detail: `입력 파일 "${inputFile}"을 생성하는 에이전트가 없습니다.`,
        });
      }
    }
  }

  return steps;
}

function isArtifactAvailable(artifact: string, source: string, outputs: Map<string, Set<string>>): boolean {
  if (source === 'input') return true;
  const sourceOutputs = outputs.get(source);
  if (!sourceOutputs) return false;
  return sourceOutputs.has(artifact) || sourceOutputs.size > 0; // Generous: if agent has any output
}

function groupEdgesByPhase(edges: DataFlowEdge[]): Map<number, DataFlowEdge[]> {
  const grouped = new Map<number, DataFlowEdge[]>();
  for (const edge of edges) {
    const phase = edge.phase || 1;
    if (!grouped.has(phase)) grouped.set(phase, []);
    grouped.get(phase)!.push(edge);
  }
  // Sort by phase
  return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]));
}

// ─── Communication Simulation ───────────────────────────────────

function simulateCommunication(config: HarnessConfig): Array<{ from: string; to: string; via: string }> {
  const graph: Array<{ from: string; to: string; via: string }> = [];

  for (const agent of config.agents) {
    if (!agent.teamProtocol) continue;

    for (const send of agent.teamProtocol.sends) {
      graph.push({ from: agent.name, to: send.to, via: 'SendMessage' });
    }
  }

  // Add data flow edges as file-based communication
  for (const edge of config.dataFlow) {
    if (edge.format === 'message') continue; // Already in graph
    if (edge.source !== 'input' && edge.target !== 'output' && edge.target !== 'integrator') {
      graph.push({ from: edge.source, to: edge.target, via: `File: ${edge.artifact}` });
    }
  }

  return graph;
}

// ─── Error Scenario Simulation ──────────────────────────────────

function simulateErrors(config: HarnessConfig): string[] {
  const warnings: string[] = [];
  const agentCount = config.agents.length;

  // Single point of failure
  for (const agent of config.agents) {
    const dependents = config.dataFlow.filter(e => e.source === agent.name).length;
    if (dependents >= agentCount - 1) {
      warnings.push(`${agent.name}: ${dependents}개 에이전트가 의존 — 실패 시 전체 영향. 폴백 전략 필요.`);
    }
  }

  // Check for retry/fallback mentions
  for (const agent of config.agents) {
    if (!agent.errorHandling.length) {
      warnings.push(`${agent.name}: 에러 핸들링 정의 없음 — 실패 시 행동이 불분명합니다.`);
    }
  }

  // Broadcast overuse
  for (const agent of config.agents) {
    if (!agent.teamProtocol) continue;
    const broadcasts = agent.teamProtocol.sends.filter(s => s.to === 'all').length;
    if (broadcasts > 2) {
      warnings.push(`${agent.name}: 브로드캐스트 ${broadcasts}회 — 비용이 높습니다. 타겟 메시지를 권장합니다.`);
    }
  }

  return warnings;
}

// ─── Display ────────────────────────────────────────────────────

export function formatSimulation(result: SimulationResult): string {
  const icon = result.passed ? '✓' : '✗';
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `  aing harness sim: ${icon} 시뮬레이션 결과`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
  ];

  // Group steps by phase
  const phases = new Map<number, SimulationStep[]>();
  for (const step of result.steps) {
    if (!phases.has(step.phase)) phases.set(step.phase, []);
    phases.get(step.phase)!.push(step);
  }

  for (const [phase, steps] of [...phases.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`  Phase ${phase}:`);
    for (const step of steps) {
      const statusIcon = step.status === 'ok' ? '✓' : step.status === 'mismatch' ? '~' : '✗';
      const arrow = step.action === 'write' ? '→' : '←';
      lines.push(`    ${statusIcon} ${step.agent} ${arrow} ${step.artifact}${step.detail ? ` — ${step.detail}` : ''}`);
    }
    lines.push('');
  }

  if (result.communicationGraph.length) {
    lines.push('  Communication Graph:');
    for (const edge of result.communicationGraph.slice(0, 10)) {
      lines.push(`    ${edge.from} → ${edge.to} (${edge.via})`);
    }
    if (result.communicationGraph.length > 10) {
      lines.push(`    ... +${result.communicationGraph.length - 10} more`);
    }
    lines.push('');
  }

  if (result.errors.length) {
    lines.push('  Errors:');
    for (const e of result.errors) lines.push(`    [E] ${e}`);
    lines.push('');
  }

  if (result.warnings.length) {
    lines.push('  Warnings:');
    for (const w of result.warnings) lines.push(`    [W] ${w}`);
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}
