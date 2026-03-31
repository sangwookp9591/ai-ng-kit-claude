/**
 * Unit tests for scripts/review/cso-audit.ts
 * Covers: CSO_PHASES, OWASP_CHECKS, STRIDE, buildAuditPrompt, recordFinding, formatAuditSummary
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    })),
}));
vi.mock('../../../scripts/evidence/evidence-chain.js', () => ({
    addEvidence: vi.fn(),
}));
import { CSO_PHASES, SEVERITY, OWASP_CHECKS, STRIDE, FP_RULES, SECRET_PATTERNS, buildAuditPrompt, recordFinding, formatAuditSummary, } from '../../../scripts/review/cso-audit.js';
import { addEvidence } from '../../../scripts/evidence/evidence-chain.js';
const mockAddEvidence = vi.mocked(addEvidence);
beforeEach(() => {
    vi.clearAllMocks();
});
// ── CSO_PHASES ───────────────────────────────────────────────────────────
describe('CSO_PHASES', () => {
    it('has 14 phases (0-13)', () => {
        expect(CSO_PHASES).toHaveLength(14);
        expect(CSO_PHASES[0].id).toBe(0);
        expect(CSO_PHASES[13].id).toBe(13);
    });
    it('phase 0 is stack-detection', () => {
        expect(CSO_PHASES[0].name).toBe('stack-detection');
    });
    it('phase 9 is owasp-top10', () => {
        expect(CSO_PHASES[9].name).toBe('owasp-top10');
    });
    it('phase 10 is stride-model', () => {
        expect(CSO_PHASES[10].name).toBe('stride-model');
    });
    it('phase 13 is findings-report', () => {
        expect(CSO_PHASES[13].name).toBe('findings-report');
    });
    it('all phases have id, name, and description', () => {
        for (const phase of CSO_PHASES) {
            expect(typeof phase.id).toBe('number');
            expect(phase.name.length).toBeGreaterThan(0);
            expect(phase.description.length).toBeGreaterThan(0);
        }
    });
});
// ── OWASP_CHECKS ─────────────────────────────────────────────────────────
describe('OWASP_CHECKS', () => {
    it('has all A01-A10 categories', () => {
        const keys = Object.keys(OWASP_CHECKS);
        expect(keys).toContain('A01-broken-access-control');
        expect(keys).toContain('A03-injection');
        expect(keys).toContain('A05-security-misconfiguration');
        expect(keys).toContain('A10-ssrf');
    });
    it('A01 patterns include authorization skip patterns', () => {
        const a01 = OWASP_CHECKS['A01-broken-access-control'];
        expect(a01.patterns).toContain('skip_authorization');
        expect(a01.patterns).toContain('no_auth');
    });
    it('A02 patterns include weak crypto', () => {
        const a02 = OWASP_CHECKS['A02-cryptographic-failures'];
        expect(a02.patterns).toContain('MD5');
        expect(a02.patterns).toContain('SHA1');
    });
    it('A03 includes injection patterns', () => {
        const a03 = OWASP_CHECKS['A03-injection'];
        expect(a03.patterns.some(p => p.includes('exec'))).toBe(true);
        expect(a03.patterns.some(p => p.includes('sql'))).toBe(true);
    });
    it('A06 has empty patterns (defers to Phase 3)', () => {
        expect(OWASP_CHECKS['A06-vulnerable-components'].patterns).toEqual([]);
    });
    it('all categories have description', () => {
        for (const [, check] of Object.entries(OWASP_CHECKS)) {
            expect(check.description.length).toBeGreaterThan(0);
        }
    });
});
// ── STRIDE ───────────────────────────────────────────────────────────────
describe('STRIDE', () => {
    it('has all 6 dimensions (S, T, R, I, D, E)', () => {
        expect(Object.keys(STRIDE)).toEqual(['S', 'T', 'R', 'I', 'D', 'E']);
    });
    it('S is Spoofing', () => {
        expect(STRIDE.S.name).toBe('Spoofing');
        expect(STRIDE.S.question).toContain('impersonate');
    });
    it('T is Tampering', () => {
        expect(STRIDE.T.name).toBe('Tampering');
    });
    it('E is Elevation of Privilege', () => {
        expect(STRIDE.E.name).toBe('Elevation of Privilege');
        expect(STRIDE.E.question).toContain('unauthorized');
    });
    it('all dimensions have name and question', () => {
        for (const dim of Object.values(STRIDE)) {
            expect(dim.name.length).toBeGreaterThan(0);
            expect(dim.question.length).toBeGreaterThan(0);
        }
    });
});
// ── SEVERITY ─────────────────────────────────────────────────────────────
describe('SEVERITY', () => {
    it('has CRITICAL, HIGH, MEDIUM levels', () => {
        expect(SEVERITY.CRITICAL).toBeDefined();
        expect(SEVERITY.HIGH).toBeDefined();
        expect(SEVERITY.MEDIUM).toBeDefined();
    });
    it('CRITICAL requires realistic exploitation scenario', () => {
        expect(SEVERITY.CRITICAL.requirement).toContain('exploitation');
    });
});
// ── FP_RULES ─────────────────────────────────────────────────────────────
describe('FP_RULES', () => {
    it('has false positive rules', () => {
        expect(FP_RULES.length).toBeGreaterThan(0);
    });
    it('devDependency CVE capped at MEDIUM', () => {
        const rule = FP_RULES.find(r => r.pattern.includes('devDependency'));
        expect(rule).toBeDefined();
        expect(rule.maxSeverity).toBe('MEDIUM');
    });
    it('test fixture secrets are excluded', () => {
        const rule = FP_RULES.find(r => r.pattern.includes('test fixture'));
        expect(rule).toBeDefined();
        expect(rule.maxSeverity).toBeNull();
    });
    it('placeholder .env.example values are excluded', () => {
        const rule = FP_RULES.find(r => r.pattern.includes('placeholder'));
        expect(rule).toBeDefined();
        expect(rule.maxSeverity).toBeNull();
    });
});
// ── SECRET_PATTERNS ──────────────────────────────────────────────────────
describe('SECRET_PATTERNS', () => {
    it('includes AWS, Stripe, GitHub, Slack, OpenAI patterns', () => {
        const names = SECRET_PATTERNS.map(p => p.name);
        expect(names).toContain('AWS Access Key');
        expect(names).toContain('Stripe Secret Key');
        expect(names).toContain('GitHub PAT');
        expect(names).toContain('Slack Bot Token');
        expect(names).toContain('OpenAI API Key');
    });
    it('all secret patterns are CRITICAL severity', () => {
        for (const sp of SECRET_PATTERNS) {
            expect(sp.severity).toBe('CRITICAL');
        }
    });
    it('AWS key pattern matches real format', () => {
        const awsPattern = SECRET_PATTERNS.find(p => p.name === 'AWS Access Key');
        const regex = new RegExp(awsPattern.pattern);
        expect(regex.test('AKIAIOSFODNN7EXAMPLE')).toBe(true);
        expect(regex.test('not-a-key')).toBe(false);
    });
    it('GitHub PAT pattern matches real format', () => {
        const ghPattern = SECRET_PATTERNS.find(p => p.name === 'GitHub PAT');
        const regex = new RegExp(ghPattern.pattern);
        expect(regex.test('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij')).toBe(true);
    });
});
// ── buildAuditPrompt ─────────────────────────────────────────────────────
describe('buildAuditPrompt', () => {
    it('includes all 14 phases by default', () => {
        const prompt = buildAuditPrompt({});
        expect(prompt).toContain('Phase 0');
        expect(prompt).toContain('Phase 13');
        expect(prompt).toContain('stack-detection');
        expect(prompt).toContain('findings-report');
    });
    it('filters to specific phases', () => {
        const prompt = buildAuditPrompt({ phases: [0, 9, 10] });
        expect(prompt).toContain('Phase 0');
        expect(prompt).toContain('Phase 9');
        expect(prompt).toContain('Phase 10');
        expect(prompt).not.toContain('Phase 1:');
        expect(prompt).not.toContain('Phase 13');
    });
    it('includes stack info when provided', () => {
        const prompt = buildAuditPrompt({ stack: 'Next.js + PostgreSQL' });
        expect(prompt).toContain('Next.js + PostgreSQL');
    });
    it('uses auto-detect when no stack', () => {
        const prompt = buildAuditPrompt({});
        expect(prompt).toContain('auto-detect');
    });
    it('includes severity rules', () => {
        const prompt = buildAuditPrompt({});
        expect(prompt).toContain('CRITICAL');
        expect(prompt).toContain('exploitation');
    });
    it('includes false positive rules', () => {
        const prompt = buildAuditPrompt({});
        expect(prompt).toContain('devDependency');
        expect(prompt).toContain('EXCLUDED');
    });
    it('includes output format template', () => {
        const prompt = buildAuditPrompt({});
        expect(prompt).toContain('Severity:');
        expect(prompt).toContain('Remediation:');
        expect(prompt).toContain('Confidence:');
    });
});
// ── recordFinding ────────────────────────────────────────────────────────
describe('recordFinding', () => {
    it('records CRITICAL finding as fail evidence', () => {
        const finding = {
            title: 'SQL Injection', severity: 'CRITICAL', category: 'OWASP A03',
            file: 'api.ts', line: 42, description: 'Unsafe query',
            remediation: 'Use parameterized queries', confidence: 'VERIFIED', phase: 9,
        };
        recordFinding('login', finding, '/tmp/project');
        expect(mockAddEvidence).toHaveBeenCalledWith('login', expect.objectContaining({
            type: 'security-audit',
            result: 'fail',
            source: 'cso-phase-9',
        }), '/tmp/project');
    });
    it('records non-CRITICAL finding as not_available', () => {
        const finding = {
            title: 'Weak Hash', severity: 'HIGH', category: 'OWASP A02',
            file: 'crypto.ts', line: 10, description: 'MD5 usage',
            remediation: 'Use SHA-256', confidence: 'LIKELY', phase: 9,
        };
        recordFinding('auth', finding, '/tmp/project');
        expect(mockAddEvidence).toHaveBeenCalledWith('auth', expect.objectContaining({ result: 'not_available' }), '/tmp/project');
    });
    it('includes finding details in evidence', () => {
        const finding = {
            title: 'XSS', severity: 'CRITICAL', category: 'OWASP A03',
            file: 'render.ts', line: 99, description: 'Unsafe HTML',
            remediation: 'Sanitize input', confidence: 'VERIFIED', phase: 9,
        };
        recordFinding('ui', finding);
        const call = mockAddEvidence.mock.calls[0];
        const details = call[1].details;
        expect(details.title).toBe('XSS');
        expect(details.file).toBe('render.ts');
        expect(details.line).toBe(99);
        expect(details.remediation).toBe('Sanitize input');
    });
});
// ── formatAuditSummary ───────────────────────────────────────────────────
describe('formatAuditSummary', () => {
    it('shows correct counts per severity', () => {
        const findings = [
            { title: 'A', severity: 'CRITICAL', category: 'x', file: 'a.ts', line: 1, description: '', remediation: '', confidence: 'VERIFIED', phase: 0 },
            { title: 'B', severity: 'HIGH', category: 'x', file: 'b.ts', line: 2, description: '', remediation: '', confidence: 'LIKELY', phase: 1 },
            { title: 'C', severity: 'HIGH', category: 'x', file: 'c.ts', line: 3, description: '', remediation: '', confidence: 'LIKELY', phase: 2 },
            { title: 'D', severity: 'MEDIUM', category: 'x', file: 'd.ts', line: 4, description: '', remediation: '', confidence: 'UNCERTAIN', phase: 3 },
        ];
        const summary = formatAuditSummary(findings);
        expect(summary).toContain('4 findings');
        expect(summary).toContain('CRITICAL: 1');
        expect(summary).toContain('HIGH: 2');
        expect(summary).toContain('MEDIUM: 1');
    });
    it('lists critical findings with file references', () => {
        const findings = [
            { title: 'SQLi in API', severity: 'CRITICAL', category: 'A03', file: 'api.ts', line: 42, description: '', remediation: '', confidence: 'VERIFIED', phase: 9 },
        ];
        const summary = formatAuditSummary(findings);
        expect(summary).toContain('Critical Findings');
        expect(summary).toContain('SQLi in API');
        expect(summary).toContain('api.ts:42');
    });
    it('does not show Critical Findings section when none exist', () => {
        const findings = [
            { title: 'Low issue', severity: 'MEDIUM', category: 'x', file: 'a.ts', line: 1, description: '', remediation: '', confidence: 'UNCERTAIN', phase: 0 },
        ];
        const summary = formatAuditSummary(findings);
        expect(summary).not.toContain('Critical Findings');
    });
    it('handles empty findings', () => {
        const summary = formatAuditSummary([]);
        expect(summary).toContain('0 findings');
        expect(summary).toContain('CRITICAL: 0');
    });
});
//# sourceMappingURL=cso-audit.test.js.map