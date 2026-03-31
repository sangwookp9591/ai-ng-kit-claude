export interface AdversarialPromptContext {
    planContent?: string;
    feature?: string;
    branch?: string;
}
export interface OutsideVoiceResult {
    status?: string;
    findings?: string[];
    source?: string;
}
export interface MultiAIReviewPlan {
    available: string[];
    voterCount: number;
    prompt: string;
}
/**
 * Build the adversarial review prompt for a subagent.
 */
export declare function buildAdversarialPrompt(context: AdversarialPromptContext): string;
/**
 * Record outside voice result.
 */
export declare function recordOutsideVoice(result: OutsideVoiceResult, projectDir?: string): void;
/**
 * Build a review plan that includes all available AI voters.
 * Claude is always included; Codex and Gemini are added when their CLIs are on $PATH.
 */
export declare function buildMultiAIReviewPlan(context: AdversarialPromptContext): MultiAIReviewPlan;
//# sourceMappingURL=outside-voice.d.ts.map