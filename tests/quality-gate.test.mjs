/**
 * Quality Gate Test: threshold 검증
 *
 * 검증 대상:
 * 1. measureEvidenceCoverage: file:line 참조 있는 라인 비율, threshold 80%
 * 2. measureCriteriaTestability: vague criteria 감지, threshold 90%
 * 3. measureConstraintCompliance: constraints honored 비율, threshold 100%
 * 4. checkQualityGate: 모든 threshold 충족 시 pass:true, 미충족 시 pass:false + failures
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
  measureEvidenceCoverage,
  measureCriteriaTestability,
  measureConstraintCompliance,
  checkQualityGate,
} = await import('../dist/scripts/hooks/quality-gate.js');

// ────────────────────────────────────────────────────────────
// 1. measureEvidenceCoverage — file:line 참조 비율
// ────────────────────────────────────────────────────────────

describe('measureEvidenceCoverage: evidence 비율 측정', () => {
  it('should return 100 when all technical claims cite file:line', () => {
    const planText = `
## Steps
- Modify src/foo.ts:42 to add new logic
- Update scripts/hooks/plan-state.ts:100 for phase handling
- Add handler in dist/index.js:10
`.trim();
    const result = measureEvidenceCoverage(planText);
    assert.ok(result >= 80, `Expected >= 80, got ${result}`);
  });

  it('should return low coverage when claims have no file references', () => {
    const planText = `
## Steps
- Add new logic somewhere
- Update phase handling
- Fix the handler
`.trim();
    const result = measureEvidenceCoverage(planText);
    assert.ok(result < 80, `Expected < 80 for uncited claims, got ${result}`);
  });

  it('should return 100 for empty plan (no technical claims)', () => {
    const result = measureEvidenceCoverage('## Overview\nJust a description\n');
    assert.equal(result, 100);
  });

  it('should return 100 for plan with no technical sections', () => {
    const planText = `
## Goal
Build a feature
## Acceptance Criteria
- [ ] Feature works
`.trim();
    const result = measureEvidenceCoverage(planText);
    assert.equal(result, 100);
  });

  it('should handle mixed: some claims with evidence, some without', () => {
    const planText = `
## Steps
- Modify src/auth.ts:55 for login
- Update something vague
- Fix scripts/api/router.js:30 endpoint
- Add new feature here
`.trim();
    const result = measureEvidenceCoverage(planText);
    // 2 out of 4 have evidence = 50%
    assert.ok(result < 80, `Mixed claims should be below threshold, got ${result}`);
    assert.ok(result > 0, `Should have some coverage, got ${result}`);
  });

  it('should treat .mjs files as valid evidence', () => {
    const planText = `
## Steps
- Update tests/plan-state.test.mjs:10 for coverage
`.trim();
    const result = measureEvidenceCoverage(planText);
    assert.ok(result >= 80, `mjs files should count as evidence, got ${result}`);
  });
});

// ────────────────────────────────────────────────────────────
// 2. measureCriteriaTestability — vague criteria 감지
// ────────────────────────────────────────────────────────────

describe('measureCriteriaTestability: vague criteria 감지', () => {
  it('should return 100 when all criteria are specific', () => {
    const planText = `
- [ ] API returns HTTP 200 with JSON body
- [x] Unit tests pass with coverage >= 90%
- [ ] Response time < 200ms for p99
`.trim();
    const result = measureCriteriaTestability(planText);
    assert.equal(result, 100);
  });

  it('should return below 90 when criteria contain vague words', () => {
    const planText = `
- [ ] API works properly
- [ ] System behaves well in good conditions
- [ ] Performance is adequate
`.trim();
    const result = measureCriteriaTestability(planText);
    assert.ok(result < 90, `Vague criteria should score below 90, got ${result}`);
  });

  it('should detect Korean vague words: 적절히, 빠르게, 충분히', () => {
    const planText = `
- [ ] 적절히 처리되어야 함
- [ ] 응답이 빠르게 반환됨
- [ ] 충분히 안전해야 함
`.trim();
    const result = measureCriteriaTestability(planText);
    assert.ok(result < 90, `Korean vague words should be detected, got ${result}`);
  });

  it('should detect English vague words: proper, good, fast, nice', () => {
    const planText = `
- [ ] Should be a good implementation
- [ ] Must have nice error messages
`.trim();
    const result = measureCriteriaTestability(planText);
    assert.ok(result < 90, `English vague words should be detected, got ${result}`);
  });

  it('should return 100 when no criteria exist', () => {
    const result = measureCriteriaTestability('## Goal\nNo criteria here');
    assert.equal(result, 100);
  });

  it('should handle mixed criteria: some vague, some specific', () => {
    const planText = `
- [ ] API returns 200 with valid JSON
- [ ] System behaves properly
- [ ] Error rate < 0.1%
- [ ] Logs contain adequate information
`.trim();
    const result = measureCriteriaTestability(planText);
    // 2 out of 4 are vague = 50% testable
    assert.ok(result < 90, `Mixed criteria should be below threshold, got ${result}`);
    assert.ok(result > 0, `Should have some testability, got ${result}`);
  });
});

// ────────────────────────────────────────────────────────────
// 3. measureConstraintCompliance — constraints honored 비율
// ────────────────────────────────────────────────────────────

describe('measureConstraintCompliance: constraint 준수 비율', () => {
  it('should return 100 when all constraints are honored', () => {
    const planJson = {
      constraints: [
        { name: 'C1', honored: true },
        { name: 'C2', honored: true },
        { name: 'C3', honored: true },
      ],
    };
    const result = measureConstraintCompliance(planJson);
    assert.equal(result, 100);
  });

  it('should return 0 when all constraints are violated', () => {
    const planJson = {
      constraints: [
        { name: 'C1', honored: false },
        { name: 'C2', honored: false },
      ],
    };
    const result = measureConstraintCompliance(planJson);
    assert.equal(result, 0);
  });

  it('should return partial compliance when some constraints violated', () => {
    const planJson = {
      constraints: [
        { name: 'C1', honored: true },
        { name: 'C2', honored: false },
        { name: 'C3', honored: true },
        { name: 'C4', honored: false },
      ],
    };
    const result = measureConstraintCompliance(planJson);
    assert.equal(result, 50); // 2/4 = 50%
  });

  it('should return 100 when constraints array is empty', () => {
    const planJson = { constraints: [] };
    const result = measureConstraintCompliance(planJson);
    assert.equal(result, 100);
  });

  it('should return 100 when no constraints key', () => {
    const planJson = {};
    const result = measureConstraintCompliance(planJson);
    assert.equal(result, 100);
  });

  it('should treat undefined honored as honored (not false)', () => {
    const planJson = {
      constraints: [
        { name: 'C1' }, // honored is undefined → treated as honored
        { name: 'C2', honored: false },
      ],
    };
    const result = measureConstraintCompliance(planJson);
    assert.equal(result, 50); // C1 honored, C2 not
  });
});

// ────────────────────────────────────────────────────────────
// 4. checkQualityGate — 통합 gate check
// ────────────────────────────────────────────────────────────

describe('checkQualityGate: 통합 quality gate 검증', () => {
  // 모든 threshold를 충족하는 완벽한 plan
  const perfectPlanText = `
## Steps
- Modify src/auth.ts:55 to add JWT validation
- Update scripts/hooks/plan-state.ts:100 for phase management
- Fix dist/router.js:30 endpoint routing

## Acceptance Criteria
- [ ] JWT validation returns 401 for invalid tokens
- [x] Phase transitions persist to .aing/state/plan-state.json
- [ ] Response time < 200ms for p99

## Feasibility
- src/auth.ts:55 confirms JWT library available
`.trim();

  const perfectPlanJson = {
    constraints: [
      { name: 'C1-NoBreaking', honored: true },
      { name: 'C2-TypeSafe', honored: true },
    ],
  };

  it('should return pass:true when all thresholds are met', () => {
    const result = checkQualityGate(perfectPlanText, perfectPlanJson, '', '');
    assert.equal(result.pass, true, `Expected pass:true, failures: ${result.failures.join(', ')}`);
    assert.equal(result.failures.length, 0);
  });

  it('should return pass:false when evidence coverage is below 80%', () => {
    const badPlanText = `
## Steps
- Add some logic
- Update something
- Fix the thing
`.trim();
    const result = checkQualityGate(badPlanText, perfectPlanJson, '', '');
    assert.equal(result.pass, false);
    assert.ok(result.failures.some(f => f.toLowerCase().includes('evidence')),
      `Expected evidence failure, got: ${result.failures.join(', ')}`);
  });

  it('should return pass:false when criteria testability is below 90%', () => {
    const vagueText = `
## Steps
- Modify src/auth.ts:10 for JWT

## Acceptance Criteria
- [ ] System works properly
- [ ] Performance is adequate
- [ ] Code is good
`.trim();
    const result = checkQualityGate(vagueText, perfectPlanJson, '', '');
    assert.equal(result.pass, false);
    assert.ok(result.failures.some(f => f.toLowerCase().includes('criteria') || f.toLowerCase().includes('testab')),
      `Expected testability failure, got: ${result.failures.join(', ')}`);
  });

  it('should return pass:false when constraint compliance is below 100%', () => {
    const violatedJson = {
      constraints: [
        { name: 'C1', honored: true },
        { name: 'C2', honored: false },
      ],
    };
    const result = checkQualityGate(perfectPlanText, violatedJson, '', '');
    assert.equal(result.pass, false);
    assert.ok(result.failures.some(f => f.toLowerCase().includes('constraint')),
      `Expected constraint failure, got: ${result.failures.join(', ')}`);
  });

  it('should return pass:false when FRAGILE assumptions are unaddressed', () => {
    const criticWithFragile = 'FRAGILE: assumption about external API availability not verified';
    const result = checkQualityGate(perfectPlanText, perfectPlanJson, criticWithFragile, '');
    assert.equal(result.pass, false);
    assert.ok(result.failures.some(f => f.toLowerCase().includes('fragile')),
      `Expected FRAGILE failure, got: ${result.failures.join(', ')}`);
  });

  it('should return pass:false when steelman points are IGNORED', () => {
    const noaWithIgnored = 'Point 1: IGNORED — synthesis did not address the latency concern';
    const result = checkQualityGate(perfectPlanText, perfectPlanJson, '', noaWithIgnored);
    assert.equal(result.pass, false);
    assert.ok(result.failures.some(f => f.toLowerCase().includes('steelman') || f.toLowerCase().includes('ignored')),
      `Expected IGNORED steelman failure, got: ${result.failures.join(', ')}`);
  });

  it('should include metrics in result', () => {
    const result = checkQualityGate(perfectPlanText, perfectPlanJson, '', '');
    assert.ok(typeof result.metrics === 'object');
    assert.ok('evidenceCoverage' in result.metrics);
    assert.ok('criteriaTestability' in result.metrics);
    assert.ok('constraintCompliance' in result.metrics);
  });

  it('should accumulate multiple failures when multiple thresholds fail', () => {
    const badText = `
## Steps
- Add logic without evidence
`.trim();
    const violatedJson = {
      constraints: [{ name: 'C1', honored: false }],
    };
    const result = checkQualityGate(badText, violatedJson, '', '');
    assert.equal(result.pass, false);
    assert.ok(result.failures.length >= 2, `Expected multiple failures, got ${result.failures.length}: ${result.failures.join(', ')}`);
  });
});
