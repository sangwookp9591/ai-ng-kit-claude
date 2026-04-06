/**
 * aing Profile Resolver — Agent filtering and team composition based on profile config.
 *
 * Resolves which agents are allowed, applies pruning to fit maxTeamSize,
 * and checks token usage against configured limits.
 *
 * @module scripts/routing/profile-resolver
 */

import { loadConfig } from '../core/config.js';
import type { AgentsConfig, ProfileConfig } from '../core/config.js';
import { checkSessionTokenLimit } from '../telemetry/token-tracker.js';

// Re-export types for consumers that import from profile-resolver
export type { AgentsConfig, ProfileConfig };

// ---------------------------------------------------------------------------
// AGENT_CATEGORIES — single source of truth for agent-to-category mapping
// ---------------------------------------------------------------------------

export interface AgentEntry {
  name: string;
  teamRole: 'executor' | 'planner' | 'reviewer' | 'sam';
}

export const AGENT_CATEGORIES: Record<string, AgentEntry[]> = {
  leadership: [
    { name: 'able',  teamRole: 'planner'  },
    { name: 'klay',  teamRole: 'planner'  },
    { name: 'noa', teamRole: 'reviewer' },
    { name: 'ryan',  teamRole: 'planner'  },
    { name: 'milla', teamRole: 'reviewer' },
    { name: 'sam',   teamRole: 'sam'      },
  ],
  backend: [
    { name: 'jay',    teamRole: 'executor' },
    { name: 'jerry',  teamRole: 'executor' },
    { name: 'derek',  teamRole: 'executor' },
    { name: 'rowan',  teamRole: 'executor' },
    { name: 'willji', teamRole: 'executor' },
    { name: 'wizard', teamRole: 'executor' },
  ],
  frontend: [
    { name: 'iron',   teamRole: 'executor' },
    { name: 'derek',  teamRole: 'executor' },
    { name: 'willji', teamRole: 'executor' },
  ],
  design: [
    { name: 'derek',  teamRole: 'executor' },
  ],
  aiml: [
    { name: 'hugg', teamRole: 'executor' },
    { name: 'jo',   teamRole: 'executor' },
  ],
  special: [
    { name: 'sam',   teamRole: 'sam'      },
    { name: 'milla', teamRole: 'reviewer' },
    { name: 'noa', teamRole: 'reviewer' },
  ],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolvedProfile {
  allowedAgents: Set<string>;
  costMode: 'quality' | 'balanced' | 'budget';
  maxTeamSize: number;
  tokenLimit: number | null;
}

export interface Worker {
  name: string;
  agent: string;  // executor | planner | reviewer | sam
  model: 'haiku' | 'sonnet' | 'opus';
  role: string;
}

// Internal: agent name -> all team roles from all categories it belongs to
type TeamRole = 'executor' | 'planner' | 'reviewer' | 'sam';

// Pruning priority: higher number = removed first
const PRUNING_PRIORITY: Record<TeamRole, number> = {
  sam:      0,
  reviewer: 1,
  planner:  2,
  executor: 3,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a map of agentName -> Set<categoryName> from AGENT_CATEGORIES.
 */
function buildAgentCategoryMap(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const [category, entries] of Object.entries(AGENT_CATEGORIES)) {
    for (const entry of entries) {
      if (!map.has(entry.name)) {
        map.set(entry.name, new Set());
      }
      map.get(entry.name)!.add(category);
    }
  }
  return map;
}

const AGENT_CATEGORY_MAP = buildAgentCategoryMap();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load config and resolve a ResolvedProfile: which agents are allowed,
 * costMode, maxTeamSize, and tokenLimit.
 */
export function resolveProfile(projectDir?: string): ResolvedProfile {
  const config = loadConfig(projectDir);
  const profile = config.profile;
  const agents = profile.agents;

  // Collect all known agent names
  const allAgentNames = new Set<string>();
  for (const entries of Object.values(AGENT_CATEGORIES)) {
    for (const entry of entries) {
      allAgentNames.add(entry.name);
    }
  }

  // Build allowedAgents set
  const allowedAgents = new Set<string>();
  for (const name of allAgentNames) {
    if (isAgentAllowed(name, agents)) {
      allowedAgents.add(name);
    }
  }

  return {
    allowedAgents,
    costMode: profile.costMode,
    maxTeamSize: profile.maxTeamSize,
    tokenLimit: profile.tokenLimit,
  };
}

/**
 * Determine whether an agent is allowed given the AgentsConfig.
 *
 * Logic (in order):
 * 1. allow list non-empty → only allow-listed agents pass
 * 2. deny list → deny listed agents are blocked
 * 3. categories → OR semantics: at least one active category must include this agent
 * 4. Not in AGENT_CATEGORIES → warn + fail-open (return true)
 */
export function isAgentAllowed(
  agentName: string,
  profile: AgentsConfig
): boolean {
  // 1. allow list takes precedence
  if (profile.allow.length > 0) {
    return profile.allow.includes(agentName);
  }

  // 2. deny list
  if (profile.deny.includes(agentName)) {
    return false;
  }

  // 3. category check
  const agentCategories = AGENT_CATEGORY_MAP.get(agentName);
  if (!agentCategories) {
    // 4. unknown agent — fail-open
    console.warn(`[profile-resolver] Unknown agent "${agentName}" not in AGENT_CATEGORIES — allowing (fail-open)`);
    return true;
  }

  // OR semantics: allowed if at least one of its categories is enabled
  for (const category of agentCategories) {
    const catKey = category as keyof typeof profile.categories;
    if (profile.categories[catKey] === true) {
      return true;
    }
  }

  return false;
}

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
export function filterWorkers(
  workers: Worker[],
  profile: ResolvedProfile
): Worker[] {
  const { allowedAgents, maxTeamSize } = profile;

  // Step 1: filter by allowed (sam always passes)
  let filtered = workers.filter(
    (w) => w.agent === 'sam' || allowedAgents.has(w.name)
  );

  // Step 2: pruning — sort by priority descending (executor=3 removed first)
  // Keep within maxTeamSize; sam is protected (never removed)
  if (filtered.length > maxTeamSize) {
    // Separate sam workers from prunable workers
    const samWorkers = filtered.filter((w) => w.agent === 'sam');
    const prunable = filtered.filter((w) => w.agent !== 'sam');

    // Sort prunable by PRUNING_PRIORITY descending (highest number = removed first)
    // Stable sort: higher priority (numerically) removed first; within same priority, last in array removed first
    // We reverse-stable-sort then slice
    const indexed = prunable.map((w, i) => ({ w, i }));
    indexed.sort((a, b) => {
      const pa = PRUNING_PRIORITY[a.w.agent as TeamRole] ?? PRUNING_PRIORITY.executor;
      const pb = PRUNING_PRIORITY[b.w.agent as TeamRole] ?? PRUNING_PRIORITY.executor;
      if (pa !== pb) return pb - pa; // higher priority number first (will be trimmed)
      return b.i - a.i; // among equal, later index first (will be trimmed)
    });

    const targetPrunableCount = Math.max(0, maxTeamSize - samWorkers.length);
    // Keep the last targetPrunableCount from the sorted list (they have lowest pruning priority)
    const kept = indexed.slice(indexed.length - targetPrunableCount).map((x) => x.w);

    // Reconstruct in original order
    const keptSet = new Set(kept);
    filtered = [...samWorkers, ...prunable.filter((w) => keptSet.has(w))];
  }

  // Step 3: 0 non-sam workers → jay fallback
  const nonSam = filtered.filter((w) => w.agent !== 'sam');
  if (nonSam.length === 0) {
    console.warn(
      '[profile-resolver] No workers remain after filtering. Inserting jay(executor) fallback.'
    );
    filtered.push({ name: 'jay', agent: 'executor', model: 'sonnet', role: 'backend' });
  }

  // Step 4: no executor workers → C3 violation
  const executors = filtered.filter((w) => w.agent === 'executor');
  if (executors.length === 0) {
    throw new Error(
      '[profile-resolver] C3 violation: no executor workers in team. At least one executor is required.'
    );
  }

  return filtered;
}

/**
 * Check whether token usage has exceeded the configured limit.
 * Delegates to token-tracker's checkSessionTokenLimit (single source of truth).
 */
export function checkTokenLimit(
  tokenLimit: number | null,
  projectDir?: string
): { exceeded: boolean; usage: number; limit: number | null } {
  return checkSessionTokenLimit(tokenLimit, projectDir);
}
