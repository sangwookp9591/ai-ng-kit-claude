/**
 * Unit tests for scripts/routing/profile-resolver.ts
 * TDD: RED phase — tests written before implementation.
 * Covers: resolveProfile, isAgentAllowed, filterWorkers, checkTokenLimit
 */
import { describe, it, expect, vi } from 'vitest';

import {
  resolveProfile,
  isAgentAllowed,
  filterWorkers,
  checkTokenLimit,
  AGENT_CATEGORIES,
} from '../../../scripts/routing/profile-resolver.js';

import type { AgentsConfig } from '../../../scripts/routing/profile-resolver.js';

import { TEAM_PRESETS } from '../../../scripts/pipeline/team-orchestrator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAgents(overrides: Partial<AgentsConfig> = {}): AgentsConfig {
  return {
    categories: {
      leadership: true,
      backend: true,
      frontend: true,
      design: true,
      aiml: true,
      special: true,
      ...overrides.categories,
    },
    deny: overrides.deny ?? [],
    allow: overrides.allow ?? [],
  };
}

function makeWorker(name: string, agent: string = 'executor', model: 'haiku' | 'sonnet' | 'opus' = 'sonnet', role = 'dev') {
  return { name, agent, model, role };
}

// ---------------------------------------------------------------------------
// AGENT_CATEGORIES
// ---------------------------------------------------------------------------
describe('AGENT_CATEGORIES', () => {
  it('exports a non-empty map with expected categories', () => {
    expect(AGENT_CATEGORIES).toBeDefined();
    expect(Object.keys(AGENT_CATEGORIES)).toEqual(
      expect.arrayContaining(['leadership', 'backend', 'frontend', 'design', 'aiml', 'special'])
    );
  });

  it('leadership category includes sam with teamRole sam', () => {
    const samEntry = AGENT_CATEGORIES['leadership'].find((e) => e.name === 'sam');
    expect(samEntry).toBeDefined();
    expect(samEntry?.teamRole).toBe('sam');
  });

  it('backend category includes jay with teamRole executor', () => {
    const jayEntry = AGENT_CATEGORIES['backend'].find((e) => e.name === 'jay');
    expect(jayEntry).toBeDefined();
    expect(jayEntry?.teamRole).toBe('executor');
  });
});

// ---------------------------------------------------------------------------
// resolveProfile
// ---------------------------------------------------------------------------
describe('resolveProfile', () => {
  it('returns a ResolvedProfile with defaults from default config', () => {
    const profile = resolveProfile();
    expect(profile).toHaveProperty('allowedAgents');
    expect(profile).toHaveProperty('costMode');
    expect(profile).toHaveProperty('maxTeamSize');
    expect(profile).toHaveProperty('tokenLimit');
  });

  it('allows all known agents when all categories are true', () => {
    const profile = resolveProfile();
    // jay is in backend (default true)
    expect(profile.allowedAgents.has('jay')).toBe(true);
    // klay is in leadership (default true)
    expect(profile.allowedAgents.has('klay')).toBe(true);
  });

  it('returns tokenLimit null by default', () => {
    const profile = resolveProfile();
    expect(profile.tokenLimit).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isAgentAllowed
// ---------------------------------------------------------------------------
describe('isAgentAllowed — deny list', () => {
  it('returns false when agent is in deny list', () => {
    const agents = makeAgents({ deny: ['klay'] });
    expect(isAgentAllowed('klay', agents)).toBe(false);
  });

  it('returns true for agent not in deny list with all categories enabled', () => {
    const agents = makeAgents({ deny: ['klay'] });
    expect(isAgentAllowed('jay', agents)).toBe(true);
  });
});

describe('isAgentAllowed — allow list (non-empty)', () => {
  it('returns true only for agents in allow list', () => {
    const agents = makeAgents({ allow: ['jay', 'klay'] });
    expect(isAgentAllowed('jay', agents)).toBe(true);
    expect(isAgentAllowed('klay', agents)).toBe(true);
  });

  it('returns false for agent not in allow list even if category is enabled', () => {
    const agents = makeAgents({ allow: ['jay'] });
    expect(isAgentAllowed('jerry', agents)).toBe(false);
  });
});

describe('isAgentAllowed — category filtering', () => {
  it('blocks agent whose only category is disabled', () => {
    const agents = makeAgents({ categories: { aiml: false } as any });
    // hugg is only in aiml
    expect(isAgentAllowed('hugg', agents)).toBe(false);
  });

  it('allows agent when at least one of its categories is enabled (OR semantics)', () => {
    // derek is in frontend, backend, design
    const agents = makeAgents({
      categories: { frontend: false, backend: true, design: false } as any,
    });
    expect(isAgentAllowed('derek', agents)).toBe(true);
  });

  it('blocks derek when all its categories are disabled', () => {
    const agents = makeAgents({
      categories: { frontend: false, backend: false, design: false } as any,
    });
    expect(isAgentAllowed('derek', agents)).toBe(false);
  });
});

describe('isAgentAllowed — unknown agent (fail-open)', () => {
  it('warns and returns true for agent not in AGENT_CATEGORIES', () => {
    const agents = makeAgents();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = isAgentAllowed('unknown-agent-xyz', agents);
    expect(result).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// filterWorkers
// ---------------------------------------------------------------------------
describe('filterWorkers — basic filtering', () => {
  it('removes workers whose agent name is denied', () => {
    const profile = {
      allowedAgents: new Set(['jay', 'klay']),
      costMode: 'balanced' as const,
      maxTeamSize: 10,
      tokenLimit: null,
    };
    const workers = [makeWorker('jay'), makeWorker('klay'), makeWorker('hugg')];
    const result = filterWorkers(workers, profile);
    const names = result.map((w) => w.name);
    expect(names).toContain('jay');
    expect(names).toContain('klay');
    expect(names).not.toContain('hugg');
  });

  it('sam is always included regardless of allowedAgents (protected)', () => {
    const profile = {
      allowedAgents: new Set<string>(), // sam not in allowed set
      costMode: 'balanced' as const,
      maxTeamSize: 10,
      tokenLimit: null,
    };
    const workers = [makeWorker('sam', 'sam')];
    const result = filterWorkers(workers, profile);
    expect(result.map((w) => w.name)).toContain('sam');
  });
});

describe('filterWorkers — maxTeamSize pruning', () => {
  it('prunes executor-role workers first when over maxTeamSize', () => {
    const profile = {
      allowedAgents: new Set(['sam', 'klay', 'jay', 'jerry', 'derek']),
      costMode: 'balanced' as const,
      maxTeamSize: 3,
      tokenLimit: null,
    };
    // sam(sam), klay(planner), jay(executor), jerry(executor), derek(executor)
    const workers = [
      makeWorker('sam', 'sam'),
      makeWorker('klay', 'planner'),
      makeWorker('jay', 'executor'),
      makeWorker('jerry', 'executor'),
      makeWorker('derek', 'executor'),
    ];
    const result = filterWorkers(workers, profile);
    expect(result.length).toBeLessThanOrEqual(3);
    // sam must survive (protected)
    expect(result.map((w) => w.name)).toContain('sam');
    // planner (klay) should survive over executors
    expect(result.map((w) => w.name)).toContain('klay');
  });

  it('sam is included even when maxTeamSize is 1', () => {
    const profile = {
      allowedAgents: new Set(['sam', 'jay']),
      costMode: 'balanced' as const,
      maxTeamSize: 1,
      tokenLimit: null,
    };
    const workers = [makeWorker('sam', 'sam'), makeWorker('jay', 'executor')];
    const result = filterWorkers(workers, profile);
    expect(result.map((w) => w.name)).toContain('sam');
  });
});

describe('filterWorkers — fallback and error cases', () => {
  it('throws Error when no executor workers remain after filtering', () => {
    const profile = {
      allowedAgents: new Set(['sam', 'klay']), // no executor allowed
      costMode: 'balanced' as const,
      maxTeamSize: 10,
      tokenLimit: null,
    };
    // sam + planner only; no executor
    const workers = [makeWorker('sam', 'sam'), makeWorker('klay', 'planner')];
    expect(() => filterWorkers(workers, profile)).toThrow();
  });

  it('adds jay fallback with warning when non-sam workers are all filtered out', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const profile = {
      allowedAgents: new Set(['sam']), // only sam allowed by categories
      costMode: 'balanced' as const,
      maxTeamSize: 10,
      tokenLimit: null,
    };
    const workers = [makeWorker('sam', 'sam')];
    const result = filterWorkers(workers, profile);
    const names = result.map((w) => w.name);
    // jay fallback should be inserted
    expect(names).toContain('jay');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// checkTokenLimit
// ---------------------------------------------------------------------------
describe('checkTokenLimit', () => {
  it('returns exceeded=false when limit is null', () => {
    const result = checkTokenLimit(null);
    expect(result.exceeded).toBe(false);
    expect(result.limit).toBeNull();
  });

  it('returns exceeded=false when usage is below limit', () => {
    // Token tracker returns 0 when no telemetry file exists
    const result = checkTokenLimit(999999);
    expect(result.exceeded).toBe(false);
  });

  it('returns correct limit value', () => {
    const result = checkTokenLimit(5000);
    expect(result.limit).toBe(5000);
    expect(typeof result.usage).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Consistency: AGENT_CATEGORIES ↔ TEAM_PRESETS
// ---------------------------------------------------------------------------
describe('AGENT_CATEGORIES ↔ TEAM_PRESETS consistency', () => {
  // Flatten all agent names registered in AGENT_CATEGORIES
  const allKnownAgents = new Set<string>(
    Object.values(AGENT_CATEGORIES).flatMap((entries) => entries.map((e) => e.name))
  );

  // Flatten all worker names registered in TEAM_PRESETS
  const allPresetWorkerNames = Object.values(TEAM_PRESETS).flatMap((preset) =>
    preset.workers.map((w) => w.name)
  );

  it('every TEAM_PRESETS worker.name is a known agent in AGENT_CATEGORIES', () => {
    for (const workerName of allPresetWorkerNames) {
      expect(allKnownAgents.has(workerName)).toBe(true);
    }
  });

  it('every AGENT_CATEGORIES entry has a valid teamRole (executor|planner|reviewer|sam)', () => {
    const validRoles = new Set(['executor', 'planner', 'reviewer', 'sam']);
    for (const [, entries] of Object.entries(AGENT_CATEGORIES)) {
      for (const entry of entries) {
        expect(validRoles.has(entry.teamRole)).toBe(true);
      }
    }
  });
});
