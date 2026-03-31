export declare class CircularBuffer<T> {
    private capacity;
    private buffer;
    private head;
    private size;
    constructor(capacity?: number);
    push(item: T): void;
    getAll(): T[];
    clear(): void;
    get length(): number;
}
export interface LogEntry {
    level: string;
    message: string;
    timestamp: number;
    source?: string;
}
export interface NetworkEntry {
    method: string;
    url: string;
    status: number;
    timestamp: number;
    duration?: number;
}
export interface DialogEntry {
    type: string;
    message: string;
    timestamp: number;
    defaultValue?: string;
}
//# sourceMappingURL=buffers.d.ts.map