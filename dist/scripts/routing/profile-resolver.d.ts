/**
 * aing Profile Resolver — Agent filtering and team composition based on profile config.
 *
 * Resolves which agents are allowed, applies pruning to fit maxTeamSize,
 * and checks token usage against configured limits.
 *
 * @module scripts/routing/profile-resolver
 */
export interface AgentsConfig {
    categories: {
        leadership: boolean;
        backend: boolean;
        frontend: boolean;
        design: boolean;
        aiml: boolean;
        special: boolean;
    };
    deny: string[];
    allow: string[];
}
export interface ProfileConfig {
    costMode: 'quality' | 'balanced' | 'budget';
    maxTeamSize: number;
    tokenLimit: number | null;
    agents: AgentsConfig;
}
export interface AgentEntry {
    name: string;
    teamRole: 'executor' | 'planner' | 'reviewer' | 'sam';
}
export declare const AGENT_CATEGORIES: Record<string, AgentEntry[]>;
export interface ResolvedProfile {
    allowedAgents: Set<string>;
    costMode: 'quality' | 'balanced' | 'budget';
    maxTeamSize: number;
    tokenLimit: number | null;
}
export interface Worker {
    name: string;
    agent: string;
    model: 'haiku' | 'sonnet' | 'opus';
    role: string;
}
/**
 * Load config and resolve a ResolvedProfile: which agents are allowed,
 * costMode, maxTeamSize, and tokenLimit.
 */
export declare function resolveProfile(projectDir?: string): ResolvedProfile;
/**
 * Determine whether an agent is allowed given the AgentsConfig.
 *
 * Logic (in order):
 * 1. allow list non-empty → only allow-listed agents pass
 * 2. deny list → deny listed agents are blocked
 * 3. categories → OR semantics: at least one active category must include this agent
 * 4. Not in AGENT_CATEGORIES → warn + fail-open (return true)
 */
export declare function isAgentAllowed(agentName: string, profile: AgentsConfig): boolean;
/**
 * Filter and prune a workers list according to the resolved profile.
 *
 * Steps:
 * 1. Apply isAgentAllowed() — sam is always protected (bypass)
 * 2. Prune to maxTeamSize: remove executors first, then planners, then reviewers
 *    - Within same priority tier, remove from the end of the array
 * 3. If zero non-sam workers remain → insert jay(executor) fallback + warn
 * 4. If zero executor workers remain → throw Error (C3 violation)
 */
export declare function filterWorkers(workers: Worker[], profile: ResolvedProfile): Worker[];
/**
 * Check whether token usage has exceeded the configured limit.
 *
 * @param tokenLimit - limit in tokens, or null to disable
 * @param projectDir - optional project directory for telemetry lookup
 */
export declare function checkTokenLimit(tokenLimit: number | null, projectDir?: string): {
    exceeded: boolean;
    usage: number;
    limit: number | null;
};
//# sourceMappingURL=profile-resolver.d.ts.map