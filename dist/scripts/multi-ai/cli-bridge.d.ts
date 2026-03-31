interface AskOptions {
    timeout?: number;
}
interface AskResult {
    ok: boolean;
    response?: string;
    error?: string;
    source: string;
    timedOut?: boolean;
}
interface Bridge {
    name: string;
    command: string;
    isAvailable: () => boolean;
    ask: (prompt: string, opts?: AskOptions) => AskResult;
}
/**
 * Create a bridge for a CLI AI tool.
 */
export declare function createBridge(name: string, command: string): Bridge;
/** OpenAI Codex CLI bridge */
export declare const codex: Bridge;
/** Google Gemini CLI bridge */
export declare const gemini: Bridge;
/**
 * Return only the bridges whose CLI tool is actually installed.
 */
export declare function getAvailableBridges(): Bridge[];
/**
 * Build a terse, bug-focused review prompt from a diff.
 */
export declare function buildReviewPrompt(diff: string, instructions?: string): string;
export {};
//# sourceMappingURL=cli-bridge.d.ts.map