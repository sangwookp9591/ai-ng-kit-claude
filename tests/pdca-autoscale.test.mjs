import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  getScalingProfile,
  startPdca,
  advancePdca,
  resetPdca,
  getPdcaStatus,
} from '../dist/scripts/pdca/pdca-engine.js';

const TEST_DIR = join(import.meta.dirname, '.test-pdca-autoscale-tmp');

describe('PDCA Auto-Scaling', () => {
  before(() => mkdirSync(join(TEST_DIR, '.aing', 'state'), { recursive: true }));
  after(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  describe('getScalingProfile', () => {
    it('should return low for score 0', () => {
      const profile = getScalingProfile(0);
      assert.equal(profile.level, 'low');
      assert.equal(profile.maxIterations, 1);
      assert.equal(profile.reviewTier, 'milla-only');
      assert.deepEqual(profile.reviewers, ['milla']);
      assert.deepEqual(profile.evidenceRequired, ['test']);
    });

    it('should return low for score 3', () => {
      const profile = getScalingProfile(3);
      assert.equal(profile.level, 'low');
      assert.equal(profile.maxIterations, 1);
      assert.equal(profile.reviewTier, 'milla-only');
    });

    it('should return mid for score 4', () => {
      const profile = getScalingProfile(4);
      assert.equal(profile.level, 'mid');
      assert.equal(profile.maxIterations, 2);
      assert.equal(profile.reviewTier, 'eng-design');
      assert.deepEqual(profile.reviewers, ['milla', 'willji']);
      assert.deepEqual(profile.evidenceRequired, ['test', 'build']);
    });

    it('should return mid for score 7', () => {
      const profile = getScalingProfile(7);
      assert.equal(profile.level, 'mid');
      assert.equal(profile.maxIterations, 2);
      assert.equal(profile.reviewTier, 'eng-design');
    });

    it('should return high for score 8', () => {
      const profile = getScalingProfile(8);
      assert.equal(profile.level, 'high');
      assert.equal(profile.maxIterations, 3);
      assert.equal(profile.reviewTier, 'full-pipeline');
      assert.deepEqual(profile.reviewers, ['simon', 'milla', 'willji', 'klay']);
      assert.deepEqual(profile.evidenceRequired, ['test', 'build', 'lint', 'security']);
    });

    it('should return high for score 15', () => {
      const profile = getScalingProfile(15);
      assert.equal(profile.level, 'high');
      assert.equal(profile.maxIterations, 3);
      assert.equal(profile.reviewTier, 'full-pipeline');
    });
  });

  describe('startPdca with complexityScore', () => {
    it('should set scalingProfile when complexityScore is provided', () => {
      const result = startPdca('feature-scaled', 10, TEST_DIR);
      assert.equal(result.ok, true);

      const status = getPdcaStatus('feature-scaled', TEST_DIR);
      assert.ok(status.scalingProfile);
      assert.equal(status.scalingProfile.level, 'high');
      assert.equal(status.scalingProfile.maxIterations, 3);
      assert.equal(status.maxIterations, 3);
    });

    it('should work without complexityScore (backward compat)', () => {
      const result = startPdca('feature-nosc', TEST_DIR);
      assert.equal(result.ok, true);

      const status = getPdcaStatus('feature-nosc', TEST_DIR);
      assert.equal(status.currentStage, 'plan');
      assert.equal(status.scalingProfile, undefined);
      assert.equal(status.maxIterations, undefined);
    });
  });

  describe('advancePdca uses feature maxIterations', () => {
    before(() => {
      resetPdca('feature-iter', TEST_DIR);
      startPdca('feature-iter', 1, TEST_DIR); // low → maxIterations=1
    });

    it('should respect feature maxIterations limit', () => {
      // plan → do
      advancePdca('feature-iter', null, TEST_DIR);
      let status = getPdcaStatus('feature-iter', TEST_DIR);
      assert.equal(status.currentStage, 'do');

      // do → check
      advancePdca('feature-iter', null, TEST_DIR);
      status = getPdcaStatus('feature-iter', TEST_DIR);
      assert.equal(status.currentStage, 'check');

      // check with low matchRate + iteration 0 < maxIterations(1) → act (iterate)
      advancePdca('feature-iter', { matchRate: 50 }, TEST_DIR);
      status = getPdcaStatus('feature-iter', TEST_DIR);
      assert.equal(status.currentStage, 'act');
      assert.equal(status.iteration, 1);

      // act → do (loop back)
      advancePdca('feature-iter', null, TEST_DIR);
      status = getPdcaStatus('feature-iter', TEST_DIR);
      assert.equal(status.currentStage, 'do');

      // do → check
      advancePdca('feature-iter', null, TEST_DIR);
      status = getPdcaStatus('feature-iter', TEST_DIR);
      assert.equal(status.currentStage, 'check');

      // check with low matchRate but iteration(1) >= maxIterations(1) → review (no more iterations)
      advancePdca('feature-iter', { matchRate: 50 }, TEST_DIR);
      status = getPdcaStatus('feature-iter', TEST_DIR);
      assert.equal(status.currentStage, 'review');
    });
  });
});
