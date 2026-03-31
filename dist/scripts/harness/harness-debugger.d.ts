/**
 * aing Harness Debugger — Runtime diagnosis for harness issues
 * Analyzes stalled agents, broken data flow, and suggests fixes.
 * @module scripts/harness/harness-debugger
 */
import type { DiagnosisResult } from './harness-types.js';
export declare function diagnoseHarness(feature: string, projectDir: string): DiagnosisResult;
export declare function formatDiagnosis(result: DiagnosisResult): string;
//# sourceMappingURL=harness-debugger.d.ts.map