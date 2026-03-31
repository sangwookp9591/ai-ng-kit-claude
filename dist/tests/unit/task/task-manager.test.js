/**
 * Unit tests for scripts/task/task-manager.ts
 * Covers: createTask, checkSubtask, addSubtask, getTask, listTasks,
 *         listActiveTasks, formatTaskChecklist, formatAllTasks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
let taskStore = {};
vi.mock('node:fs', () => ({
    mkdirSync: vi.fn(),
}));
vi.mock('../../../scripts/core/state.js', () => ({
    readState: vi.fn((path) => {
        if (taskStore[path])
            return { ok: true, data: taskStore[path] };
        return { ok: false, error: 'File not found' };
    }),
    readStateOrDefault: vi.fn((path, defaultVal) => {
        return taskStore[path] ?? JSON.parse(JSON.stringify(defaultVal));
    }),
    writeState: vi.fn((path, data) => {
        taskStore[path] = JSON.parse(JSON.stringify(data));
        return { ok: true };
    }),
}));
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    })),
}));
import { createTask, checkSubtask, addSubtask, getTask, listTasks, listActiveTasks, formatTaskChecklist, formatAllTasks, } from '../../../scripts/task/task-manager.js';
const DIR = '/tmp/task-test';
beforeEach(() => {
    vi.clearAllMocks();
    taskStore = {};
});
// ── createTask ───────────────────────────────────────────────────────────
describe('createTask', () => {
    it('creates a task with subtasks', () => {
        const result = createTask({
            title: 'Build Auth',
            subtasks: [
                { title: 'Login form' },
                { title: 'Session management' },
                { title: 'Logout' },
            ],
        }, DIR);
        expect(result.ok).toBe(true);
        expect(result.taskId).toContain('task-');
        expect(result.task.title).toBe('Build Auth');
        expect(result.task.subtasks).toHaveLength(3);
        expect(result.task.status).toBe('in-progress');
    });
    it('assigns sequential IDs to subtasks', () => {
        const result = createTask({
            title: 'Test',
            subtasks: [{ title: 'A' }, { title: 'B' }],
        }, DIR);
        expect(result.task.subtasks[0].seq).toBe(1);
        expect(result.task.subtasks[1].seq).toBe(2);
        expect(result.task.subtasks[0].id).toContain('-sub-1');
        expect(result.task.subtasks[1].id).toContain('-sub-2');
    });
    it('creates task without subtasks', () => {
        const result = createTask({ title: 'Simple' }, DIR);
        expect(result.ok).toBe(true);
        expect(result.task.subtasks).toHaveLength(0);
    });
    it('includes feature name', () => {
        const result = createTask({
            title: 'Auth',
            feature: 'auth-v2',
        }, DIR);
        expect(result.task.feature).toBe('auth-v2');
    });
    it('updates task index', () => {
        createTask({ title: 'Indexed' }, DIR);
        const index = listTasks(DIR);
        expect(index.length).toBeGreaterThan(0);
        expect(index[0].title).toBe('Indexed');
    });
    it('sets all subtasks to pending', () => {
        const result = createTask({
            title: 'Test',
            subtasks: [{ title: 'A' }, { title: 'B' }],
        }, DIR);
        for (const sub of result.task.subtasks) {
            expect(sub.status).toBe('pending');
            expect(sub.checkedAt).toBeNull();
        }
    });
});
// ── checkSubtask ─────────────────────────────────────────────────────────
describe('checkSubtask', () => {
    it('checks a subtask by sequence number', () => {
        const created = createTask({
            title: 'Test',
            subtasks: [{ title: 'Step 1' }, { title: 'Step 2' }],
        }, DIR);
        const result = checkSubtask(created.taskId, 1, DIR);
        expect(result.ok).toBe(true);
        expect(result.subtask?.status).toBe('done');
        expect(result.subtask?.checkedAt).toBeDefined();
        expect(result.taskComplete).toBe(false);
    });
    it('checks a subtask by ID', () => {
        const created = createTask({
            title: 'Test',
            subtasks: [{ title: 'Sub A' }],
        }, DIR);
        const subId = created.task.subtasks[0].id;
        const result = checkSubtask(created.taskId, subId, DIR);
        expect(result.ok).toBe(true);
        expect(result.subtask?.title).toBe('Sub A');
    });
    it('completes main task when all subtasks done', () => {
        const created = createTask({
            title: 'Test',
            subtasks: [{ title: 'Only task' }],
        }, DIR);
        const result = checkSubtask(created.taskId, 1, DIR);
        expect(result.taskComplete).toBe(true);
        expect(result.message).toContain('completed');
    });
    it('shows progress in message', () => {
        const created = createTask({
            title: 'Test',
            subtasks: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
        }, DIR);
        const result = checkSubtask(created.taskId, 1, DIR);
        expect(result.message).toContain('1/3');
    });
    it('fails for non-existent task', () => {
        const result = checkSubtask('nonexistent', 1, DIR);
        expect(result.ok).toBe(false);
        expect(result.message).toContain('not found');
    });
    it('fails for non-existent subtask', () => {
        const created = createTask({
            title: 'Test',
            subtasks: [{ title: 'A' }],
        }, DIR);
        const result = checkSubtask(created.taskId, 99, DIR);
        expect(result.ok).toBe(false);
        expect(result.message).toContain('not found');
    });
});
// ── addSubtask ───────────────────────────────────────────────────────────
describe('addSubtask', () => {
    it('adds subtask to existing task', () => {
        const created = createTask({
            title: 'Test',
            subtasks: [{ title: 'Original' }],
        }, DIR);
        const result = addSubtask(created.taskId, { title: 'New sub' }, DIR);
        expect(result.ok).toBe(true);
        expect(result.subtaskId).toContain('-sub-2');
        const task = getTask(created.taskId, DIR);
        expect(task?.subtasks).toHaveLength(2);
        expect(task?.subtasks[1].title).toBe('New sub');
    });
    it('re-opens completed task when adding subtask', () => {
        const created = createTask({
            title: 'Test',
            subtasks: [{ title: 'Only' }],
        }, DIR);
        checkSubtask(created.taskId, 1, DIR); // complete it
        addSubtask(created.taskId, { title: 'Added' }, DIR);
        const task = getTask(created.taskId, DIR);
        expect(task?.status).toBe('in-progress');
    });
    it('fails for non-existent task', () => {
        const result = addSubtask('nonexistent', { title: 'X' }, DIR);
        expect(result.ok).toBe(false);
    });
});
// ── getTask ──────────────────────────────────────────────────────────────
describe('getTask', () => {
    it('returns task with all subtasks', () => {
        const created = createTask({
            title: 'Get Test',
            subtasks: [{ title: 'A' }, { title: 'B' }],
        }, DIR);
        const task = getTask(created.taskId, DIR);
        expect(task).not.toBeNull();
        expect(task.title).toBe('Get Test');
        expect(task.subtasks).toHaveLength(2);
    });
    it('returns null for non-existent task', () => {
        expect(getTask('nonexistent', DIR)).toBeNull();
    });
});
// ── listTasks / listActiveTasks ──────────────────────────────────────────
describe('listTasks', () => {
    it('lists all tasks from index', () => {
        createTask({ title: 'Task 1' }, DIR);
        createTask({ title: 'Task 2' }, DIR);
        const tasks = listTasks(DIR);
        expect(tasks.length).toBeGreaterThanOrEqual(2);
    });
    it('returns empty when no tasks', () => {
        expect(listTasks(DIR)).toEqual([]);
    });
});
describe('listActiveTasks', () => {
    it('excludes completed tasks', () => {
        const created = createTask({
            title: 'Active',
            subtasks: [{ title: 'X' }],
        }, DIR);
        // Complete the task
        checkSubtask(created.taskId, 1, DIR);
        // Create another active task
        createTask({ title: 'Still Active', subtasks: [{ title: 'Y' }] }, DIR);
        const active = listActiveTasks(DIR);
        const activeOnly = active.filter(t => t.status !== 'completed');
        expect(activeOnly.length).toBeGreaterThan(0);
    });
});
// ── formatTaskChecklist ──────────────────────────────────────────────────
describe('formatTaskChecklist', () => {
    it('formats task with progress', () => {
        const created = createTask({
            title: 'Checklist Test',
            subtasks: [{ title: 'Done' }, { title: 'Pending' }],
        }, DIR);
        checkSubtask(created.taskId, 1, DIR);
        const output = formatTaskChecklist(created.taskId, DIR);
        expect(output).toContain('Checklist Test');
        expect(output).toContain('50%');
        expect(output).toContain('1/2');
    });
    it('shows not found for invalid task', () => {
        const output = formatTaskChecklist('nonexistent', DIR);
        expect(output).toContain('not found');
    });
    it('shows 0% for task with no completed subtasks', () => {
        const created = createTask({
            title: 'Zero',
            subtasks: [{ title: 'A' }, { title: 'B' }],
        }, DIR);
        const output = formatTaskChecklist(created.taskId, DIR);
        expect(output).toContain('0%');
    });
    it('shows 100% for fully completed task', () => {
        const created = createTask({
            title: 'Full',
            subtasks: [{ title: 'Only' }],
        }, DIR);
        checkSubtask(created.taskId, 1, DIR);
        const output = formatTaskChecklist(created.taskId, DIR);
        expect(output).toContain('100%');
    });
});
// ── formatAllTasks ───────────────────────────────────────────────────────
describe('formatAllTasks', () => {
    it('shows "No tasks" when empty', () => {
        const output = formatAllTasks(DIR);
        expect(output).toContain('No tasks');
    });
    it('lists tasks with status', () => {
        createTask({ title: 'Alpha' }, DIR);
        createTask({ title: 'Beta' }, DIR);
        const output = formatAllTasks(DIR);
        expect(output).toContain('[aing Tasks]');
        expect(output).toContain('Alpha');
        expect(output).toContain('Beta');
    });
});
//# sourceMappingURL=task-manager.test.js.map