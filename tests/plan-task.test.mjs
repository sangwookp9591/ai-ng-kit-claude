/**
 * TDD: Plan Manager + Task Manager integration tests
 * Verifies that plans and tasks are correctly persisted to .aing/ directories.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), `aing-test-${Date.now()}`);

describe('Plan Manager', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('createPlan should create .aing/plans/{date}-{feature}.md', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

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

    // Verify plan file exists in .aing/plans/
    assert.ok(existsSync(result.planPath), `Plan file should exist at ${result.planPath}`);
    assert.ok(result.planPath.includes('.aing/plans/'), 'Plan path should be under .aing/plans/');
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
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'search',
      goal: 'Add search functionality',
      steps: ['Build index', 'Add search API', 'Add UI'],
    }, TEST_DIR);

    assert.equal(result.ok, true);
    assert.ok(result.taskId.startsWith('task-'), 'Task ID should start with task-');

    // Verify task file exists in .aing/tasks/
    const taskPath = join(TEST_DIR, '.aing', 'tasks', `${result.taskId}.json`);
    assert.ok(existsSync(taskPath), `Task file should exist at ${taskPath}`);

    const task = JSON.parse(readFileSync(taskPath, 'utf-8'));
    assert.equal(task.title, '[Plan] search');
    assert.equal(task.subtasks.length, 3, 'Should have 3 subtasks');
    assert.equal(task.subtasks[0].title, 'Build index');
    assert.equal(task.subtasks[0].status, 'pending');
  });

  it('listPlans should return created plans', async () => {
    const { listPlans } = await import('../dist/scripts/task/plan-manager.js');

    const plans = listPlans(TEST_DIR);
    assert.ok(plans.length >= 2, 'Should have at least 2 plans');
    assert.ok(plans.some(p => p.feature === 'auth-api'), 'Should include auth-api plan');
    assert.ok(plans.some(p => p.feature === 'search'), 'Should include search plan');
  });

  it('getPlan should return plan content', async () => {
    const { getPlan } = await import('../dist/scripts/task/plan-manager.js');

    const content = getPlan('auth-api', TEST_DIR);
    assert.ok(content, 'getPlan should return content');
    assert.ok(content.includes('# Plan: auth-api'), 'Should contain plan title');
  });
});

describe('Task Manager', () => {
  before(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  it('createTask should create .aing/tasks/{id}.json', async () => {
    const { createTask } = await import('../dist/scripts/task/task-manager.js');

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
    const taskPath = join(TEST_DIR, '.aing', 'tasks', `${result.taskId}.json`);
    assert.ok(existsSync(taskPath), 'Task file should exist in .aing/tasks/');
  });

  it('checkSubtask should mark subtask as done', async () => {
    const { createTask, checkSubtask } = await import('../dist/scripts/task/task-manager.js');

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
    const { createTask, checkSubtask, getTask } = await import('../dist/scripts/task/task-manager.js');

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
    const { listTasks } = await import('../dist/scripts/task/task-manager.js');

    const tasks = listTasks(TEST_DIR);
    assert.ok(tasks.length >= 1, 'Should have at least 1 task');
  });
});

describe('persist.mjs CLI', () => {
  const CLI_TEST_DIR = join(tmpdir(), `aing-cli-test-${Date.now()}`);
  const persistPath = new URL('../dist/scripts/cli/persist.js', import.meta.url).pathname;

  before(() => {
    mkdirSync(CLI_TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(CLI_TEST_DIR, { recursive: true, force: true });
  });

  it('persist.mjs plan should create files in .aing/plans/', () => {
    const output = execFileSync('node', [
      persistPath, 'plan',
      '--dir', CLI_TEST_DIR,
      '--feature', 'cli-test',
      '--goal', 'Test CLI',
      '--steps', 'step1|step2',
    ], { encoding: 'utf-8' });

    const result = JSON.parse(output);
    assert.equal(result.ok, true, 'CLI plan should succeed');
    assert.ok(result.planPath.includes('.aing/plans/'), `Plan should be in .aing/plans/, got: ${result.planPath}`);
    assert.ok(existsSync(result.planPath), 'Plan file should exist on disk');

    // Verify task was also created
    const tasksDir = join(CLI_TEST_DIR, '.aing', 'tasks');
    assert.ok(existsSync(tasksDir), '.aing/tasks/ directory should exist');
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

describe('createPlan extended fields', () => {
  const EXT_TEST_DIR = join(tmpdir(), `aing-ext-test-${Date.now()}`);

  before(() => {
    mkdirSync(EXT_TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(EXT_TEST_DIR, { recursive: true, force: true });
  });

  it('should include ## Options section when options provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'ext-options',
      goal: 'Pick an architecture',
      steps: ['Evaluate options', 'Decide'],
      options: [
        { name: 'Option A', pros: ['Fast'], cons: ['Expensive'] },
        { name: 'Option B', pros: ['Cheap'], cons: ['Slow'] },
      ],
    }, EXT_TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Options'), 'Should contain ## Options');
    assert.ok(content.includes('### Option A'), 'Should contain Option A heading');
    assert.ok(content.includes('### Option B'), 'Should contain Option B heading');
    assert.ok(content.includes('- Fast'), 'Should contain pro');
    assert.ok(content.includes('- Expensive'), 'Should contain con');
  });

  it('should include ## Review Notes section when reviewNotes provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'ext-review',
      goal: 'Review the plan',
      steps: ['Review', 'Approve'],
      reviewNotes: [
        { reviewer: 'Alice', verdict: 'Approved', highlights: ['Clear steps', 'Good tests'] },
      ],
    }, EXT_TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Review Notes'), 'Should contain ## Review Notes');
    assert.ok(content.includes('### Alice'), 'Should contain reviewer heading');
    assert.ok(content.includes('**Verdict**: Approved'), 'Should contain verdict');
    assert.ok(content.includes('- Clear steps'), 'Should contain highlight');
  });

  it('should include ## Complexity section and header metadata when complexityScore/Level provided', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'ext-complexity',
      goal: 'Complex feature',
      steps: ['Step 1'],
      complexityScore: 7,
      complexityLevel: 'mid',
    }, EXT_TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Complexity'), 'Should contain ## Complexity');
    assert.ok(content.includes('**Score**: 7'), 'Should contain score');
    assert.ok(content.includes('**Level**: mid'), 'Should contain level');
    assert.ok(content.includes('**Complexity Score**: 7'), 'Should contain score in header');
    assert.ok(content.includes('**Complexity Level**: mid'), 'Should contain level in header');
  });

  it('should omit optional sections when fields not provided (backward compat)', async () => {
    const { createPlan } = await import('../dist/scripts/task/plan-manager.js');

    const result = createPlan({
      feature: 'ext-basic',
      goal: 'Basic plan',
      steps: ['Step 1'],
    }, EXT_TEST_DIR);

    assert.equal(result.ok, true);
    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(!content.includes('## Options'), 'Should NOT contain ## Options');
    assert.ok(!content.includes('## Review Notes'), 'Should NOT contain ## Review Notes');
    assert.ok(!content.includes('## Complexity'), 'Should NOT contain ## Complexity');
  });
});

describe('persist.mjs --stdin JSON mode', () => {
  const STDIN_TEST_DIR = join(tmpdir(), `aing-stdin-test-${Date.now()}`);
  const persistPath = new URL('../dist/scripts/cli/persist.js', import.meta.url).pathname;

  before(() => {
    mkdirSync(STDIN_TEST_DIR, { recursive: true });
  });

  after(() => {
    rmSync(STDIN_TEST_DIR, { recursive: true, force: true });
  });

  it('should create plan from JSON on stdin', () => {
    const payload = JSON.stringify({
      feature: 'stdin-feature',
      goal: 'Build from stdin',
      steps: ['Read stdin', 'Parse JSON', 'Write plan'],
      acceptanceCriteria: ['Plan file exists'],
      risks: ['Encoding issues'],
    });

    const proc = spawnSync('node', [persistPath, 'plan', '--stdin', '--dir', STDIN_TEST_DIR], {
      input: payload,
      encoding: 'utf-8',
    });

    assert.equal(proc.status, 0, `Process should exit 0. stderr: ${proc.stderr}`);
    const result = JSON.parse(proc.stdout);
    assert.equal(result.ok, true, 'Should succeed');
    assert.ok(result.planPath.includes('stdin-feature'), 'planPath should contain feature name');
    assert.ok(existsSync(result.planPath), 'Plan file should exist on disk');

    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('Build from stdin'), 'Should contain goal');
    assert.ok(content.includes('Read stdin'), 'Should contain first step');
    assert.ok(content.includes('Plan file exists'), 'Should contain acceptance criterion');
    assert.ok(content.includes('Encoding issues'), 'Should contain risk');
  });

  it('should create plan with extended fields from JSON stdin', () => {
    const payload = JSON.stringify({
      feature: 'stdin-extended',
      goal: 'Extended stdin plan',
      steps: ['Step A'],
      options: [{ name: 'Opt X', pros: ['Good'], cons: ['Bad'] }],
      reviewNotes: [{ reviewer: 'Bob', verdict: 'LGTM', highlights: ['Nice'] }],
      complexityScore: 5,
      complexityLevel: 'low',
    });

    const proc = spawnSync('node', [persistPath, 'plan', '--stdin', '--dir', STDIN_TEST_DIR], {
      input: payload,
      encoding: 'utf-8',
    });

    assert.equal(proc.status, 0, `Process should exit 0. stderr: ${proc.stderr}`);
    const result = JSON.parse(proc.stdout);
    assert.equal(result.ok, true);

    const content = readFileSync(result.planPath, 'utf-8');
    assert.ok(content.includes('## Options'), 'Should have Options section');
    assert.ok(content.includes('### Opt X'), 'Should have option name');
    assert.ok(content.includes('## Review Notes'), 'Should have Review Notes section');
    assert.ok(content.includes('### Bob'), 'Should have reviewer');
    assert.ok(content.includes('## Complexity'), 'Should have Complexity section');
    assert.ok(content.includes('**Score**: 5'), 'Should have score');
  });

  it('should return error for invalid JSON on stdin', () => {
    const proc = spawnSync('node', [persistPath, 'plan', '--stdin', '--dir', STDIN_TEST_DIR], {
      input: 'not valid json {{{',
      encoding: 'utf-8',
    });

    assert.equal(proc.status, 1, 'Process should exit 1');
    const result = JSON.parse(proc.stdout);
    assert.equal(result.ok, false);
    assert.equal(result.error, 'Invalid JSON on stdin');
  });

  it('should return error when required fields missing in stdin JSON', () => {
    const payload = JSON.stringify({ feature: 'incomplete' });

    const proc = spawnSync('node', [persistPath, 'plan', '--stdin', '--dir', STDIN_TEST_DIR], {
      input: payload,
      encoding: 'utf-8',
    });

    assert.equal(proc.status, 1, 'Process should exit 1');
    const result = JSON.parse(proc.stdout);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('Required'), 'Error should mention required fields');
  });
});
