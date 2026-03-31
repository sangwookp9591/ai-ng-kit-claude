/**
 * aing Harness Evolution — Version tracking + A/B comparison
 * Snapshots harness configurations and tracks metrics over time.
 * @module scripts/harness/harness-evolution
 */
import type { HarnessConfig, HarnessVersion, HarnessMetrics, VersionComparison } from './harness-types.js';
export declare function snapshotHarness(feature: string, config: HarnessConfig, projectDir: string): string;
export declare function recordMetrics(feature: string, versionId: string, metrics: HarnessMetrics, projectDir: string): void;
export declare function compareVersions(feature: string, v1Num: number, v2Num: number, projectDir: string): VersionComparison | null;
export declare function getVersionList(projectDir: string, feature: string): HarnessVersion[];
export declare function getLatestVersion(projectDir: string, feature: string): HarnessVersion | null;
export declare function formatHistory(feature: string, versions: HarnessVersion[]): string;
export declare function formatComparison(comp: VersionComparison): string;
//# sourceMappingURL=harness-evolution.d.ts.map