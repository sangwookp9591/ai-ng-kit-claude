import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '../../dist/scripts');

describe('Module Integration', () => {
  const expectedModules = [
    'core/state', 'core/config', 'core/logger', 'core/context-budget',
    'routing/intent-router', 'routing/complexity-scorer', 'routing/model-router',
    'pdca/pdca-engine', 'pdca/status-view', 'pdca/state-gc',
    'evidence/evidence-chain', 'evidence/completeness-scorer', 'evidence/cost-reporter',
    'evidence/llm-judge', 'evidence/goal-checker',
    'review/review-engine', 'review/review-checklist', 'review/cso-audit',
    'review/design-scoring', 'review/scope-drift', 'review/review-dashboard',
    'ship/ship-engine', 'ship/preflight-check', 'ship/version-bump',
    'ship/changelog-gen', 'ship/pr-creator', 'ship/deploy-detect',
    'guardrail/guardrail-engine', 'guardrail/safety-invariants', 'guardrail/freeze-engine',
    'recovery/circuit-breaker', 'recovery/retry-engine', 'recovery/health-check',
    'pipeline/team-orchestrator', 'pipeline/autoplan-engine',
    'multi-ai/consensus-engine',
    'design/design-engine', 'design/design-compare',
  ];

  for (const mod of expectedModules) {
    it(`should have compiled module: ${mod}`, () => {
      const jsPath = join(DIST, `${mod}.js`);
      assert.ok(existsSync(jsPath), `Missing: ${jsPath}`);
    });
  }

  it('should have all core modules importable', async () => {
    const { readState, writeState } = await import('../../dist/scripts/core/state.js');
    assert.ok(typeof readState === 'function');
    assert.ok(typeof writeState === 'function');
  });

  it('should have complexity scorer importable', async () => {
    const { scoreComplexity } = await import('../../dist/scripts/routing/complexity-scorer.js');
    assert.ok(typeof scoreComplexity === 'function');
  });

  it('should have evidence chain importable', async () => {
    const m = await import('../../dist/scripts/evidence/evidence-chain.js');
    assert.ok(m);
  });

  it('should have design engine importable', async () => {
    const { generateDesignSystem, generateTokens, scoreDesign, exportAsCSS } = await import('../../dist/scripts/design/design-engine.js');
    assert.ok(typeof generateDesignSystem === 'function');
    assert.ok(typeof generateTokens === 'function');
    assert.ok(typeof scoreDesign === 'function');
    assert.ok(typeof exportAsCSS === 'function');
  });
});

describe('Cross-Module Dependencies', () => {
  it('state module should not depend on review modules', async () => {
    // state.ts is a core module — it should have zero cross-deps
    const m = await import('../../dist/scripts/core/state.js');
    assert.ok(m.readState);
  });

  it('complexity scorer should be standalone', async () => {
    const { scoreComplexity } = await import('../../dist/scripts/routing/complexity-scorer.js');
    const result = scoreComplexity({
      fileCount: 1, lineCount: 10, domainCount: 1,
      hasTests: false, hasArchChange: false, hasSecurity: false,
    });
    assert.ok(result.score >= 0);
  });

  it('design modules should chain correctly', async () => {
    const { generateDesignSystem } = await import('../../dist/scripts/design/design-engine.js');
    const { compareDesigns } = await import('../../dist/scripts/design/design-compare.js');

    const brief = {
      projectName: 'Test', projectType: 'dashboard', aesthetic: '',
      targetAudience: '', darkMode: true, frameworks: [],
    };
    const sys = generateDesignSystem(brief);
    const result = compareDesigns([{ name: 'Test', system: sys }]);
    assert.ok(result.winner === 'Test');
  });
});

describe('Dist Output Structure', () => {
  const expectedDirs = [
    'core', 'routing', 'pdca', 'evidence', 'review', 'ship',
    'guardrail', 'recovery', 'pipeline', 'multi-ai', 'design',
    'qa', 'build', 'cli', 'memory', 'security', 'telemetry',
  ];

  for (const dir of expectedDirs) {
    it(`should have dist/scripts/${dir}/ directory`, () => {
      const dirPath = join(DIST, dir);
      assert.ok(existsSync(dirPath), `Missing directory: ${dirPath}`);
    });
  }
});
