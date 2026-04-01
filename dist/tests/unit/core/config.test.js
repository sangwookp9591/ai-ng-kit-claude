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
// Mock node:fs statSync for mtime tests
vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        statSync: vi.fn(),
    };
});
import { loadConfig, getConfig, resetConfigCache } from '../../../scripts/core/config.js';
import { readState } from '../../../scripts/core/state.js';
import { statSync } from 'node:fs';
const mockReadState = vi.mocked(readState);
const mockStatSync = vi.mocked(statSync);
/** Helper: statSync always returns mtime 1000 */
function mockStatMtime(ms) {
    mockStatSync.mockReturnValue({ mtimeMs: ms });
}
/** Default: both config files missing, stable mtime */
function setupNoConfigFiles() {
    mockReadState.mockReturnValue({ ok: false, error: 'File not found' });
    mockStatMtime(1000);
}
beforeEach(() => {
    vi.clearAllMocks();
    resetConfigCache();
});
// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------
describe('loadConfig', () => {
    it('returns defaults when config file is missing', () => {
        setupNoConfigFiles();
        const config = loadConfig('/tmp/project');
        expect(config.pdca.stages).toEqual(['plan', 'do', 'check', 'act', 'review']);
        expect(config.pdca.automationLevel).toBe('semi-auto');
        expect(config.context.maxSessionStartTokens).toBe(2000);
        expect(config.routing.modelMap).toEqual({ low: 'haiku', mid: 'sonnet', high: 'opus' });
        expect(config.recovery.circuitBreakerThreshold).toBe(3);
        expect(config.i18n.defaultLocale).toBe('ko');
    });
    it('deep-merges user config over defaults', () => {
        mockStatMtime(1000);
        // First call: .aing/config.json (missing), second: aing.config.json (has data)
        mockReadState
            .mockReturnValueOnce({ ok: false, error: 'not found' })
            .mockReturnValueOnce({
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
        setupNoConfigFiles();
        const config = loadConfig('/tmp/project');
        expect(Object.isFrozen(config)).toBe(true);
    });
    it('caches config for the same directory and same mtimes', () => {
        setupNoConfigFiles();
        const first = loadConfig('/tmp/project');
        const second = loadConfig('/tmp/project');
        expect(first).toBe(second); // Same reference
        expect(mockReadState).toHaveBeenCalledTimes(2); // 2 files read once
    });
    it('reloads config for different directory', () => {
        setupNoConfigFiles();
        loadConfig('/tmp/project-a');
        loadConfig('/tmp/project-b');
        // 2 files per directory = 4 total
        expect(mockReadState).toHaveBeenCalledTimes(4);
    });
    it('overwrites arrays instead of merging them', () => {
        mockStatMtime(1000);
        mockReadState
            .mockReturnValueOnce({ ok: false, error: 'not found' })
            .mockReturnValueOnce({
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
        setupNoConfigFiles();
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
        const val = getConfig('i18n');
        expect(val.defaultLocale).toBe('ko');
    });
});
// ---------------------------------------------------------------------------
// resetConfigCache
// ---------------------------------------------------------------------------
describe('resetConfigCache', () => {
    it('forces reload on next loadConfig call', () => {
        setupNoConfigFiles();
        loadConfig('/tmp/project');
        expect(mockReadState).toHaveBeenCalledTimes(2); // 2 files
        resetConfigCache();
        loadConfig('/tmp/project');
        expect(mockReadState).toHaveBeenCalledTimes(4); // 2 files again
    });
});
// ---------------------------------------------------------------------------
// ProfileConfig defaults
// ---------------------------------------------------------------------------
describe('ProfileConfig defaults', () => {
    beforeEach(() => {
        setupNoConfigFiles();
    });
    it('returns default costMode as balanced', () => {
        const val = getConfig('profile.costMode');
        expect(val).toBe('balanced');
    });
    it('returns default maxTeamSize as 7', () => {
        const val = getConfig('profile.maxTeamSize');
        expect(val).toBe(7);
    });
    it('returns default tokenLimit as null', () => {
        const val = getConfig('profile.tokenLimit');
        expect(val).toBeNull();
    });
    it('returns default agents categories all true', () => {
        const categories = getConfig('profile.agents.categories');
        expect(categories.leadership).toBe(true);
        expect(categories.backend).toBe(true);
        expect(categories.frontend).toBe(true);
        expect(categories.design).toBe(true);
        expect(categories.aiml).toBe(true);
        expect(categories.special).toBe(true);
    });
    it('returns default agents deny/allow as empty arrays', () => {
        expect(getConfig('profile.agents.deny')).toEqual([]);
        expect(getConfig('profile.agents.allow')).toEqual([]);
    });
    it('includes profile field in loaded config object', () => {
        const config = loadConfig('/tmp/project');
        expect(config.profile).toBeDefined();
        expect(config.profile.costMode).toBe('balanced');
    });
});
// ---------------------------------------------------------------------------
// 3-way merge: .aing/config.json > aing.config.json > DEFAULTS
// ---------------------------------------------------------------------------
describe('3-way config merge', () => {
    it('.aing/config.json values override aing.config.json values', () => {
        mockStatMtime(1000);
        // First call: .aing/config.json (profile override)
        // Second call: aing.config.json (different profile override)
        mockReadState
            .mockReturnValueOnce({
            ok: true,
            data: { profile: { costMode: 'budget' } },
        })
            .mockReturnValueOnce({
            ok: true,
            data: { profile: { costMode: 'quality', maxTeamSize: 3 } },
        });
        const config = loadConfig('/tmp/project');
        // .aing/config.json wins over aing.config.json
        expect(config.profile.costMode).toBe('budget');
        // aing.config.json value is preserved when .aing/config.json doesn't set it
        expect(config.profile.maxTeamSize).toBe(3);
    });
    it('aing.config.json values override DEFAULTS when .aing/config.json is missing', () => {
        mockStatMtime(1000);
        mockReadState
            .mockReturnValueOnce({ ok: false, error: 'not found' })
            .mockReturnValueOnce({
            ok: true,
            data: { profile: { costMode: 'quality' } },
        });
        const config = loadConfig('/tmp/project');
        expect(config.profile.costMode).toBe('quality');
        // Default preserved
        expect(config.profile.maxTeamSize).toBe(7);
    });
    it('loads without error when both config files are absent', () => {
        setupNoConfigFiles();
        expect(() => loadConfig('/tmp/project')).not.toThrow();
        const config = loadConfig('/tmp/project');
        expect(config.pdca.automationLevel).toBe('semi-auto');
    });
    it('partial profile override preserves other profile defaults', () => {
        mockStatMtime(1000);
        mockReadState
            .mockReturnValueOnce({ ok: false, error: 'not found' })
            .mockReturnValueOnce({
            ok: true,
            data: { profile: { maxTeamSize: 4 } },
        });
        const config = loadConfig('/tmp/project');
        expect(config.profile.maxTeamSize).toBe(4);
        expect(config.profile.costMode).toBe('balanced'); // default preserved
        expect(config.profile.tokenLimit).toBeNull(); // default preserved
    });
});
// ---------------------------------------------------------------------------
// mtime-based cache invalidation
// ---------------------------------------------------------------------------
describe('mtime-based cache invalidation', () => {
    it('returns cached value when mtime is unchanged', () => {
        mockStatMtime(5000);
        mockReadState.mockReturnValue({ ok: false, error: 'not found' });
        const first = loadConfig('/tmp/project');
        const second = loadConfig('/tmp/project');
        expect(first).toBe(second);
        expect(mockReadState).toHaveBeenCalledTimes(2); // initial load only
    });
    it('reloads when mtime changes', () => {
        mockStatSync
            .mockReturnValueOnce({ mtimeMs: 1000 })
            .mockReturnValueOnce({ mtimeMs: 1000 })
            .mockReturnValueOnce({ mtimeMs: 2000 }) // changed
            .mockReturnValueOnce({ mtimeMs: 2000 });
        mockReadState.mockReturnValue({ ok: false, error: 'not found' });
        const first = loadConfig('/tmp/project');
        const second = loadConfig('/tmp/project');
        expect(first).not.toBe(second); // different reference after reload
        expect(mockReadState).toHaveBeenCalledTimes(4); // 2 files x 2 loads
    });
    it('resetConfigCache clears mtime state so next load re-reads files', () => {
        mockStatMtime(9999);
        mockReadState.mockReturnValue({ ok: false, error: 'not found' });
        loadConfig('/tmp/project');
        resetConfigCache();
        // After reset, mtime state is gone — next call must re-read
        loadConfig('/tmp/project');
        expect(mockReadState).toHaveBeenCalledTimes(4); // 2 files x 2 loads
    });
});
//# sourceMappingURL=config.test.js.map