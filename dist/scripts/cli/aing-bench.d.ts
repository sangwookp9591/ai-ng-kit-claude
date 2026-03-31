interface BenchmarkResult {
    name: string;
    iterations: number;
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
}
interface BenchmarkSuiteEntry {
    name: string;
    fn: () => void;
    iterations?: number;
}
export declare function benchmark(name: string, fn: () => void, iterations?: number): BenchmarkResult;
export declare function runBenchSuite(suite: BenchmarkSuiteEntry[]): BenchmarkResult[];
export declare function formatBenchResults(results: BenchmarkResult[]): string;
export {};
//# sourceMappingURL=aing-bench.d.ts.map