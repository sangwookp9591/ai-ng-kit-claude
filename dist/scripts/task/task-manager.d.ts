/**
 * aing Task Manager v1.1.0
 * Hierarchical task system: Main Task → Sub Tasks with checklist tracking.
 * Stored in .aing/tasks/ as individual JSON files.
 * @module scripts/task/task-manager
 */
interface SubTask {
    id: string;
    seq: number;
    title: string;
    description: string;
    status: 'pending' | 'done';
    checkedAt: string | null;
}
interface Task {
    id: string;
    title: string;
    feature: string | null;
    description: string;
    status: 'in-progress' | 'completed';
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    subtasks: SubTask[];
    lastSessionEnd?: string;
}
interface TaskIndexEntry {
    id: string;
    title: string;
    status: string;
    updatedAt: string;
}
interface CreateTaskParams {
    title: string;
    feature?: string | null;
    description?: string;
    subtasks?: Array<{
        title: string;
        description?: string;
    }>;
}
interface CreateTaskResult {
    ok: boolean;
    taskId: string;
    task: Task;
}
interface CheckSubtaskResult {
    ok: boolean;
    subtask?: SubTask;
    taskComplete?: boolean;
    message: string;
}
interface AddSubtaskResult {
    ok: boolean;
    subtaskId: string;
}
/**
 * Create a main task with sub-tasks.
 */
export declare function createTask(params: CreateTaskParams, projectDir?: string): CreateTaskResult;
/**
 * Check (complete) a sub-task.
 */
export declare function checkSubtask(taskId: string, subtaskRef: string | number, projectDir?: string): CheckSubtaskResult;
/**
 * Add a sub-task to an existing main task.
 */
export declare function addSubtask(taskId: string, subtask: {
    title: string;
    description?: string;
}, projectDir?: string): AddSubtaskResult;
/**
 * Get a task with all sub-tasks.
 */
export declare function getTask(taskId: string, projectDir?: string): Task | null;
/**
 * List all tasks.
 */
export declare function listTasks(projectDir?: string): TaskIndexEntry[];
/**
 * List active (non-completed) tasks.
 */
export declare function listActiveTasks(projectDir?: string): TaskIndexEntry[];
/**
 * Format task as checklist for display.
 */
export declare function formatTaskChecklist(taskId: string, projectDir?: string): string;
/**
 * Format all active tasks summary.
 */
export declare function formatAllTasks(projectDir?: string): string;
export {};
//# sourceMappingURL=task-manager.d.ts.map