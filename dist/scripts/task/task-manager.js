/**
 * aing Task Manager v1.1.0
 * Hierarchical task system: Main Task → Sub Tasks with checklist tracking.
 * Stored in .aing/tasks/ as individual JSON files.
 * @module scripts/task/task-manager
 */
import { readState, writeState, readStateOrDefault } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const log = createLogger('task');
let _taskIdCounter = 0;
function getTaskDir(projectDir) {
    const dir = join(projectDir || process.cwd(), '.aing', 'tasks');
    mkdirSync(dir, { recursive: true });
    return dir;
}
function getTaskPath(taskId, projectDir) {
    return join(getTaskDir(projectDir), `${taskId}.json`);
}
/**
 * Create a main task with sub-tasks.
 */
export function createTask(params, projectDir) {
    const taskId = `task-${Date.now()}-${++_taskIdCounter}`;
    const task = {
        id: taskId,
        title: params.title,
        feature: params.feature || null,
        description: params.description || '',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        subtasks: (params.subtasks || []).map((st, i) => ({
            id: `${taskId}-sub-${i + 1}`,
            seq: i + 1,
            title: st.title,
            description: st.description || '',
            status: 'pending',
            checkedAt: null
        }))
    };
    const result = writeState(getTaskPath(taskId, projectDir), task);
    if (result.ok) {
        // Update task index
        updateIndex(taskId, task.title, task.status, projectDir);
        log.info(`Task created: ${taskId}`, { title: params.title, subtasks: task.subtasks.length });
    }
    return { ok: result.ok, taskId, task };
}
/**
 * Check (complete) a sub-task.
 */
export function checkSubtask(taskId, subtaskRef, projectDir) {
    const taskPath = getTaskPath(taskId, projectDir);
    const result = readState(taskPath);
    if (!result.ok)
        return { ok: false, message: `Task "${taskId}" not found` };
    const task = result.data;
    const subtask = typeof subtaskRef === 'number'
        ? task.subtasks.find((s) => s.seq === subtaskRef)
        : task.subtasks.find((s) => s.id === subtaskRef);
    if (!subtask)
        return { ok: false, message: `Sub-task "${subtaskRef}" not found` };
    subtask.status = 'done';
    subtask.checkedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    // Check if all subtasks are done
    const allDone = task.subtasks.every((s) => s.status === 'done');
    if (allDone) {
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
    }
    writeState(taskPath, task);
    updateIndex(taskId, task.title, task.status, projectDir);
    log.info(`Subtask checked: ${subtask.title}`, { taskId, allDone });
    return {
        ok: true,
        subtask,
        taskComplete: allDone,
        message: allDone
            ? `All subtasks complete! Main task "${task.title}" completed.`
            : `"${subtask.title}" done (${task.subtasks.filter((s) => s.status === 'done').length}/${task.subtasks.length})`
    };
}
/**
 * Add a sub-task to an existing main task.
 */
export function addSubtask(taskId, subtask, projectDir) {
    const taskPath = getTaskPath(taskId, projectDir);
    const result = readState(taskPath);
    if (!result.ok)
        return { ok: false, subtaskId: '' };
    const task = result.data;
    const seq = task.subtasks.length + 1;
    const newSub = {
        id: `${taskId}-sub-${seq}`,
        seq,
        title: subtask.title,
        description: subtask.description || '',
        status: 'pending',
        checkedAt: null
    };
    task.subtasks.push(newSub);
    task.updatedAt = new Date().toISOString();
    if (task.status === 'completed')
        task.status = 'in-progress';
    writeState(taskPath, task);
    return { ok: true, subtaskId: newSub.id };
}
/**
 * Get a task with all sub-tasks.
 */
export function getTask(taskId, projectDir) {
    const result = readState(getTaskPath(taskId, projectDir));
    return result.ok ? result.data : null;
}
/**
 * List all tasks.
 */
export function listTasks(projectDir) {
    const indexPath = join(getTaskDir(projectDir), '_index.json');
    return readStateOrDefault(indexPath, []);
}
/**
 * List active (non-completed) tasks.
 */
export function listActiveTasks(projectDir) {
    return listTasks(projectDir).filter((t) => t.status !== 'completed');
}
/**
 * Format task as checklist for display.
 */
export function formatTaskChecklist(taskId, projectDir) {
    const task = getTask(taskId, projectDir);
    if (!task)
        return `[aing Task] Task "${taskId}" not found`;
    const done = task.subtasks.filter((s) => s.status === 'done').length;
    const total = task.subtasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const lines = [
        `${task.title} (${pct}%)`,
        `${'━'.repeat(40)}`,
    ];
    for (const sub of task.subtasks) {
        const check = sub.status === 'done' ? '☑' : '☐';
        const time = sub.checkedAt ? ` (${sub.checkedAt.slice(11, 19)})` : '';
        lines.push(`  ${check} ${sub.seq}. ${sub.title}${time}`);
    }
    lines.push(`${'━'.repeat(40)}`);
    lines.push(`  Progress: ${done}/${total} (${pct}%)`);
    return lines.join('\n');
}
/**
 * Format all active tasks summary.
 */
export function formatAllTasks(projectDir) {
    const tasks = listTasks(projectDir);
    if (tasks.length === 0)
        return '[aing Tasks] No tasks registered';
    const lines = ['[aing Tasks]', ''];
    for (const t of tasks.slice(-10)) {
        const icon = t.status === 'completed' ? 'done' : 'active';
        lines.push(`  [${icon}] ${t.title} [${t.status}]`);
    }
    return lines.join('\n');
}
// --- Internal helpers ---
function updateIndex(taskId, title, status, projectDir) {
    const indexPath = join(getTaskDir(projectDir), '_index.json');
    const index = readStateOrDefault(indexPath, []);
    const existing = index.findIndex((t) => t.id === taskId);
    const entry = { id: taskId, title, status, updatedAt: new Date().toISOString() };
    if (existing >= 0) {
        index[existing] = entry;
    }
    else {
        index.push(entry);
    }
    writeState(indexPath, index);
}
//# sourceMappingURL=task-manager.js.map