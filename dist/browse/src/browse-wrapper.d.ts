/**
 * Browse Wrapper — Programmatic API over the aing-browse daemon.
 *
 * Provides a typed interface with ref system (@e1, @e2, ...),
 * state tracking, and structured Result<T> returns. All communication
 * goes through the daemon's HTTP command endpoint.
 *
 * Zero external deps — uses Node.js built-in http only.
 * @module browse/src/browse-wrapper
 */
export interface BrowseResult<T = string> {
    ok: true;
    data: T;
}
export interface BrowseError {
    ok: false;
    error: string;
}
export type Result<T = string> = BrowseResult<T> | BrowseError;
export interface PageState {
    url: string;
    title: string;
    lastSnapshotAt: number;
    lastSnapshotTree: string;
    refs: RefEntry[];
}
export interface RefEntry {
    ref: string;
    role: string;
    name: string;
}
export interface DaemonState {
    pid: number;
    port: number;
    token: string;
    startedAt: string;
    mode: 'headless' | 'headed';
}
export interface SnapshotFlags {
    interactive?: boolean;
    compact?: boolean;
    diff?: boolean;
    depth?: number;
    selector?: string;
    annotate?: boolean;
    outputPath?: string;
    cursorInteractive?: boolean;
}
export interface AssertionResult {
    state: string;
    selector: string;
    result: boolean;
}
export interface ConsoleEntry {
    level: string;
    message: string;
    source?: string;
}
export interface NetworkEntry {
    method: string;
    url: string;
    status: number;
    duration?: number;
}
export declare class BrowseWrapper {
    private daemonState;
    private pageState;
    private readonly stateFile;
    private readonly timeout;
    constructor(projectRoot: string, options?: {
        timeout?: number;
    });
    /** Connect to existing daemon or fail. Does NOT start a daemon. */
    connect(): Promise<Result<DaemonState>>;
    /** Check if connected to a live daemon */
    isConnected(): boolean;
    /** Get current page state */
    getPageState(): PageState;
    goto(url: string): Promise<Result>;
    back(): Promise<Result>;
    forward(): Promise<Result>;
    reload(): Promise<Result>;
    waitFor(target: string): Promise<Result>;
    /**
     * Take an accessibility snapshot and populate refs (@e1, @e2, ...).
     * Returns the formatted tree with refs assigned.
     */
    snapshot(flags?: SnapshotFlags): Promise<Result<{
        tree: string;
        refs: RefEntry[];
    }>>;
    /**
     * Resolve a ref (@eN) to its role and name from the last snapshot.
     * The daemon itself tracks locators; this gives the caller metadata.
     */
    resolveRef(ref: string): Result<RefEntry>;
    /** List all current refs */
    listRefs(): RefEntry[];
    click(target: string): Promise<Result>;
    fill(target: string, value: string): Promise<Result>;
    select(target: string, value: string): Promise<Result>;
    hover(target: string): Promise<Result>;
    type(text: string): Promise<Result>;
    press(key: string): Promise<Result>;
    scroll(target?: string): Promise<Result>;
    text(): Promise<Result>;
    url(): Promise<Result>;
    evaluate(expr: string): Promise<Result>;
    is(state: string, selector: string): Promise<Result<AssertionResult>>;
    console(errorsOnly?: boolean): Promise<Result<ConsoleEntry[]>>;
    network(): Promise<Result<NetworkEntry[]>>;
    perf(): Promise<Result>;
    screenshot(outputPath?: string): Promise<Result<string>>;
    responsive(prefix?: string): Promise<Result<string[]>>;
    listTabs(): Promise<Result>;
    switchTab(id: number): Promise<Result>;
    newTab(url?: string): Promise<Result>;
    closeTab(id?: number): Promise<Result>;
    /**
     * Execute multiple commands in sequence. Stops on first error.
     */
    chain(commands: Array<{
        cmd: string;
        args?: string[];
    }>): Promise<Result<Array<{
        cmd: string;
        result: Result;
    }>>>;
    private send;
    private postCommand;
    private healthCheck;
    private readDaemonState;
}
/** Build CLI-style snapshot flag args from a flags object. */
export declare function buildSnapshotArgs(flags?: SnapshotFlags): string[];
/**
 * Parse @eN refs from a snapshot tree output.
 * Lines look like: `  - button "Submit" @e1` or `  - link "Home" @e3 @c1`
 */
export declare function parseRefsFromTree(tree: string): RefEntry[];
/**
 * Create a BrowseWrapper connected to the daemon.
 * Convenience factory that auto-connects.
 */
export declare function createBrowse(projectRoot: string, options?: {
    timeout?: number;
}): Promise<Result<BrowseWrapper>>;
//# sourceMappingURL=browse-wrapper.d.ts.map