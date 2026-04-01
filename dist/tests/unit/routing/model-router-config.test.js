/**
 * Unit tests for getCostMode — config integration (Step 4)
 * TDD: env > config > 'balanced' priority
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
// Mock config module so we can control what loadConfig returns
vi.mock('../../../scripts/core/config.js', () => ({
    loadConfig: vi.fn(),
    resetConfigCache: vi.fn(),
}));
import { getCostMode } from '../../../scripts/routing/model-router.js';
import { loadConfig } from '../../../scripts/core/config.js';
const mockLoadConfig = vi.mocked(loadConfig);
const originalEnv = process.env.SWKIT_COST_MODE;
afterEach(() => {
    if (originalEnv === undefined) {
        delete process.env.SWKIT_COST_MODE;
    }
    else {
        process.env.SWKIT_COST_MODE = originalEnv;
    }
    vi.clearAllMocks();
});
// ── getCostMode priority: env > config > 'balanced' ─────────────────────────
describe('getCostMode — config integration', () => {
    it('returns balanced as default when no env and no config', () => {
        delete process.env.SWKIT_COST_MODE;
        mockLoadConfig.mockReturnValue({ profile: { costMode: undefined } });
        expect(getCostMode()).toBe('balanced');
    });
    it('reads budget from profile.costMode in config', () => {
        delete process.env.SWKIT_COST_MODE;
        mockLoadConfig.mockReturnValue({ profile: { costMode: 'budget' } });
        expect(getCostMode()).toBe('budget');
    });
    it('reads quality from profile.costMode in config', () => {
        delete process.env.SWKIT_COST_MODE;
        mockLoadConfig.mockReturnValue({ profile: { costMode: 'quality' } });
        expect(getCostMode()).toBe('quality');
    });
    it('env variable takes priority over config', () => {
        process.env.SWKIT_COST_MODE = 'quality';
        mockLoadConfig.mockReturnValue({ profile: { costMode: 'budget' } });
        expect(getCostMode()).toBe('quality');
    });
    it('falls back to balanced when config profile.costMode is invalid', () => {
        delete process.env.SWKIT_COST_MODE;
        mockLoadConfig.mockReturnValue({ profile: { costMode: 'invalid-value' } });
        expect(getCostMode()).toBe('balanced');
    });
    it('falls back to balanced when loadConfig throws', () => {
        delete process.env.SWKIT_COST_MODE;
        mockLoadConfig.mockImplementation(() => { throw new Error('config error'); });
        expect(getCostMode()).toBe('balanced');
    });
    it('falls back to balanced when config has no profile key', () => {
        delete process.env.SWKIT_COST_MODE;
        mockLoadConfig.mockReturnValue({});
        expect(getCostMode()).toBe('balanced');
    });
});
//# sourceMappingURL=model-router-config.test.js.map