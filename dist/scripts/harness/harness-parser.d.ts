/**
 * aing Harness Parser — Parse agent/skill markdown files
 * Extracts structured data from .claude/agents/ and .claude/skills/ files.
 * @module scripts/harness/harness-parser
 */
import type { AgentDefinition, SkillDefinition, HarnessConfig, DataFlowEdge } from './harness-types.js';
export declare function parseAgentFile(filePath: string): AgentDefinition | null;
export declare function parseSkillFile(filePath: string): SkillDefinition | null;
export declare function scanHarnessDir(projectDir: string): HarnessConfig | null;
export declare function extractDataFlow(agents: AgentDefinition[]): DataFlowEdge[];
export declare function formatHarnessConfig(config: HarnessConfig): string;
//# sourceMappingURL=harness-parser.d.ts.map