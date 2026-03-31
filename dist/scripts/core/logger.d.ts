/**
 * aing Structured Logger
 * All output goes to stderr (never stdout — stdout is reserved for hook responses).
 * Logs also persist to .aing/logs/ for debugging.
 * @module scripts/core/logger
 */
interface Logger {
    debug: (msg: string, data?: unknown) => void;
    info: (msg: string, data?: unknown) => void;
    warn: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
}
/**
 * Create a logger scoped to a module name.
 * @param moduleName - e.g. 'pdca-engine', 'session-start'
 */
export declare function createLogger(moduleName: string): Logger;
export {};
//# sourceMappingURL=logger.d.ts.map