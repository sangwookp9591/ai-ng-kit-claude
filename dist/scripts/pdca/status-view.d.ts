/**
 * aing Status View — Human-Readable PDCA Status Generator
 * Reads pdca-status.json and writes .aing/STATUS.md.
 *
 * @module scripts/pdca/status-view
 */
interface StatusViewResult {
    path: string;
    featureCount: number;
    zombieCount: number;
    activeFeature: string | null;
}
/**
 * Generate STATUS.md from pdca-status.json.
 */
export declare function generateStatusView(projectDir: string): StatusViewResult;
export {};
//# sourceMappingURL=status-view.d.ts.map