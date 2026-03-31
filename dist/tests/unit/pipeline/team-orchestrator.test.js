/**
 * Unit tests for scripts/pipeline/team-orchestrator.ts
 * Covers: selectTeam, estimateTeamCost, generateWorkerPrompt, formatTeamSelection, getTeamPresets
 */
import { describe, it, expect, vi } from 'vitest';
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    })),
}));
vi.mock('../../../scripts/routing/complexity-scorer.js', () => ({
    scoreComplexity: vi.fn((signals = {}) => {
        const fileCount = signals.fileCount || 0;
        const domainCount = signals.domainCount || 0;
        const lineCount = signals.lineCount || 0;
        const hasSecurity = signals.hasSecurity ? 2 : 0;
        let files = 0;
        if (fileCount > 15)
            files = 3;
        else if (fileCount > 5)
            files = 2;
        else if (fileCount > 2)
            files = 1;
        let lines = 0;
        if (lineCount > 500)
            lines = 3;
        else if (lineCount > 100)
            lines = 2;
        else if (lineCount > 30)
            lines = 1;
        let domains = 0;
        if (domainCount >= 4)
            domains = 4;
        else if (domainCount >= 3)
            domains = 3;
        else if (domainCount >= 2)
            domains = 2;
        const score = files + lines + domains + hasSecurity;
        const level = score <= 3 ? 'low' : score <= 7 ? 'mid' : 'high';
        return { score, level, breakdown: { files, lines, domains } };
    }),
}));
import { selectTeam, estimateTeamCost, generateWorkerPrompt, formatTeamSelection, getTeamPresets, TEAM_PRESETS, } from '../../../scripts/pipeline/team-orchestrator.js';
// ── selectTeam — sizing ──────────────────────────────────────────────────
describe('selectTeam — team sizing', () => {
    it('selects solo for trivial tasks (score <= 2)', () => {
        const result = selectTeam({ fileCount: 1 });
        expect(result.preset).toBe('solo');
        expect(result.team.workers).toHaveLength(1);
        expect(result.team.name).toBe('Solo');
    });
    it('selects duo for small tasks (score 3-4)', () => {
        // files=5 → 1, lines=200 → 2 = score 3 → duo
        const result = selectTeam({ fileCount: 5, lineCount: 200 });
        expect(result.preset).toBe('duo');
        expect(result.team.workers).toHaveLength(2);
    });
    it('selects squad for medium tasks (score 5-6)', () => {
        // files=10 → 2, domains=2 → 2, lines=200 → 2 = score 6 → squad
        const result = selectTeam({ fileCount: 10, domainCount: 2, lineCount: 200 });
        expect(result.preset).toBe('squad');
        expect(result.team.workers).toHaveLength(4);
    });
    it('selects full team for complex tasks (score >= 7)', () => {
        // files=20 → 3, lines=600 → 3, domains=3 → 3 = score 9 → full
        const result = selectTeam({ fileCount: 20, lineCount: 600, domainCount: 3 });
        expect(result.preset).toBe('full');
        expect(result.team.workers).toHaveLength(7);
    });
    it('includes reason with complexity details', () => {
        const result = selectTeam({ fileCount: 1 });
        expect(result.reason).toContain('Complexity');
        expect(result.reason).toContain('Solo');
    });
    it('includes complexity object in result', () => {
        const result = selectTeam({ fileCount: 1 });
        expect(result.complexity).toBeDefined();
        expect(result.complexity.score).toBeDefined();
        expect(result.complexity.level).toBeDefined();
    });
});
// ── selectTeam — security escalation ─────────────────────────────────────
describe('selectTeam — security escalation', () => {
    it('escalates solo to duo when hasSecurity', () => {
        const result = selectTeam({ fileCount: 1, hasSecurity: true });
        expect(result.preset).toBe('duo');
    });
    it('escalates duo to squad when hasSecurity', () => {
        // files=5 → 1, lines=200 → 2, security=2 → score=5 → squad (already squad via score)
        // Use lower score: files=5 → 1, lines=50 → 1, security=2 → score=4 → duo, security escalates
        const result = selectTeam({ fileCount: 5, lineCount: 50, hasSecurity: true });
        // score=1+1+2=4 → duo, then security escalates to squad
        expect(result.preset).toBe('squad');
    });
    it('does not escalate full team further', () => {
        const result = selectTeam({ fileCount: 20, lineCount: 600, domainCount: 3, hasSecurity: true });
        expect(result.preset).toBe('full');
    });
});
// ── estimateTeamCost ─────────────────────────────────────────────────────
describe('estimateTeamCost', () => {
    it('returns breakdown for solo preset', () => {
        const cost = estimateTeamCost('solo');
        expect(cost.breakdown).toHaveLength(1);
        expect(cost.preset).toBe('solo');
        expect(cost.workerCount).toBe(1);
        expect(cost.estimated).toContain('tokens');
    });
    it('returns breakdown for duo preset', () => {
        const cost = estimateTeamCost('duo');
        expect(cost.breakdown).toHaveLength(2);
        expect(cost.workerCount).toBe(2);
    });
    it('returns breakdown for full preset', () => {
        const cost = estimateTeamCost('full');
        expect(cost.breakdown).toHaveLength(7);
        expect(cost.workerCount).toBe(7);
    });
    it('returns unknown for invalid preset', () => {
        const cost = estimateTeamCost('nonexistent');
        expect(cost.estimated).toBe('unknown');
        expect(cost.breakdown).toEqual([]);
    });
    it('haiku workers have lower token cost than opus', () => {
        const cost = estimateTeamCost('full');
        const haikuWorker = cost.breakdown.find(b => b.model === 'haiku');
        const opusWorker = cost.breakdown.find(b => b.model === 'opus');
        expect(haikuWorker).toBeDefined();
        expect(opusWorker).toBeDefined();
        // Haiku token estimate should be less than opus
        const haikuTokens = parseInt(haikuWorker.estimatedTokens.replace(/[^0-9]/g, ''));
        const opusTokens = parseInt(opusWorker.estimatedTokens.replace(/[^0-9]/g, ''));
        expect(haikuTokens).toBeLessThan(opusTokens);
    });
});
// ── generateWorkerPrompt ─────────────────────────────────────────────────
describe('generateWorkerPrompt', () => {
    it('includes worker name and team name', () => {
        const prompt = generateWorkerPrompt({
            teamName: 'alpha',
            workerName: 'jay',
            role: 'Backend executor',
            agent: 'executor',
            tasks: ['Build login API'],
        });
        expect(prompt).toContain('jay');
        expect(prompt).toContain('"alpha"');
        expect(prompt).toContain('Backend executor');
    });
    it('includes numbered task list', () => {
        const prompt = generateWorkerPrompt({
            teamName: 'beta',
            workerName: 'milla',
            role: 'Security reviewer',
            agent: 'reviewer',
            tasks: ['Review auth module', 'Check CORS config', 'Audit secrets'],
        });
        expect(prompt).toContain('1. Review auth module');
        expect(prompt).toContain('2. Check CORS config');
        expect(prompt).toContain('3. Audit secrets');
    });
    it('includes TDD protocol', () => {
        const prompt = generateWorkerPrompt({
            teamName: 'test',
            workerName: 'jay',
            role: 'executor',
            agent: 'executor',
            tasks: ['task'],
        });
        expect(prompt).toContain('TDD');
        expect(prompt).toContain('failing test first');
    });
    it('includes evidence requirement', () => {
        const prompt = generateWorkerPrompt({
            teamName: 'test',
            workerName: 'sam',
            role: 'verifier',
            agent: 'sam',
            tasks: ['verify'],
        });
        expect(prompt).toContain('evidence');
    });
});
// ── formatTeamSelection ──────────────────────────────────────────────────
describe('formatTeamSelection', () => {
    it('formats selection with team name and reason', () => {
        const selection = selectTeam({ fileCount: 1 });
        const output = formatTeamSelection(selection);
        expect(output).toContain('[aing Team]');
        expect(output).toContain('Solo');
        expect(output).toContain('Estimated cost');
    });
    it('includes worker table', () => {
        const selection = selectTeam({ fileCount: 10, domainCount: 2 });
        const output = formatTeamSelection(selection);
        expect(output).toContain('Agent');
        expect(output).toContain('Role');
        expect(output).toContain('Model');
    });
    it('includes description', () => {
        const selection = selectTeam({ fileCount: 1 });
        const output = formatTeamSelection(selection);
        expect(output).toContain('Description');
    });
});
// ── getTeamPresets ────────────────────────────────────────────────────────
describe('getTeamPresets', () => {
    it('returns all 4 preset configurations', () => {
        const presets = getTeamPresets();
        expect(presets).toHaveLength(4);
    });
    it('each preset has key, name, workers, cost, description', () => {
        for (const preset of getTeamPresets()) {
            expect(preset.key).toBeDefined();
            expect(preset.name).toBeDefined();
            expect(preset.workers).toBeGreaterThan(0);
            expect(preset.cost).toBeDefined();
            expect(preset.description.length).toBeGreaterThan(0);
        }
    });
    it('solo has 1 worker, full has 7', () => {
        const presets = getTeamPresets();
        const solo = presets.find(p => p.key === 'solo');
        const full = presets.find(p => p.key === 'full');
        expect(solo.workers).toBe(1);
        expect(full.workers).toBe(7);
    });
});
// ── TEAM_PRESETS ─────────────────────────────────────────────────────────
describe('TEAM_PRESETS', () => {
    it('every worker has name, agent, model, role', () => {
        for (const [, preset] of Object.entries(TEAM_PRESETS)) {
            for (const worker of preset.workers) {
                expect(worker.name).toBeDefined();
                expect(worker.agent).toBeDefined();
                expect(['haiku', 'sonnet', 'opus']).toContain(worker.model);
                expect(worker.role.length).toBeGreaterThan(0);
            }
        }
    });
});
//# sourceMappingURL=team-orchestrator.test.js.map