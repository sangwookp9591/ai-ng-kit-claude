/**
 * Unit tests for scripts/core/config.ts
 * Covers: loadConfig, getConfig, resetConfigCache, deepMerge behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the state module that config depends on
vi.mock('../../../scripts/core/state.js', () => ({
  readState: vi.fn(),
  readStateOrDefault: vi.fn(),
  writeState: vi.fn(),
}));

import { loadConfig, getConfig, resetConfigCache } from '../../../scripts/core/config.js';
import { readState } from '../../../scripts/core/state.js';

const mockReadState = vi.mocked(readState);

beforeEach(() => {
  vi.clearAllMocks();
  resetConfigCache();
});

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------
describe('loadConfig', () => {
  it('returns defaults when config file is missing', () => {
    mockReadState.mockReturnValue({ ok: false, error: 'File not found' });

    const config = loadConfig('/tmp/project');

    expect(config.pdca.stages).toEqual(['plan', 'do', 'check', 'act', 'review']);
    expect(config.pdca.automationLevel).toBe('semi-auto');
    expect(config.context.maxSessionStartTokens).toBe(2000);
    expect(config.routing.modelMap).toEqual({ low: 'haiku', mid: 'sonnet', high: 'opus' });
    expect(config.recovery.circuitBreakerThreshold).toBe(3);
    expect(config.i18n.defaultLocale).toBe('ko');
  });

  it('deep-merges user config over defaults', () => {
    mockReadState.mockReturnValue({
      ok: true,
      data: {
        pdca: { maxIterations: 10 },
        routing: { modelMap: { low: 'sonnet' } },
      },
    });

    const config = loadConfig('/tmp/project');

    // Overridden values
    expect(config.pdca.maxIterations).toBe(10);
    expect(config.routing.modelMap.low).toBe('sonnet');

    // Preserved defaults
    expect(config.pdca.stages).toEqual(['plan', 'do', 'check', 'act', 'review']);
    expect(config.routing.modelMap.high).toBe('opus');
    expect(config.context.truncateLimit).toBe(800);
  });

  it('returns frozen config object', () => {
    mockReadState.mockReturnValue({ ok: false, error: 'not found' });

    const config = loadConfig('/tmp/project');
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('caches config for the same directory', () => {
    mockReadState.mockReturnValue({ ok: false, error: 'not found' });

    const first = loadConfig('/tmp/project');
    const second = loadConfig('/tmp/project');

    expect(first).toBe(second); // Same reference
    expect(mockReadState).toHaveBeenCalledTimes(1); // Only read once
  });

  it('reloads config for different directory', () => {
    mockReadState.mockReturnValue({ ok: false, error: 'not found' });

    loadConfig('/tmp/project-a');
    loadConfig('/tmp/project-b');

    expect(mockReadState).toHaveBeenCalledTimes(2);
  });

  it('overwrites arrays instead of merging them', () => {
    mockReadState.mockReturnValue({
      ok: true,
      data: {
        pdca: { stages: ['plan', 'do'] },
      },
    });

    const config = loadConfig('/tmp/project');
    // Arrays are replaced, not concatenated
    expect(config.pdca.stages).toEqual(['plan', 'do']);
  });
});

// ---------------------------------------------------------------------------
// getConfig
// ---------------------------------------------------------------------------
describe('getConfig', () => {
  beforeEach(() => {
    mockReadState.mockReturnValue({ ok: false, error: 'not found' });
  });

  it('retrieves nested value by dot-notated path', () => {
    const val = getConfig('pdca.automationLevel');
    expect(val).toBe('semi-auto');
  });

  it('retrieves deeply nested value', () => {
    const val = getConfig('routing.complexityThresholds.low');
    expect(val).toBe(3);
  });

  it('returns fallback when path does not exist', () => {
    const val = getConfig('nonexistent.deep.path', 'default-val');
    expect(val).toBe('default-val');
  });

  it('returns undefined (no fallback) for missing path', () => {
    const val = getConfig('nonexistent.path');
    expect(val).toBeUndefined();
  });

  it('returns top-level section as object', () => {
    const val = getConfig('i18n') as { defaultLocale: string };
    expect(val.defaultLocale).toBe('ko');
  });
});

// ---------------------------------------------------------------------------
// resetConfigCache
// ---------------------------------------------------------------------------
describe('resetConfigCache', () => {
  it('forces reload on next loadConfig call', () => {
    mockReadState.mockReturnValue({ ok: false, error: 'not found' });

    loadConfig('/tmp/project');
    expect(mockReadState).toHaveBeenCalledTimes(1);

    resetConfigCache();
    loadConfig('/tmp/project');
    expect(mockReadState).toHaveBeenCalledTimes(2);
  });
});
