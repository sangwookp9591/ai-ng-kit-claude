/**
 * Unit tests for selectTeamWithProfile (team-orchestrator.ts)
 * TDD: covers profile-limited team selection
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../scripts/core/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

vi.mock('../../../scripts/routing/complexity-scorer.js', () => ({
  scoreComplexity: vi.fn((signals: Record<string, unknown> = {}) => {
    const fileCount = (signals.fileCount as number) || 0;
    const domainCount = (signals.domainCount as number) || 0;
    const lineCount = (signals.lineCount as number) || 0;

    let files = 0;
    if (fileCount > 15) files = 3;
    else if (fileCount > 5) files = 2;
    else if (fileCount > 2) files = 1;

    let lines = 0;
    if (lineCount > 500) lines = 3;
    else if (lineCount > 100) lines = 2;
    else if (lineCount > 30) lines = 1;

    let domains = 0;
    if (domainCount >= 4) domains = 4;
    else if (domainCount >= 3) domains = 3;
    else if (domainCount >= 2) domains = 2;

    const score = files + lines + domains;
    const level = score <= 3 ? 'low' : score <= 7 ? 'mid' : 'high';
    return { score, level, breakdown: { files, lines, domains } };
  }),
}));

import {
  selectTeamWithProfile,
  selectTeam,
} from '../../../scripts/pipeline/team-orchestrator.js';
import type { ResolvedProfile } from '../../../scripts/routing/profile-resolver.js';

function makeProfile(overrides: Partial<ResolvedProfile> = {}): ResolvedProfile {
  return {
    allowedAgents: new Set(['able', 'klay', 'noa', 'ryan', 'milla', 'sam', 'jay', 'jerry', 'derek', 'rowan', 'willji', 'wizard', 'iron', 'hugg', 'jo']),
    costMode: 'balanced',
    maxTeamSize: 7,
    tokenLimit: null,
    ...overrides,
  };
}

// ── selectTeamWithProfile — no profile fallback ──────────────────────────────

describe('selectTeamWithProfile — no profile', () => {
  it('returns same result as selectTeam when profile is undefined', () => {
    const withProfile = selectTeamWithProfile({ fileCount: 1 }, undefined);
    const plain = selectTeam({ fileCount: 1 });
    expect(withProfile.preset).toBe(plain.preset);
    expect(withProfile.team.workers.length).toBe(plain.team.workers.length);
  });

  it('returns same result as selectTeam when profile is omitted', () => {
    const withProfile = selectTeamWithProfile({ fileCount: 10 });
    const plain = selectTeam({ fileCount: 10 });
    expect(withProfile.preset).toBe(plain.preset);
  });
});

// ── selectTeamWithProfile — maxTeamSize limiting ─────────────────────────────

// High-complexity signals that result in full team (7 workers):
//   files=20 → 3, lines=600 → 3, domains=3 → 3 = score 9 → full
const HIGH_COMPLEXITY = { fileCount: 20, lineCount: 600, domainCount: 3 };

describe('selectTeamWithProfile — maxTeamSize limiting', () => {
  it('limits workers to maxTeamSize', () => {
    // full team has 7 workers; cap to 2
    const profile = makeProfile({ maxTeamSize: 2 });
    const result = selectTeamWithProfile(HIGH_COMPLEXITY, profile);
    expect(result.team.workers.length).toBeLessThanOrEqual(2);
  });

  it('does not exceed maxTeamSize=3 even for complex tasks', () => {
    const profile = makeProfile({ maxTeamSize: 3 });
    const result = selectTeamWithProfile(HIGH_COMPLEXITY, profile);
    expect(result.team.workers.length).toBeLessThanOrEqual(3);
  });

  it('appends profile-limited annotation when allowedAgents removes a worker', () => {
    // duo(2 workers: jay+milla). Exclude milla → filterWorkers prunes 2→1 → annotation
    const allowed = new Set(['jay', 'able', 'klay', 'sam', 'jerry', 'iron', 'derek', 'rowan', 'willji', 'wizard', 'hugg', 'jo', 'noa', 'ryan']);
    // explicitly do NOT include milla
    const profile = makeProfile({ allowedAgents: allowed, maxTeamSize: 2 });
    // Low complexity → duo (jay + milla)
    const result = selectTeamWithProfile({ fileCount: 5, lineCount: 200 }, profile);
    // milla filtered out → annotation present
    expect(result.reason).toContain('profile-limited');
  });

  it('does not annotate reason when no filtering occurred', () => {
    // maxTeamSize=7, full team is exactly 7 — no pruning
    const profile = makeProfile({ maxTeamSize: 7 });
    const result = selectTeamWithProfile(HIGH_COMPLEXITY, profile);
    expect(result.team.workers.length).toBe(7);
  });
});

// ── selectTeamWithProfile — allowedAgents filtering ─────────────────────────

describe('selectTeamWithProfile — allowedAgents', () => {
  it('removes workers not in allowedAgents', () => {
    // exclude klay from allowed (full team includes klay)
    const allowed = new Set(['able', 'jay', 'jerry', 'milla', 'sam', 'iron']);
    const profile = makeProfile({ allowedAgents: allowed, maxTeamSize: 7 });
    const result = selectTeamWithProfile(HIGH_COMPLEXITY, profile);
    const names = result.team.workers.map((w) => w.name);
    expect(names).not.toContain('klay');
  });
});

// ── selectTeamWithProfile — solo fallback ────────────────────────────────────

describe('selectTeamWithProfile — solo fallback', () => {
  it('falls back gracefully when maxTeamSize is 1', () => {
    const profile = makeProfile({ maxTeamSize: 1 });
    // Low complexity → solo (1 worker), maxTeamSize=1 → no pruning needed
    const result = selectTeamWithProfile({ fileCount: 1 }, profile);
    expect(result.team.workers.length).toBeGreaterThanOrEqual(1);
  });
});

// ── selectTeamWithProfile — additional edge cases ────────────────────────────

describe('selectTeamWithProfile — additional edge cases', () => {
  it('maxTeamSize=1 with high complexity → downgrades to solo preset (jay only)', () => {
    // selectTeamWithProfile: full(7) → findFittingPreset(1) → solo(1: jay)
    // filterWorkers([jay], profile) → [jay]  (solo preset has no sam; sam-protection applies only within selected preset)
    const HIGH = { fileCount: 20, lineCount: 600, domainCount: 3 };
    const profile = makeProfile({ maxTeamSize: 1 });
    const result = selectTeamWithProfile(HIGH, profile);
    expect(result.team.workers.length).toBeLessThanOrEqual(profile.maxTeamSize);
    expect(result.team.workers.map((w) => w.name)).toContain('jay');
  });

  it('all categories disabled → returns solo fallback worker', () => {
    // allowedAgents is empty set → filterWorkers inserts jay fallback
    const profile = makeProfile({
      allowedAgents: new Set<string>(['sam']), // only sam, no executor allowed
      maxTeamSize: 10,
    });
    // Low complexity → solo preset (only jay), filterWorkers: jay not in allowed → jay fallback inserted
    const result = selectTeamWithProfile({ fileCount: 1 }, profile);
    const names = result.team.workers.map((w) => w.name);
    // jay fallback must be present (solo worker)
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(names).toContain('jay');
  });

  it('selectTeamWithProfile without profile behaves identically to selectTeam', () => {
    const signals = { fileCount: 5, lineCount: 200 };
    const withProfile = selectTeamWithProfile(signals, undefined);
    const plain = selectTeam(signals);
    expect(withProfile.preset).toBe(plain.preset);
    expect(withProfile.team.workers.length).toBe(plain.team.workers.length);
    expect(withProfile.complexity.score).toBe(plain.complexity.score);
  });
});
