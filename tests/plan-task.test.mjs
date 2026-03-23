/**
 * TDD: Plan Manager + Task Manager integration tests
 * Verifies that plans and tasks are correctly persisted to .sw-kit/ directories.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), `sw-kit-test-${Date.now()}`);

describe('Plan Manager', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('createPlan should create .sw-kit/plans/{date}-{feature}.md', async () => {
    const { createPlan } = await import('../scripts/task/plan-manager.mjs');

    const result = createPlan({
      feature: 'auth-api',
      goal: 'Implement user authentication',
      steps: ['Create login endpoint', 'Add JWT middleware', 'Write tests'],
      acceptanceCriteria: ['Login returns JWT', 'Protected routes require token'],
      risks: ['Token expiry handling'],
    }, TEST_DIR);

    assert.equal(result.ok, true, 'createPlan should succeed');
    assert.ok(result.planPath, 'planPath should be set');
    assert.ok(result.taskId, 'taskId should be set');

    // Verify plan file exists in .sw-kit/plans/
    assert.ok(existsSync(result.planPath), `Plan file should exist at ${result.planPath}`);
    assert.ok(result.planPath.includes('.sw-kit/plans/'), 'Plan path should be under .sw-kit/plans/');
    assert.ok(result.planPath.endsWith('-auth-api.md'), 'Plan file should end with feature name');

    // Verify plan content
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('# Plan: auth-api'), 'Plan should contain title');
    assert.ok(content.includes('Implement user authentication'), 'Plan should contain goal');
    assert.ok(content.includes('Create login endpoint'), 'Plan should contain steps');
    assert.ok(content.includes('Login returns JWT'), 'Plan should contain acceptance criteria');
    assert.ok(content.includes('Token expiry handling'), 'Plan should contain risks');
  });

  it('createPlan should also create a task with subtasks', async () => {
    const { createPlan } = await import('../scripts/task/plan-manager.mjs');

    const result = createPlan({
      feature: 'search',
      goal: 'Add search functionality',
      steps: ['Build index', 'Add search API', 'Add UI'],
    }, TEST_DIR);

    assert.equal(result.ok, true);
    assert.ok(result.taskId.startsWith('task-'), 'Task ID should start with task-');

    // Verify task file exists in .sw-kit/tasks/
    const taskPath = join(TEST_DIR, '.sw-kit', 'tasks', `${result.taskId}.json`);
    assert.ok(existsSync(taskPath), `Task file should exist at ${taskPath}`);

    const task = JSON.parse(readFileSync(taskPath, 'utf-8'));
    assert.equal(task.title, '[Plan] search');
    assert.equal(task.subtasks.length, 3, 'Should have 3 subtasks');
    assert.equal(task.subtasks[0].title, 'Build index');
    assert.equal(task.subtasks[0].status, 'pending');
  });

  it('listPlans should return created plans', async () => {
    const { listPlans } = await import('../scripts/task/plan-manager.mjs');

    const plans = listPlans(TEST_DIR);
    assert.ok(plans.length >= 2, 'Should have at least 2 plans');
    assert.ok(plans.some(p => p.feature === 'auth-api'), 'Should include auth-api plan');
    assert.ok(plans.some(p => p.feature === 'search'), 'Should include search plan');
  });

  it('getPlan should return plan content', async () => {
    const { getPlan } = await import('../scripts/task/plan-manager.mjs');

    const content = getPlan('auth-api', TEST_DIR);
    assert.ok(content, 'getPlan should return content');
    assert.ok(content.includes('# Plan: auth-api'), 'Should contain plan title');
  });
});

describe('Task Manager', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  it('createTask should create .sw-kit/tasks/{id}.json', async () => {
    const { createTask } = await import('../scripts/task/task-manager.mjs');

    const result = createTask({
      title: 'Implement Auth',
      feature: 'auth',
      description: 'Full auth system',
      subtasks: [
        { title: 'Login API' },
        { title: 'JWT middleware' },
        { title: 'Unit tests' },
      ],
    }, TEST_DIR);

    assert.equal(result.ok, true);
    assert.ok(result.taskId.startsWith('task-'));
    assert.equal(result.task.subtasks.length, 3);
    assert.equal(result.task.status, 'in-progress');

    // Verify file location
    const taskPath = join(TEST_DIR, '.sw-kit', 'tasks', `${result.taskId}.json`);
    assert.ok(existsSync(taskPath), 'Task file should exist in .sw-kit/tasks/');
  });

  it('checkSubtask should mark subtask as done', async () => {
    const { createTask, checkSubtask } = await import('../scripts/task/task-manager.mjs');

    const { taskId } = createTask({
      title: 'Test Task',
      subtasks: [{ title: 'Step 1' }, { title: 'Step 2' }],
    }, TEST_DIR);

    const result = checkSubtask(taskId, 1, TEST_DIR);
    assert.equal(result.ok, true);
    assert.equal(result.subtask.status, 'done');
    assert.equal(result.taskComplete, false, 'Task should not be complete yet');
  });

  it('checkSubtask should complete main task when all subtasks done', async () => {
    const { createTask, checkSubtask, getTask } = await import('../scripts/task/task-manager.mjs');

    const { taskId } = createTask({
      title: 'Small Task',
      subtasks: [{ title: 'Only step' }],
    }, TEST_DIR);

    const result = checkSubtask(taskId, 1, TEST_DIR);
    assert.equal(result.ok, true);
    assert.equal(result.taskComplete, true, 'Task should be complete');

    const task = getTask(taskId, TEST_DIR);
    assert.equal(task.status, 'completed');
    assert.ok(task.completedAt, 'completedAt should be set');
  });

  it('listTasks should return task index', async () => {
    const { listTasks } = await import('../scripts/task/task-manager.mjs');

    const tasks = listTasks(TEST_DIR);
    assert.ok(tasks.length >= 1, 'Should have at least 1 task');
  });
});

describe('persist.mjs CLI', () => {
  const CLI_TEST_DIR = join(tmpdir(), `sw-kit-cli-test-${Date.now()}`);
  const persistPath = new URL('../scripts/cli/persist.mjs', import.meta.url).pathname;

  before(() => {
    mkdirSync(CLI_TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(CLI_TEST_DIR, { recursive: true, force: true });
  });

  it('persist.mjs plan should create files in .sw-kit/plans/', () => {
    const output = execFileSync('node', [
      persistPath, 'plan',
      '--dir', CLI_TEST_DIR,
      '--feature', 'cli-test',
      '--goal', 'Test CLI',
      '--steps', 'step1|step2',
    ], { encoding: 'utf-8' });

    const result = JSON.parse(output);
    assert.equal(result.ok, true, 'CLI plan should succeed');
    assert.ok(result.planPath.includes('.sw-kit/plans/'), `Plan should be in .sw-kit/plans/, got: ${result.planPath}`);
    assert.ok(existsSync(result.planPath), 'Plan file should exist on disk');

    // Verify task was also created
    const tasksDir = join(CLI_TEST_DIR, '.sw-kit', 'tasks');
    assert.ok(existsSync(tasksDir), '.sw-kit/tasks/ directory should exist');
    const taskFiles = readdirSync(tasksDir).filter(f => f.startsWith('task-') && f.endsWith('.json'));
    assert.ok(taskFiles.length > 0, 'At least one task file should be created');
  });

  it('persist.mjs plan should fail without required args', () => {
    assert.throws(() => {
      execFileSync('node', [persistPath, 'plan', '--dir', CLI_TEST_DIR, '--feature', 'x'], { encoding: 'utf-8' });
    }, 'Should throw for missing --goal and --steps');
  });

  it('persist.mjs list-plans should show created plans', () => {
    const output = execFileSync('node', [
      persistPath, 'list-plans',
      '--dir', CLI_TEST_DIR,
    ], { encoding: 'utf-8' });

    const result = JSON.parse(output);
    assert.equal(result.ok, true);
    assert.ok(result.plans.length > 0, 'Should list at least 1 plan');
    assert.ok(result.plans.some(p => p.feature === 'cli-test'), 'Should include cli-test plan');
  });
});
