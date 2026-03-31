/**
 * aing Multilingual Intent Detector
 * Supports Korean and English intent detection.
 * @module scripts/i18n/intent-detector
 */
interface IntentResult {
    agent?: string;
    pdcaStage?: string;
    isWizardMode: boolean;
    confidence: number;
}
/**
 * Detect user intent from natural language input.
 */
export declare function detectIntent(text: string): IntentResult;
export {};
//# sourceMappingURL=intent-detector.d.ts.map