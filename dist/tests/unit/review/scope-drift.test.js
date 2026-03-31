/**
 * Unit tests for scripts/review/scope-drift.ts
 * Covers: analyzeDrift, formatDrift, threeWayComparison, formatThreeWay
 */
import { describe, it, expect, vi } from 'vitest';
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    })),
}));
import { analyzeDrift, formatDrift, threeWayComparison, formatThreeWay, } from '../../../scripts/review/scope-drift.js';
// ── analyzeDrift ─────────────────────────────────────────────────────────
describe('analyzeDrift', () => {
    it('returns zero drift for null inputs', () => {
        const result = analyzeDrift(null, null);
        expect(result.driftScore).toBe(0);
        expect(result.inScope).toEqual([]);
        expect(result.outOfScope).toEqual([]);
        expect(result.missed).toEqual([]);
    });
    it('returns zero drift when all files match scope', () => {
        const result = analyzeDrift({ scope: ['src/auth', 'src/api'] }, { files: ['src/auth/login.ts', 'src/api/users.ts'] });
        expect(result.driftScore).toBe(0);
        expect(result.inScope).toHaveLength(2);
        expect(result.outOfScope).toHaveLength(0);
    });
    it('detects out-of-scope files', () => {
        const result = analyzeDrift({ scope: ['src/auth'] }, { files: ['src/auth/login.ts', 'src/billing/stripe.ts', 'src/email/send.ts'] });
        expect(result.outOfScope).toContain('src/billing/stripe.ts');
        expect(result.outOfScope).toContain('src/email/send.ts');
        expect(result.driftScore).toBe(67); // 2/3 out of scope
    });
    it('detects missed goals', () => {
        const result = analyzeDrift({ goals: ['authentication', 'authorization', 'logging'], scope: ['src/'] }, { files: ['src/auth.ts'] });
        // 'auth' in auth.ts matches 'authentication' first word 'authentication' partial match
        expect(result.missed).toContain('authorization');
        expect(result.missed).toContain('logging');
    });
    it('handles empty files list', () => {
        const result = analyzeDrift({ scope: ['src/'] }, { files: [] });
        expect(result.driftScore).toBe(0);
    });
    it('handles glob-like patterns', () => {
        const result = analyzeDrift({ scope: ['src/*.ts'] }, { files: ['src/index.ts'] });
        expect(result.inScope).toContain('src/index.ts');
    });
    it('calculates correct drift percentage', () => {
        const result = analyzeDrift({ scope: ['src/core'] }, { files: ['src/core/a.ts', 'tests/b.ts', 'docs/c.md', 'config/d.json'] });
        expect(result.driftScore).toBe(75); // 3/4 out of scope
    });
});
// ── formatDrift ──────────────────────────────────────────────────────────
describe('formatDrift', () => {
    it('shows no drift message for clean results', () => {
        const output = formatDrift({
            driftScore: 0, inScope: ['a.ts'], outOfScope: [], missed: [],
        });
        expect(output).toContain('No drift detected');
    });
    it('shows out-of-scope files', () => {
        const output = formatDrift({
            driftScore: 50,
            inScope: ['a.ts'],
            outOfScope: ['b.ts', 'c.ts'],
            missed: [],
        });
        expect(output).toContain('Scope Drift: 50%');
        expect(output).toContain('Out of Scope (2 files)');
        expect(output).toContain('b.ts');
        expect(output).toContain('c.ts');
    });
    it('shows missed goals', () => {
        const output = formatDrift({
            driftScore: 0, inScope: [], outOfScope: [],
            missed: ['add tests', 'update docs'],
        });
        expect(output).toContain('Missed Goals (2)');
        expect(output).toContain('add tests');
    });
    it('limits out-of-scope display to 10', () => {
        const outOfScope = Array.from({ length: 15 }, (_, i) => `file${i}.ts`);
        const output = formatDrift({
            driftScore: 100, inScope: [], outOfScope, missed: [],
        });
        expect(output).toContain('file9.ts');
        // Should not contain file10+
        expect(output).not.toContain('file10.ts');
    });
});
// ── threeWayComparison ───────────────────────────────────────────────────
describe('threeWayComparison', () => {
    it('returns CLEAN when everything aligns', () => {
        const result = threeWayComparison({
            todosContent: '- [x] Add auth module',
            changedFiles: ['src/auth/login.ts'],
            commitMessages: ['feat: add auth module'],
        });
        expect(result.verdict).toBe('CLEAN');
    });
    it('detects scope creep', () => {
        const result = threeWayComparison({
            todosContent: '- [x] Fix auth bug',
            changedFiles: ['src/auth/fix.ts', 'src/billing/refactor.ts'],
            commitMessages: ['fix: auth bug'],
        });
        expect(result.scopeCreep.length).toBeGreaterThan(0);
        expect(result.verdict).toContain('DRIFT');
    });
    it('detects missing requirements', () => {
        const result = threeWayComparison({
            todosContent: '- [ ] Add login\n- [ ] Add logout\n- [ ] Add dashboard',
            changedFiles: ['src/login.ts'],
            commitMessages: ['feat: add login'],
        });
        expect(result.missing.length).toBeGreaterThan(0);
        expect(result.verdict).toContain('MISSING');
    });
    it('detects both drift and missing', () => {
        const result = threeWayComparison({
            todosContent: '- [ ] Add auth\n- [ ] Add tests',
            changedFiles: ['src/billing/new.ts'],
            commitMessages: [],
        });
        expect(result.verdict).toContain('DRIFT');
        expect(result.verdict).toContain('MISSING');
    });
    it('extracts intent from PR description', () => {
        const result = threeWayComparison({
            prDescription: '- Add user management\n- Fix session handling',
            changedFiles: ['src/user/manage.ts', 'src/session/fix.ts'],
            commitMessages: [],
        });
        expect(result.intent).toContain('Add user management');
        expect(result.intent).toContain('Fix session handling');
    });
    it('extracts intent from commit messages', () => {
        const result = threeWayComparison({
            changedFiles: ['src/api.ts'],
            commitMessages: ['feat: add REST endpoint', 'fix: validate input'],
        });
        expect(result.intent).toContain('add REST endpoint');
        expect(result.intent).toContain('validate input');
    });
    it('deduplicates intent items', () => {
        const result = threeWayComparison({
            todosContent: '- [x] Add login',
            prDescription: '- Add login',
            changedFiles: ['src/login.ts'],
            commitMessages: ['feat: add login'],
        });
        const loginIntents = result.intent.filter(i => i.toLowerCase().includes('login'));
        // Should have deduplicated (case-sensitive though)
        expect(loginIntents.length).toBeLessThanOrEqual(2);
    });
    it('handles empty context', () => {
        const result = threeWayComparison({
            changedFiles: [],
            commitMessages: [],
        });
        expect(result.verdict).toBe('CLEAN');
        expect(result.intent).toEqual([]);
    });
});
// ── formatThreeWay ───────────────────────────────────────────────────────
describe('formatThreeWay', () => {
    it('shows CLEAN verdict', () => {
        const output = formatThreeWay({
            intent: ['Add login'], delivered: ['src/login'], scopeCreep: [], missing: [],
            verdict: 'CLEAN',
        });
        expect(output).toContain('[CLEAN]');
        expect(output).toContain('All changes align');
    });
    it('shows scope creep warnings', () => {
        const output = formatThreeWay({
            intent: ['Add auth'], delivered: ['src/auth', 'src/billing'],
            scopeCreep: ['src/billing'], missing: [],
            verdict: 'DRIFT DETECTED',
        });
        expect(output).toContain('Scope Creep');
        expect(output).toContain('src/billing');
    });
    it('shows missing requirements', () => {
        const output = formatThreeWay({
            intent: ['Add login', 'Add tests'], delivered: ['src/login'],
            scopeCreep: [], missing: ['Add tests'],
            verdict: 'REQUIREMENTS MISSING',
        });
        expect(output).toContain('Missing Requirements');
        expect(output).toContain('Add tests');
    });
    it('shows intent items', () => {
        const output = formatThreeWay({
            intent: ['Task 1', 'Task 2', 'Task 3'], delivered: [],
            scopeCreep: [], missing: [],
            verdict: 'CLEAN',
        });
        expect(output).toContain('Intent (3 items)');
        expect(output).toContain('Task 1');
    });
});
//# sourceMappingURL=scope-drift.test.js.map