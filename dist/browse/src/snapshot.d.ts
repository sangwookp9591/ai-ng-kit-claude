import type { Page, Locator } from 'playwright';
import type { SnapshotOptions } from './types.js';
interface RefInfo {
    locator: Locator;
    role: string;
    name: string;
}
interface SnapshotResult {
    tree: string;
    rawTree: string;
    refs: Map<string, RefInfo>;
    cRefs?: Map<string, RefInfo>;
}
export declare function buildSnapshot(page: Page, options: SnapshotOptions, previousSnapshot?: string): Promise<SnapshotResult>;
export {};
//# sourceMappingURL=snapshot.d.ts.map