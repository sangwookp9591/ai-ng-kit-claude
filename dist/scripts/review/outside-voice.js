/**
 * aing Outside Voice — Cross-Model Adversarial Review
 * Dispatches review to a Claude subagent with fresh context.
 * @module scripts/review/outside-voice
 */
import { createLogger } from '../core/logger.js';
import { appendReviewLog } from './review-log.js';
const log = createLogger('outside-voice');
/**
 * Build the adversarial review prompt for a subagent.
 */
export function buildAdversarialPrompt(context) {
    const planContent = (context.planContent || '').slice(0, 30000); // 30KB cap
    const truncated = (context.planContent?.length ?? 0) > 30000 ? '\n[Plan truncated for size]' : '';
    return `You are a brutally honest technical reviewer examining a development plan that has already been through a multi-section review. Your job is NOT to repeat that review. Instead, find what it missed.

Look for:
1. Logical gaps and unstated assumptions that survived review scrutiny
2. Overcomplexity: is there a fundamentally simpler approach?
3. Feasibility risks the review took for granted
4. Missing dependencies or sequencing issues
5. Strategic miscalibration: is this the right thing to build?

Be direct. Be terse. No compliments. Just the problems.

Feature: ${context.feature || 'unknown'}
Branch: ${context.branch || 'unknown'}

THE PLAN:
${planContent}${truncated}`;
}
/**
 * Record outside voice result.
 */
export function recordOutsideVoice(result, projectDir) {
    appendReviewLog({
        skill: 'outside-voice',
        timestamp: new Date().toISOString(),
        status: (result.findings?.length ?? 0) > 0 ? 'issues_found' : 'clean',
        source: result.source || 'claude-subagent',
        findings_count: result.findings?.length || 0,
    }, projectDir);
    log.info(`Outside voice recorded: ${result.source} → ${result.findings?.length || 0} findings`);
}
// ── Multi-AI integration ───────────────────────────────────────────────
import { codex, gemini } from '../multi-ai/cli-bridge.js';
/**
 * Build a review plan that includes all available AI voters.
 * Claude is always included; Codex and Gemini are added when their CLIs are on $PATH.
 */
export function buildMultiAIReviewPlan(context) {
    const available = ['claude'];
    if (codex.isAvailable())
        available.push('codex');
    if (gemini.isAvailable())
        available.push('gemini');
    return {
        available,
        voterCount: available.length,
        prompt: buildAdversarialPrompt(context),
    };
}
//# sourceMappingURL=outside-voice.js.map