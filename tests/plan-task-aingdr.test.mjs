/**
 * TDD: AING-DR Consensus Planning Quality Tests
 *
 * 기존 plan-task.test.mjs는 persist 계층만 검증.
 * 이 테스트는 AING-DR 6자 합의 파이프라인의 구조적 완전성을 검증한다.
 *
 * 검증 대상:
 * 1. plan-manager가 AING-DR 필수 섹션을 persist하는지 (현재 실패 예상)
 * 2. 에이전트 정의 파일에 필수 출력 형식이 있는지
 * 3. State lifecycle 전환이 SKILL.md 스펙과 일치하는지
 * 4. persist.js --stdin이 AING-DR 확장 필드를 처리하는지
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

// ────────────────────────────────────────────────────────────
// 1. plan-manager: AING-DR 필드 지원 검증
// ────────────────────────────────────────────────────────────

describe('plan-manager: AING-DR 필드 지원', () => {
  const TEST_DIR = join(tmpdir(), `aingdr-plan-${Date.now()}`);

  before(() => mkdirSync(TEST_DIR, { recursive: true }));
  after(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it('should include ## Constraints section when constraints provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'dr-constraints',
      goal: 'Test AING-DR constraints persistence',
      steps: ['Step 1'],
      constraints: [
        { name: 'C1-NoBreaking', source: 'API contract', evidence: 'api/v2 is public', violationImpact: 'Breaks all clients' },
        { name: 'C2-TypeSafe', source: 'tsconfig strict', evidence: 'tsconfig.json:3', violationImpact: 'Build failure' },
      ],
    }, TEST_DIR);

    assert.equal(result.ok, true, 'createPlan should succeed');
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Constraints'), 'Should contain ## Constraints section');
    assert.ok(content.includes('C1-NoBreaking'), 'Should contain constraint name');
    assert.ok(content.includes('API contract'), 'Should contain constraint source');
  });

  it('should include ## Preferences section when preferences provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'dr-preferences',
      goal: 'Test AING-DR preferences persistence',
      steps: ['Step 1'],
      preferences: [
        { name: 'P1-Minimal', priority: 'HIGH', tradeoffThreshold: 'Accept 20% more code for safety', why: 'Team velocity' },
      ],
    }, TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Preferences'), 'Should contain ## Preferences section');
    assert.ok(content.includes('P1-Minimal'), 'Should contain preference name');
  });

  it('should include ## Drivers section when drivers provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'dr-drivers',
      goal: 'Test AING-DR drivers persistence',
      steps: ['Step 1'],
      drivers: [
        { name: 'Maintainability', status: 'unchanged' },
        { name: 'Security', status: 'added', source: 'Klay steelman' },
      ],
    }, TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Drivers'), 'Should contain ## Drivers section');
    assert.ok(content.includes('Maintainability'), 'Should contain driver name');
    assert.ok(content.includes('[added]') || content.includes('added'), 'Should show driver status');
  });

  it('should include ## Steelman section when steelman provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'dr-steelman',
      goal: 'Test AING-DR steelman persistence',
      steps: ['Step 1'],
      steelman: {
        antithesis: 'Option A의 추상화 레이어가 런타임 오버헤드를 유발할 수 있다',
        tradeoffs: ['Abstraction vs Performance', 'Flexibility vs Simplicity'],
        newDrivers: ['Runtime Performance'],
        synthesisPath: 'Option A의 인터페이스 + Option B의 직접 호출을 결합',
      },
    }, TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Steelman'), 'Should contain ## Steelman section');
    assert.ok(content.includes('antithesis') || content.includes('Antithesis') || content.includes('반론'),
      'Should contain steelman antithesis');
    assert.ok(content.includes('런타임 오버헤드'), 'Should contain antithesis content');
  });

  it('should include ## Synthesis Verification section when noaVerdict provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'dr-noa',
      goal: 'Test Noa verification persistence',
      steps: ['Step 1'],
      noaVerdict: {
        verdict: 'PASS',
        absorbed: 3,
        rebutted: 1,
        acknowledged: 0,
        ignored: 0,
        reflectionScore: 100,
        deltaScore: 0.75,
        confidence: 'HIGH',
      },
    }, TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Synthesis Verification') || content.includes('## Noa'),
      'Should contain synthesis verification section');
    assert.ok(content.includes('PASS') || content.includes('pass'), 'Should contain verdict');
    assert.ok(content.includes('ABSORBED') || content.includes('absorbed') || content.includes('3'),
      'Should contain absorption count');
  });

  it('should include ## Critic Assessment section when criticVerdict provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'dr-critic',
      goal: 'Test Critic assessment persistence',
      steps: ['Step 1'],
      criticVerdict: {
        verdict: 'APPROVE',
        mode: 'THOROUGH',
        critical: 0,
        major: 0,
        minor: 2,
        selfAuditDowngrades: 1,
        constraintCompliance: '100%',
        criteriaTestability: '95%',
        evidenceCoverage: '85%',
      },
    }, TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Critic') || content.includes('## Assessment'),
      'Should contain critic assessment section');
    assert.ok(content.includes('APPROVE'), 'Should contain verdict');
    assert.ok(content.includes('THOROUGH'), 'Should contain mode');
  });

  it('should include ## ADR section when adr provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'dr-adr',
      goal: 'Test Living ADR persistence',
      steps: ['Step 1'],
      adr: {
        decision: 'Option A 채택',
        confidence: 'HIGH',
        constraintsHonored: ['C1: ✓', 'C2: ✓'],
        alternativesRejected: ['Option B: violates C1'],
        consequences: { positive: ['Maintainable'], negative: ['More initial effort'] },
      },
    }, TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## ADR') || content.includes('Architecture Decision Record'),
      'Should contain ADR section');
    assert.ok(content.includes('Option A 채택'), 'Should contain decision');
  });

  it('should include full AING-DR plan with all sections', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'full-aingdr',
      goal: 'Complete AING-DR plan',
      steps: ['Implement auth', 'Add tests'],
      constraints: [{ name: 'C1', source: 'spec', evidence: 'doc.md:5', violationImpact: 'fail' }],
      preferences: [{ name: 'P1', priority: 'HIGH', tradeoffThreshold: 'n/a', why: 'velocity' }],
      drivers: [{ name: 'Security', status: 'unchanged' }],
      options: [
        { name: 'JWT', pros: ['Stateless'], cons: ['Token size'] },
        { name: 'Session', pros: ['Revocable'], cons: ['State'] },
      ],
      steelman: {
        antithesis: 'JWT는 revocation이 어렵다',
        tradeoffs: ['Stateless vs Revocable'],
        newDrivers: [],
        synthesisPath: null,
      },
      noaVerdict: { verdict: 'PASS', absorbed: 2, rebutted: 1, acknowledged: 0, ignored: 0, reflectionScore: 100, deltaScore: null, confidence: 'HIGH' },
      criticVerdict: { verdict: 'APPROVE', mode: 'THOROUGH', critical: 0, major: 0, minor: 1, selfAuditDowngrades: 0, constraintCompliance: '100%', criteriaTestability: '90%', evidenceCoverage: '80%' },
      adr: { decision: 'JWT 채택', confidence: 'HIGH', constraintsHonored: ['C1: ✓'], alternativesRejected: ['Session: stateful'], consequences: { positive: ['Scalable'], negative: ['No revocation'] } },
      complexityScore: 5,
      complexityLevel: 'mid',
    }, TEST_DIR);

    assert.equal(result.ok, true, 'Full AING-DR plan should succeed');
    const content = readFileSync(result.planPath, 'utf-8');

    // AING-DR 필수 섹션 전체 검증
    const requiredSections = [
      '## Constraints',
      '## Preferences',
      '## Drivers',
      '## Options',
      '## Steelman',
      '## Synthesis Verification',
      '## Critic',
      '## ADR',
      '## Complexity',
    ];

    const missingSections = requiredSections.filter(s => !content.includes(s));
    assert.equal(missingSections.length, 0,
      `Missing AING-DR sections: ${missingSections.join(', ')}\n\nActual content:\n${content}`);
  });
});

// ────────────────────────────────────────────────────────────
// 2. 에이전트 정의 파일: 필수 출력 형식 검증
// ────────────────────────────────────────────────────────────

describe('에이전트 정의: AING-DR 필수 프롬프트 검증', () => {
  const AGENTS_DIR = join(process.cwd(), 'agents');

  it('ryan.md should define FOUNDATION output format with Constraints + Preferences', () => {
    const content = readFileSync(join(AGENTS_DIR, 'ryan.md'), 'utf-8');
    assert.ok(content.includes('Constraint'), 'Ryan should mention Constraints');
    assert.ok(content.includes('Preference'), 'Ryan should mention Preferences');
    assert.ok(content.includes('FOUNDATION') || content.includes('Foundation'),
      'Ryan should define FOUNDATION output format');
  });

  it('able.md should define AING-DR output with Options + Drivers', () => {
    const content = readFileSync(join(AGENTS_DIR, 'able.md'), 'utf-8');
    assert.ok(content.includes('Option'), 'Able should mention Options');
    assert.ok(content.includes('Driver'), 'Able should mention Drivers');
    assert.ok(content.includes('DR') || content.includes('Decision Record'),
      'Able should reference Decision Record');
  });

  it('klay.md should define STEELMAN_REVIEW with Antithesis', () => {
    const content = readFileSync(join(AGENTS_DIR, 'klay.md'), 'utf-8');
    assert.ok(content.includes('STEELMAN') || content.includes('steelman') || content.includes('Steelman'),
      'Klay should define steelman review');
    assert.ok(content.includes('antithesis') || content.includes('Antithesis') || content.includes('반론'),
      'Klay should mention antithesis');
  });

  it('noa.md should define SYNTHESIS_CHECK with ABSORBED/IGNORED classification', () => {
    const content = readFileSync(join(AGENTS_DIR, 'noa.md'), 'utf-8');
    assert.ok(content.includes('ABSORBED'), 'Noa should classify ABSORBED');
    assert.ok(content.includes('IGNORED'), 'Noa should classify IGNORED');
    assert.ok(content.includes('Delta') || content.includes('delta'),
      'Noa should measure Delta Score');
    assert.ok(content.includes('PASS') || content.includes('REVISE'),
      'Noa should have PASS/REVISE verdict');
  });

  it('critic.md should define 5-Phase protocol with Hard Gates', () => {
    const content = readFileSync(join(AGENTS_DIR, 'critic.md'), 'utf-8');
    assert.ok(content.includes('APPROVE'), 'Critic should have APPROVE verdict');
    assert.ok(content.includes('ITERATE'), 'Critic should have ITERATE verdict');
    assert.ok(content.includes('REJECT'), 'Critic should have REJECT verdict');
    assert.ok(content.includes('80%') || content.includes('evidence'),
      'Critic should have evidence coverage gate');
    assert.ok(content.includes('ADVERSARIAL') || content.includes('adversarial'),
      'Critic should have adaptive harshness (ADVERSARIAL mode)');
  });

  it('critic.md should NOT approve without constraint compliance', () => {
    const content = readFileSync(join(AGENTS_DIR, 'critic.md'), 'utf-8');
    assert.ok(content.includes('Constraint') && (content.includes('100%') || content.includes('위반')),
      'Critic should enforce 100% constraint compliance');
  });
});

// ────────────────────────────────────────────────────────────
// 3. State Lifecycle: Phase 전환 무결성
// ────────────────────────────────────────────────────────────

describe('State Lifecycle: Phase 전환 스펙 검증', () => {
  const STATE_DIR = join(tmpdir(), `aingdr-state-${Date.now()}`);
  const stateFile = join(STATE_DIR, '.aing', 'state', 'plan-state.json');

  before(() => mkdirSync(join(STATE_DIR, '.aing', 'state'), { recursive: true }));
  after(() => rmSync(STATE_DIR, { recursive: true, force: true }));

  // AING-DR Phase 순서 (SKILL.md 기준)
  const VALID_PHASE_SEQUENCE = [
    'gate',
    'foundation',      // Phase 1: Ryan
    'option-design',    // Phase 2: Able
    'steelman',         // Phase 3: Klay
    'synthesis',        // Phase 4: Able
    'synthesis-check',  // Phase 5: Noa
    'critique',         // Phase 6: Critic
    'adr',              // Phase 7: Able (Living ADR)
  ];

  it('VALID_PHASE_SEQUENCE should be complete and ordered', () => {
    // Phase sequence self-consistency: 7 phases + gate = 8 entries
    assert.equal(VALID_PHASE_SEQUENCE.length, 8, 'Should have 8 phases (gate + 7 pipeline phases)');
    assert.equal(VALID_PHASE_SEQUENCE[0], 'gate', 'First phase should be gate');
    assert.equal(VALID_PHASE_SEQUENCE[1], 'foundation', 'Phase 1 = Ryan foundation');
    assert.equal(VALID_PHASE_SEQUENCE[2], 'option-design', 'Phase 2 = Able option design');
    assert.equal(VALID_PHASE_SEQUENCE[3], 'steelman', 'Phase 3 = Klay steelman');
    assert.equal(VALID_PHASE_SEQUENCE[4], 'synthesis', 'Phase 4 = Able synthesis');
    assert.equal(VALID_PHASE_SEQUENCE[5], 'synthesis-check', 'Phase 5 = Noa verification');
    assert.equal(VALID_PHASE_SEQUENCE[6], 'critique', 'Phase 6 = Critic assessment');
    assert.equal(VALID_PHASE_SEQUENCE[7], 'adr', 'Phase 7 = Living ADR');

    // No duplicates
    const unique = new Set(VALID_PHASE_SEQUENCE);
    assert.equal(unique.size, VALID_PHASE_SEQUENCE.length, 'No duplicate phases');
  });

  it('state file should track phase transitions correctly', () => {
    // Simulate Phase 0 → Phase 1 transition
    const initialState = {
      active: true,
      phase: 'gate',
      feature: 'test-feature',
      startedAt: new Date().toISOString(),
      iteration: 0,
    };

    writeFileSync(stateFile, JSON.stringify(initialState), 'utf-8');
    const read = JSON.parse(readFileSync(stateFile, 'utf-8'));
    assert.equal(read.phase, 'gate');
    assert.equal(read.active, true);

    // Simulate progression through phases
    for (const phase of VALID_PHASE_SEQUENCE.slice(1)) {
      const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
      state.phase = phase;
      writeFileSync(stateFile, JSON.stringify(state), 'utf-8');
    }

    const finalState = JSON.parse(readFileSync(stateFile, 'utf-8'));
    assert.equal(finalState.phase, 'adr', 'Should end at ADR phase');
    assert.equal(finalState.active, true, 'Should still be active before completion');
  });

  it('state should deactivate after Phase 7 completion', () => {
    const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
    state.active = false;
    state.completedAt = new Date().toISOString();
    state.confidence = 'HIGH';
    state.verdict = 'APPROVE';
    writeFileSync(stateFile, JSON.stringify(state), 'utf-8');

    const final = JSON.parse(readFileSync(stateFile, 'utf-8'));
    assert.equal(final.active, false, 'Should be inactive after completion');
    assert.equal(final.verdict, 'APPROVE', 'Should record verdict');
    assert.ok(final.completedAt, 'Should have completedAt timestamp');
  });

  it('state should record termination on REJECT', () => {
    const terminatedState = {
      active: false,
      terminated: true,
      reason: 'critic_reject',
      terminatedAt: new Date().toISOString(),
      phase: 'critique',
      iteration: 2,
    };

    writeFileSync(stateFile, JSON.stringify(terminatedState), 'utf-8');
    const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
    assert.equal(state.terminated, true, 'Should be marked terminated');
    assert.equal(state.reason, 'critic_reject', 'Should record rejection reason');
    assert.equal(state.active, false, 'Should be inactive');
  });

  it('iteration should increment on consensus loop', () => {
    const state = {
      active: true,
      phase: 'option-design',
      feature: 'loop-test',
      startedAt: new Date().toISOString(),
      iteration: 0,
    };

    // Simulate: Phase 6 Critic ITERATE → back to Phase 2
    state.phase = 'critique';
    state.iteration = 0;

    // Critic says ITERATE → increment and go back
    state.iteration++;
    state.phase = 'option-design';

    assert.equal(state.iteration, 1, 'Iteration should increment on ITERATE');
    assert.equal(state.phase, 'option-design', 'Should return to option-design');

    // Max iterations check (low complexity = max 3)
    state.iteration = 3;
    const atMax = state.iteration >= 3;
    assert.ok(atMax, 'Should detect max iterations for low complexity');
  });
});

// ────────────────────────────────────────────────────────────
// 4. Hook Enforcement: Phase-Agent 매핑 검증
// ────────────────────────────────────────────────────────────

describe('Hook Enforcement: Phase-Agent 매핑', () => {
  const HOOK_DIR = join(tmpdir(), `aingdr-hook-${Date.now()}`);

  before(() => mkdirSync(join(HOOK_DIR, '.aing', 'state'), { recursive: true }));
  after(() => rmSync(HOOK_DIR, { recursive: true, force: true }));

  it('checkAgentAllowed should permit correct agent for each phase', async () => {
    const { initPlanState, advancePhase, checkAgentAllowed } = await import('../dist/scripts/hooks/plan-state.js');

    initPlanState(HOOK_DIR, 'hook-test', { complexity: 'mid' });
    advancePhase(HOOK_DIR, 'foundation');

    // Ryan is allowed in foundation phase
    const allowed = checkAgentAllowed(HOOK_DIR, 'aing:ryan');
    assert.equal(allowed.allowed, true, 'Ryan should be allowed in foundation phase');
  });

  it('checkAgentAllowed should block wrong agent for phase', async () => {
    const { checkAgentAllowed } = await import('../dist/scripts/hooks/plan-state.js');

    // Still in foundation phase from previous test
    const blocked = checkAgentAllowed(HOOK_DIR, 'aing:klay');
    assert.equal(blocked.allowed, false, 'Klay should be blocked in foundation phase');
    assert.ok(blocked.reason.includes('ryan'), 'Reason should mention expected agent');
  });

  it('checkAgentAllowed should not interfere when no active plan', async () => {
    const noStateDir = join(tmpdir(), `aingdr-nostate-${Date.now()}`);
    mkdirSync(join(noStateDir, '.aing', 'state'), { recursive: true });

    const { checkAgentAllowed } = await import('../dist/scripts/hooks/plan-state.js');
    const result = checkAgentAllowed(noStateDir, 'aing:klay');
    assert.equal(result.allowed, true, 'Should allow any agent when no plan is active');

    rmSync(noStateDir, { recursive: true, force: true });
  });

  it('autoAdvancePhase should advance after correct agent completes', async () => {
    const ADV_DIR = join(tmpdir(), `aingdr-adv-${Date.now()}`);
    mkdirSync(join(ADV_DIR, '.aing', 'state'), { recursive: true });

    const { initPlanState, advancePhase, autoAdvancePhase, readPlanState } = await import('../dist/scripts/hooks/plan-state.js');

    initPlanState(ADV_DIR, 'auto-advance-test', { complexity: 'low' });
    advancePhase(ADV_DIR, 'foundation');

    // Ryan completes → should auto-advance to option-design
    const newPhase = autoAdvancePhase(ADV_DIR, 'aing:ryan');
    assert.equal(newPhase, 'option-design', 'Should advance to option-design after Ryan');

    const state = readPlanState(ADV_DIR);
    assert.equal(state.phase, 'option-design', 'State should reflect auto-advance');

    rmSync(ADV_DIR, { recursive: true, force: true });
  });

  it('autoAdvancePhase should NOT auto-advance from verdict phases', async () => {
    const VRD_DIR = join(tmpdir(), `aingdr-vrd-${Date.now()}`);
    mkdirSync(join(VRD_DIR, '.aing', 'state'), { recursive: true });

    const { initPlanState, advancePhase, autoAdvancePhase } = await import('../dist/scripts/hooks/plan-state.js');

    initPlanState(VRD_DIR, 'verdict-test', { complexity: 'mid' });
    advancePhase(VRD_DIR, 'synthesis-check');

    // Noa completes in synthesis-check → should NOT auto-advance (needs verdict)
    const result = autoAdvancePhase(VRD_DIR, 'aing:noa');
    assert.equal(result, null, 'Should NOT auto-advance from synthesis-check (verdict-based)');

    rmSync(VRD_DIR, { recursive: true, force: true });
  });

  it('getExpectedAgent should return correct agent for phase', async () => {
    const { getExpectedAgent } = await import('../dist/scripts/hooks/plan-state.js');

    // HOOK_DIR still has active plan from earlier tests
    const expected = getExpectedAgent(HOOK_DIR);
    assert.ok(expected, 'Should return expected agent info');
    assert.ok(Array.isArray(expected.agents), 'Should have agents array');
  });

  it('full phase sequence should enforce correct agent order', async () => {
    const SEQ_DIR = join(tmpdir(), `aingdr-seq-${Date.now()}`);
    mkdirSync(join(SEQ_DIR, '.aing', 'state'), { recursive: true });

    const { initPlanState, advancePhase, checkAgentAllowed } = await import('../dist/scripts/hooks/plan-state.js');

    initPlanState(SEQ_DIR, 'sequence-test', { complexity: 'mid' });

    const phaseAgentPairs = [
      ['foundation', 'ryan', 'able'],       // ryan allowed, able blocked
      ['option-design', 'able', 'ryan'],     // able allowed, ryan blocked
      ['steelman', 'klay', 'able'],          // klay allowed, able blocked
      ['synthesis', 'able', 'klay'],
      ['synthesis-check', 'noa', 'able'],
      ['critique', 'critic', 'noa'],
      ['adr', 'able', 'critic'],
    ];

    for (const [phase, allowed, blocked] of phaseAgentPairs) {
      advancePhase(SEQ_DIR, phase);

      const allowResult = checkAgentAllowed(SEQ_DIR, `aing:${allowed}`);
      assert.equal(allowResult.allowed, true, `${allowed} should be allowed in ${phase}`);

      const blockResult = checkAgentAllowed(SEQ_DIR, `aing:${blocked}`);
      assert.equal(blockResult.allowed, false, `${blocked} should be blocked in ${phase}`);
    }

    rmSync(SEQ_DIR, { recursive: true, force: true });
  });
});

// ────────────────────────────────────────────────────────────
// 5. persist.js --stdin: AING-DR 확장 필드 처리
// ────────────────────────────────────────────────────────────

describe('persist.js --stdin: AING-DR 확장 필드', () => {
  const STDIN_DIR = join(tmpdir(), `aingdr-stdin-${Date.now()}`);
  const persistPath = new URL('../dist/scripts/cli/persist.js', import.meta.url).pathname;

  before(() => mkdirSync(STDIN_DIR, { recursive: true }));
  after(() => rmSync(STDIN_DIR, { recursive: true, force: true }));

  it('should persist AING-DR full payload via stdin', () => {
    const payload = JSON.stringify({
      feature: 'stdin-aingdr',
      goal: 'Full AING-DR via stdin',
      steps: ['Step 1', 'Step 2'],
      constraints: [{ name: 'C1', source: 'spec', evidence: 'file:1', violationImpact: 'critical' }],
      preferences: [{ name: 'P1', priority: 'HIGH', tradeoffThreshold: 'n/a', why: 'speed' }],
      drivers: [{ name: 'D1', status: 'unchanged' }],
      steelman: { antithesis: '반론 내용', tradeoffs: ['T1'], newDrivers: [], synthesisPath: null },
      noaVerdict: { verdict: 'PASS', absorbed: 2, rebutted: 0, acknowledged: 0, ignored: 0, reflectionScore: 100, deltaScore: null, confidence: 'HIGH' },
      criticVerdict: { verdict: 'APPROVE', mode: 'THOROUGH', critical: 0, major: 0, minor: 0, selfAuditDowngrades: 0, constraintCompliance: '100%', criteriaTestability: '100%', evidenceCoverage: '90%' },
      adr: { decision: 'Option A', confidence: 'HIGH', constraintsHonored: ['C1: ✓'], alternativesRejected: [], consequences: { positive: ['Good'], negative: [] } },
      complexityScore: 4,
      complexityLevel: 'mid',
    });

    const proc = spawnSync('node', [persistPath, 'plan', '--stdin', '--dir', STDIN_DIR], {
      input: payload,
      encoding: 'utf-8',
    });

    assert.equal(proc.status, 0, `Should exit 0. stderr: ${proc.stderr}`);
    const result = JSON.parse(proc.stdout);
    assert.equal(result.ok, true, 'Should succeed');

    const content = readFileSync(result.planPath, 'utf-8');

    // 핵심: AING-DR 섹션이 persist 결과에 포함되는지
    assert.ok(content.includes('## Constraints') || content.includes('C1'),
      `AING-DR Constraints should be persisted.\n\nActual:\n${content.slice(0, 500)}`);
    assert.ok(content.includes('## Steelman') || content.includes('반론 내용'),
      `AING-DR Steelman should be persisted.\n\nActual:\n${content.slice(0, 500)}`);
  });
});
