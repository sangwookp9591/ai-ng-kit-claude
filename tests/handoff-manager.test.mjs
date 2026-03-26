import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { writeHandoff, readHandoff, listHandoffs, getResumeContext } from '../scripts/pipeline/handoff-manager.mjs';

const TEST_DIR = join(import.meta.dirname, '.test-handoff-tmp');

describe('Handoff Manager', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should write a handoff document', () => {
    const result = writeHandoff({
      feature: 'auth-upgrade',
      stage: 'team-plan',
      summary: 'Planned OAuth2 migration in 5 steps',
      decisions: ['Use Clerk for auth', 'Keep session tokens in Redis'],
      artifacts: ['.aing/plans/2026-03-25-auth-upgrade.md'],
      nextStage: 'team-exec',
    }, TEST_DIR);

    assert.equal(result.ok, true);
    assert.ok(result.handoffPath.includes('team-plan'));
  });

  it('should read the latest handoff for a stage', () => {
    const content = readHandoff('auth-upgrade', 'team-plan', TEST_DIR);
    assert.ok(content);
    assert.ok(content.includes('OAuth2 migration'));
    assert.ok(content.includes('Use Clerk for auth'));
  });

  it('should list all handoffs for a feature', () => {
    // Write a second handoff
    writeHandoff({
      feature: 'auth-upgrade',
      stage: 'team-exec',
      summary: 'Executed 3 of 5 steps',
      decisions: ['Skipped step 4 (not needed)'],
      nextStage: 'team-verify',
    }, TEST_DIR);

    const handoffs = listHandoffs('auth-upgrade', TEST_DIR);
    assert.equal(handoffs.length, 2);
    assert.equal(handoffs[0].stage, 'team-exec');
  });

  it('should get resume context from latest handoff', () => {
    const ctx = getResumeContext('auth-upgrade', TEST_DIR);
    assert.equal(ctx.canResume, true);
    assert.equal(ctx.lastStage, 'team-exec');
    assert.equal(ctx.nextStage, 'team-verify');
    assert.ok(ctx.handoff.includes('Executed 3 of 5 steps'));
  });

  it('should return canResume=false for unknown feature', () => {
    const ctx = getResumeContext('nonexistent', TEST_DIR);
    assert.equal(ctx.canResume, false);
    assert.equal(ctx.lastStage, null);
  });
});
