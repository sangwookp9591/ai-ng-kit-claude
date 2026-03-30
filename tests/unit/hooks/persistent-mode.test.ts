/**
 * Unit tests for scripts/hooks/persistent-mode.ts
 * TDD: RED -> GREEN -> REFACTOR
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock state utilities
vi.mock('../../../scripts/core/state.js', () => ({
  readState: vi.fn(),
  writeState: vi.fn(),
}));

import { readState, writeState } from '../../../scripts/core/state.js';
import {
  activatePersistentMode,
  deactivatePersistentMode,
  getPersistentModeState,
} from '../../../scripts/hooks/persistent-mode.js';

const mockReadState = vi.mocked(readState);
const mockWriteState = vi.mocked(writeState);

beforeEach(() => {
  vi.resetAllMocks();
  // Default: write succeeds
  mockWriteState.mockReturnValue({ ok: true });
});

// ---------------------------------------------------------------------------
// getPersistentModeState
// ---------------------------------------------------------------------------
describe('getPersistentModeState', () => {
  it('returns null when state file does not exist', async () => {
    mockReadState.mockReturnValue({ ok: false, error: 'File not found' });
    const result = await getPersistentModeState('/project');
    expect(result).toBeNull();
  });

  it('returns state when file exists and active', async () => {
    const state = { active: true, mode: 'auto', startedAt: '2026-01-01T00:00:00Z', reason: 'test' };
    mockReadState.mockReturnValue({ ok: true, data: state });
    const result = await getPersistentModeState('/project');
    expect(result).toEqual(state);
  });

  it('returns state when file exists and inactive', async () => {
    const state = { active: false, mode: 'team', startedAt: '2026-01-01T00:00:00Z', reason: 'done' };
    mockReadState.mockReturnValue({ ok: true, data: state });
    const result = await getPersistentModeState('/project');
    expect(result).toEqual(state);
  });
});

// ---------------------------------------------------------------------------
// activatePersistentMode
// ---------------------------------------------------------------------------
describe('activatePersistentMode', () => {
  it('writes active state with mode and reason', async () => {
    await activatePersistentMode('/project', 'auto', 'ralph requested');

    expect(mockWriteState).toHaveBeenCalledOnce();
    const [filePath, data] = mockWriteState.mock.calls[0];
    expect(filePath).toContain('persistent-mode.json');
    const state = data as { active: boolean; mode: string; reason: string; startedAt: string };
    expect(state.active).toBe(true);
    expect(state.mode).toBe('auto');
    expect(state.reason).toBe('ralph requested');
    expect(state.startedAt).toBeDefined();
  });

  it('writes to correct path under projectDir', async () => {
    await activatePersistentMode('/my/project', 'team', 'orchestrating');
    const [filePath] = mockWriteState.mock.calls[0];
    expect(filePath).toBe('/my/project/.aing/state/persistent-mode.json');
  });

  it('throws when write fails', async () => {
    mockWriteState.mockReturnValue({ ok: false, error: 'ENOSPC' });
    await expect(activatePersistentMode('/project', 'auto', 'test')).rejects.toThrow('ENOSPC');
  });
});

// ---------------------------------------------------------------------------
// deactivatePersistentMode
// ---------------------------------------------------------------------------
describe('deactivatePersistentMode', () => {
  it('writes inactive state preserving existing mode', async () => {
    const existing = { active: true, mode: 'pdca', startedAt: '2026-01-01T00:00:00Z', reason: 'active' };
    mockReadState.mockReturnValue({ ok: true, data: existing });

    await deactivatePersistentMode('/project');

    const [, data] = mockWriteState.mock.calls[0];
    const state = data as { active: boolean; mode: string };
    expect(state.active).toBe(false);
    expect(state.mode).toBe('pdca');
  });

  it('writes inactive state with default mode when no prior state', async () => {
    mockReadState.mockReturnValue({ ok: false, error: 'File not found' });

    await deactivatePersistentMode('/project');

    const [, data] = mockWriteState.mock.calls[0];
    const state = data as { active: boolean };
    expect(state.active).toBe(false);
  });

  it('throws when write fails', async () => {
    mockReadState.mockReturnValue({ ok: false, error: 'File not found' });
    mockWriteState.mockReturnValue({ ok: false, error: 'EPERM' });
    await expect(deactivatePersistentMode('/project')).rejects.toThrow('EPERM');
  });
});
