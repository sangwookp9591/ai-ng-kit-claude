/**
 * aing Intent Router
 * 자연어 입력을 분석하여 최적의 aing 파이프라인으로 라우팅합니다.
 * @module scripts/routing/intent-router
 */
type Route = 'auto' | 'plan' | 'team' | 'wizard';
type Preset = 'solo' | 'duo' | 'squad' | 'full' | 'design';
interface IntentResult {
    route: Route;
    preset: Preset;
    confidence: number;
    reason: string;
    originalInput: string;
}
/**
 * 자연어 입력을 분석하여 최적의 aing 파이프라인으로 라우팅합니다.
 */
export declare function routeIntent(input: string | null): IntentResult;
export {};
//# sourceMappingURL=intent-router.d.ts.map