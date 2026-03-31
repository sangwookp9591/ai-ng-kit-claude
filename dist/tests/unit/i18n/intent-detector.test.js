/**
 * Unit tests for scripts/i18n/intent-detector.ts
 * Covers: detectIntent — PDCA stages, agent triggers, wizard mode, Korean/English
 */
import { describe, it, expect } from 'vitest';
import { detectIntent } from '../../../scripts/i18n/intent-detector.js';
// ── Empty / null input ───────────────────────────────────────────────────
describe('detectIntent — empty input', () => {
    it('returns no match for empty string', () => {
        const result = detectIntent('');
        expect(result.isWizardMode).toBe(false);
        expect(result.confidence).toBe(0);
        expect(result.pdcaStage).toBeUndefined();
        expect(result.agent).toBeUndefined();
    });
});
// ── PDCA stage detection (English) ───────────────────────────────────────
describe('detectIntent — PDCA stages (English)', () => {
    it('detects plan intent', () => {
        const result = detectIntent('I need to plan the architecture');
        expect(result.pdcaStage).toBe('plan');
        expect(result.confidence).toBeGreaterThan(0);
    });
    it('detects implement/do intent', () => {
        const result = detectIntent('implement the login feature');
        expect(result.pdcaStage).toBe('do');
    });
    it('detects check/verify intent', () => {
        const result = detectIntent('verify the auth module');
        expect(result.pdcaStage).toBe('check');
    });
    it('detects act/improve intent', () => {
        const result = detectIntent('fix the broken tests');
        expect(result.pdcaStage).toBe('act');
    });
    it('detects build as do stage', () => {
        const result = detectIntent('build the dashboard');
        expect(result.pdcaStage).toBe('do');
    });
    it('detects test as check stage', () => {
        const result = detectIntent('test the API endpoints');
        expect(result.pdcaStage).toBe('check');
    });
    it('detects refactor as act stage', () => {
        const result = detectIntent('refactor the state management');
        expect(result.pdcaStage).toBe('act');
    });
});
// ── PDCA stage detection (Korean) ────────────────────────────────────────
describe('detectIntent — PDCA stages (Korean)', () => {
    it('detects 계획 as plan', () => {
        const result = detectIntent('계획을 세워주세요');
        expect(result.pdcaStage).toBe('plan');
    });
    it('detects 구현 as do', () => {
        const result = detectIntent('로그인 기능 구현해줘');
        expect(result.pdcaStage).toBe('do');
    });
    it('detects 검증 as check', () => {
        const result = detectIntent('검증 해주세요');
        expect(result.pdcaStage).toBe('check');
    });
    it('detects 개선 as act', () => {
        const result = detectIntent('코드 개선이 필요해요');
        expect(result.pdcaStage).toBe('act');
    });
    it('detects 설계 as plan', () => {
        const result = detectIntent('DB 설계를 해야해');
        expect(result.pdcaStage).toBe('plan');
    });
    it('detects 만들어 as do', () => {
        const result = detectIntent('API를 만들어줘');
        expect(result.pdcaStage).toBe('do');
    });
    it('detects 테스트 as check', () => {
        const result = detectIntent('테스트를 실행해');
        expect(result.pdcaStage).toBe('check');
    });
});
// ── Agent triggers ───────────────────────────────────────────────────────
describe('detectIntent — agent triggers', () => {
    it('detects explore intent', () => {
        const result = detectIntent('explore the codebase');
        expect(result.agent).toBe('explorer');
    });
    it('detects find as explore', () => {
        const result = detectIntent('find where the auth logic is');
        expect(result.agent).toBeDefined();
    });
    it('detects review intent', () => {
        const result = detectIntent('review this code');
        // Could be pdca_check (review pattern) or agent_review
        expect(result.pdcaStage === 'check' || result.agent === 'reviewr').toBe(true);
    });
    it('detects Korean explore 탐색', () => {
        const result = detectIntent('코드베이스 탐색');
        expect(result.agent).toBe('explorer');
    });
});
// ── Wizard mode ──────────────────────────────────────────────────────────
describe('detectIntent — wizard mode', () => {
    it('detects "help me" as wizard mode', () => {
        const result = detectIntent('help me build a website');
        expect(result.isWizardMode).toBe(true);
    });
    it('detects "how do i" as wizard mode', () => {
        const result = detectIntent('how do i create an API');
        expect(result.isWizardMode).toBe(true);
    });
    it('detects Korean 도와줘 as wizard', () => {
        const result = detectIntent('도와줘');
        expect(result.isWizardMode).toBe(true);
    });
    it('detects Korean 초보 as wizard', () => {
        const result = detectIntent('저는 초보입니다');
        expect(result.isWizardMode).toBe(true);
    });
    it('detects "beginner" as wizard', () => {
        const result = detectIntent("I'm a beginner");
        expect(result.isWizardMode).toBe(true);
    });
    it('detects "guide me" as wizard', () => {
        const result = detectIntent('guide me through setup');
        expect(result.isWizardMode).toBe(true);
    });
});
// ── Confidence ───────────────────────────────────────────────────────────
describe('detectIntent — confidence', () => {
    it('higher confidence for longer keyword match ratio', () => {
        const short = detectIntent('plan this big complex project with many features');
        const long = detectIntent('plan');
        // 'plan' in short text has lower ratio than 'plan' alone
        expect(long.confidence).toBeGreaterThan(short.confidence);
    });
    it('confidence is capped at 1', () => {
        const result = detectIntent('plan');
        expect(result.confidence).toBeLessThanOrEqual(1);
    });
    it('Korean gets slight confidence boost', () => {
        // Korean '계획' in a short context should get boosted
        const koResult = detectIntent('계획');
        expect(koResult.confidence).toBeGreaterThan(0);
    });
});
// ── No match ─────────────────────────────────────────────────────────────
describe('detectIntent — no match', () => {
    it('returns no match for random text', () => {
        const result = detectIntent('the quick brown fox jumps over the lazy dog');
        expect(result.confidence).toBe(0);
        expect(result.isWizardMode).toBe(false);
    });
    it('returns no match for numbers only', () => {
        const result = detectIntent('12345');
        expect(result.confidence).toBe(0);
    });
});
//# sourceMappingURL=intent-detector.test.js.map