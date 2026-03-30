import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  writeSession,
  readSession,
  updateSession,
  completeStage,
  getResumeInfo,
  endSession,
} from '../dist/scripts/core/session-state.js';

const TEST_DIR = join(import.meta.dirname, '.test-session-tmp');

describe('Session State Manager', () => {
  before(() => mkdirSync(TEST_DIR, { recursive: true }));
  after(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it('should create a session', () => {
    const result = writeSession({
      feature: 'auth-upgrade',
      mode: 'team',
      currentStage: 'team-plan',
      planPath: '.aing/plans/2026-03-25-auth.md',
    }, TEST_DIR);
    assert.equal(result.ok, true);
  });

  it('should read a session', () => {
    const session = readSession('team', TEST_DIR);
    assert.ok(session);
    assert.equal(session.feature, 'auth-upgrade');
    assert.equal(session.currentStage, 'team-plan');
    assert.equal(session.active, true);
  });

  it('should update session fields', () => {
    updateSession('team', { fixLoopCount: 1 }, TEST_DIR);
    const session = readSession('team', TEST_DIR);
    assert.equal(session.fixLoopCount, 1);
  });

  it('should complete a stage and advance', () => {
    completeStage('team', 'team-plan', { status: 'success', summary: 'Plan created' }, TEST_DIR);
    const session = readSession('team', TEST_DIR);
    assert.equal(session.currentStage, 'team-exec');
    assert.equal(session.stageResults['team-plan'].status, 'success');
  });

  it('should get resume info', () => {
    const info = getResumeInfo('team', TEST_DIR);
    assert.equal(info.canResume, true);
    assert.equal(info.feature, 'auth-upgrade');
    assert.equal(info.currentStage, 'team-exec');
    assert.deepEqual(info.completedStages, ['team-plan']);
  });

  it('should end a session', () => {
    endSession('team', 'complete', TEST_DIR);
    const session = readSession('team', TEST_DIR);
    assert.equal(session.active, false);
    assert.equal(session.endReason, 'complete');
  });

  it('should return canResume=false for ended session', () => {
    const info = getResumeInfo('team', TEST_DIR);
    assert.equal(info.canResume, false);
  });

  it('should return null for nonexistent session', () => {
    const session = readSession('nonexistent', TEST_DIR);
    assert.equal(session, null);
  });
});
