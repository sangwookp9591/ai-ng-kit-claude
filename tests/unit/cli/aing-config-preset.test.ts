/**
 * Unit tests for applyProfilePreset and setConfig cache invalidation — Step 6
 * TDD: preset application, stale cache prevention
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../scripts/core/state.js', () => ({
  readStateOrDefault: vi.fn(),
  writeState: vi.fn(),
}));

vi.mock('../../../scripts/core/config.js', () => ({
  resetConfigCache: vi.fn(),
}));

import { applyProfilePreset, setConfig } from '../../../scripts/cli/aing-config.js';
import { readStateOrDefault, writeState } from '../../../scripts/core/state.js';
import { resetConfigCache } from '../../../scripts/core/config.js';

const mockReadStateOrDefault = vi.mocked(readStateOrDefault);
const mockWriteState = vi.mocked(writeState);
const mockResetConfigCache = vi.mocked(resetConfigCache);

beforeEach(() => {
  vi.clearAllMocks();
  mockReadStateOrDefault.mockReturnValue({});
  mockWriteState.mockImplementation(() => ({ ok: true }));
  mockResetConfigCache.mockImplementation(() => {});
});

// ── applyProfilePreset — valid presets ───────────────────────────────────────

describe('applyProfilePreset — valid presets', () => {
  it('returns true for "light" preset', () => {
    const result = applyProfilePreset('light');
    expect(result).toBe(true);
  });

  it('returns true for "standard" preset', () => {
    const result = applyProfilePreset('standard');
    expect(result).toBe(true);
  });

  it('returns true for "full" preset', () => {
    const result = applyProfilePreset('full');
    expect(result).toBe(true);
  });

  it('returns false for unknown preset name', () => {
    const result = applyProfilePreset('nonexistent');
    expect(result).toBe(false);
  });
});

// ── applyProfilePreset — writes correct values ────────────────────────────────

describe('applyProfilePreset — writes correct config values', () => {
  it('light preset writes costMode=budget', () => {
    applyProfilePreset('light');
    expect(mockWriteState).toHaveBeenCalled();
    const written = mockWriteState.mock.calls[0][1] as Record<string, unknown>;
    const profile = (written as any).profile;
    expect(profile.costMode).toBe('budget');
  });

  it('light preset writes maxTeamSize=2', () => {
    applyProfilePreset('light');
    const written = mockWriteState.mock.calls[0][1] as Record<string, unknown>;
    const profile = (written as any).profile;
    expect(profile.maxTeamSize).toBe(2);
  });

  it('standard preset writes costMode=balanced, maxTeamSize=4', () => {
    applyProfilePreset('standard');
    const written = mockWriteState.mock.calls[0][1] as Record<string, unknown>;
    const profile = (written as any).profile;
    expect(profile.costMode).toBe('balanced');
    expect(profile.maxTeamSize).toBe(4);
  });

  it('full preset writes costMode=quality, maxTeamSize=7', () => {
    applyProfilePreset('full');
    const written = mockWriteState.mock.calls[0][1] as Record<string, unknown>;
    const profile = (written as any).profile;
    expect(profile.costMode).toBe('quality');
    expect(profile.maxTeamSize).toBe(7);
  });
});

// ── applyProfilePreset — cache invalidation ────────────────────────────────

describe('applyProfilePreset — cache invalidation', () => {
  it('calls resetConfigCache after applying a preset', () => {
    applyProfilePreset('light');
    expect(mockResetConfigCache).toHaveBeenCalled();
  });

  it('does not call resetConfigCache for unknown preset', () => {
    applyProfilePreset('unknown');
    expect(mockResetConfigCache).not.toHaveBeenCalled();
  });
});

// ── setConfig — cache invalidation ───────────────────────────────────────────

describe('setConfig — cache invalidation', () => {
  it('calls resetConfigCache after setConfig', () => {
    setConfig('profile.costMode', 'budget');
    expect(mockResetConfigCache).toHaveBeenCalled();
  });
});
