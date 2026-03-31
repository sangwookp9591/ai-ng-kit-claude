/**
 * aing Harness Engineering — Shared Types
 * All harness modules import types from this file.
 * @module scripts/harness/harness-types
 */
export interface AgentDefinition {
    name: string;
    description: string;
    model: string;
    subagentType: string;
    filePath: string;
    role: string[];
    principles: string[];
    inputOutput: {
        input: string;
        output: string;
        format?: string;
    };
    teamProtocol?: TeamProtocol;
    errorHandling: string[];
    collaboration: string[];
    skills: string[];
}
export interface TeamProtocol {
    receives: Array<{
        from: string;
        content: string;
    }>;
    sends: Array<{
        to: string;
        content: string;
    }>;
    taskClaims: string[];
}
export interface SkillDefinition {
    name: string;
    description: string;
    triggers: string[];
    filePath: string;
    lineCount: number;
    hasReferences: boolean;
    referenceFiles: string[];
}
export type ArchitecturePattern = 'pipeline' | 'fanout' | 'expert-pool' | 'producer-reviewer' | 'supervisor' | 'hierarchical';
export type ExecutionMode = 'agent-team' | 'sub-agent';
export interface HarnessConfig {
    projectDir: string;
    agents: AgentDefinition[];
    skills: SkillDefinition[];
    pattern: ArchitecturePattern;
    executionMode: ExecutionMode;
    dataFlow: DataFlowEdge[];
    orchestrator?: SkillDefinition;
}
export interface DataFlowEdge {
    source: string;
    target: string;
    artifact: string;
    phase?: number;
    format?: string;
}
export interface ArchitectureRecommendation {
    pattern: ArchitecturePattern;
    executionMode: ExecutionMode;
    agents: AgentRecommendation[];
    teamSize: 'solo' | 'duo' | 'squad' | 'full';
    complexity: {
        score: number;
        level: string;
    };
    reasoning: string;
    dataFlow: DataFlowEdge[];
}
export interface AgentRecommendation {
    name: string;
    role: string;
    subagentType: string;
    model: string;
    skills: string[];
    required: boolean;
}
export interface HarnessBlueprint {
    recommendation: ArchitectureRecommendation;
    agentFiles: Array<{
        path: string;
        content: string;
    }>;
    skillFiles: Array<{
        path: string;
        content: string;
    }>;
    orchestratorFile: {
        path: string;
        content: string;
    };
}
export type Severity = 'error' | 'warning' | 'info';
export interface ValidationIssue {
    severity: Severity;
    category: string;
    message: string;
    file?: string;
    line?: number;
}
export interface ValidationResult {
    passed: boolean;
    score: number;
    issues: ValidationIssue[];
    summary: string;
}
export interface SimulationStep {
    phase: number;
    agent: string;
    action: 'read' | 'write' | 'send' | 'receive';
    artifact: string;
    status: 'ok' | 'mismatch' | 'missing';
    detail?: string;
}
export interface SimulationResult {
    passed: boolean;
    steps: SimulationStep[];
    warnings: string[];
    errors: string[];
    communicationGraph: Array<{
        from: string;
        to: string;
        via: string;
    }>;
}
export interface GalleryEntry {
    id: string;
    name: string;
    domain: string;
    pattern: ArchitecturePattern;
    executionMode: ExecutionMode;
    agentCount: number;
    agents: string[];
    description: string;
    keywords: string[];
    complexity: {
        min: number;
        max: number;
    };
    metrics?: {
        quality?: number;
        tokens?: number;
        duration?: number;
    };
    successCount: number;
    failCount: number;
    createdAt: string;
    source: 'builtin' | 'user';
}
export interface HarnessVersion {
    id: string;
    feature: string;
    version: number;
    config: HarnessConfig;
    metrics?: HarnessMetrics;
    createdAt: string;
}
export interface HarnessMetrics {
    quality: number;
    tokens: number;
    duration: number;
    iterations: number;
    verdict: 'PASS' | 'FAIL' | 'INCOMPLETE';
}
export interface VersionComparison {
    v1: HarnessVersion;
    v2: HarnessVersion;
    structureDiff: string[];
    metricsDelta: Partial<Record<keyof HarnessMetrics, number>>;
    verdict: 'improved' | 'regressed' | 'neutral';
}
export interface ComposedPipeline {
    stages: PipelineStage[];
    dataFlow: DataFlowEdge[];
    totalAgents: number;
}
export interface PipelineStage {
    name: string;
    harnessId: string;
    inputs: string[];
    outputs: string[];
    dependsOn: string[];
}
export interface DiagnosisResult {
    feature: string;
    status: 'healthy' | 'stalled' | 'failed' | 'unknown';
    stalledAgents: string[];
    missingArtifacts: string[];
    brokenLinks: DataFlowEdge[];
    suggestions: FixSuggestion[];
}
export interface FixSuggestion {
    type: 'restart' | 'reassign' | 'fix-path' | 'skip';
    agent?: string;
    detail: string;
    priority: 'high' | 'medium' | 'low';
}
//# sourceMappingURL=harness-types.d.ts.map