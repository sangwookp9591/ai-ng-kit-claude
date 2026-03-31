interface LearningEntry {
    pattern?: string;
    context?: string;
    content?: string;
    confidence?: number;
    source?: string;
    ts?: string;
    [key: string]: unknown;
}
interface PruneResult {
    before: number;
    after: number;
    pruned: number;
}
interface LearningStats {
    total: number;
    bySource: Record<string, number>;
}
export declare function listLearnings(projectSlug: string): LearningEntry[];
export declare function searchLearnings(projectSlug: string, query: string): LearningEntry[];
export declare function addLearning(projectSlug: string, entry: LearningEntry): LearningEntry;
export declare function pruneLearnings(projectSlug: string, maxAgeDays?: number): PruneResult;
export declare function getStats(projectSlug: string): LearningStats;
export {};
//# sourceMappingURL=aing-learn.d.ts.map