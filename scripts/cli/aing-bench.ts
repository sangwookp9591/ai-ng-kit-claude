/**
 * aing Benchmark Runner.
 * Measures function execution time with p50/p95/p99 percentiles.
 * @module scripts/cli/aing-bench
 */
import { performance } from 'node:perf_hooks';

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

export function benchmark(name: string, fn: () => void, iterations: number = 100): BenchmarkResult {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    name, iterations,
    p50: times[Math.floor(iterations * 0.5)],
    p95: times[Math.floor(iterations * 0.95)],
    p99: times[Math.floor(iterations * 0.99)],
    avg: times.reduce((s, t) => s + t, 0) / iterations,
    min: times[0],
    max: times[iterations - 1],
  };
}

export function runBenchSuite(suite: BenchmarkSuiteEntry[]): BenchmarkResult[] {
  return suite.map(({ name, fn, iterations }) => benchmark(name, fn, iterations));
}

export function formatBenchResults(results: BenchmarkResult[]): string {
  const lines: string[] = ['Benchmark Results:', ''];
  for (const r of results) {
    lines.push(`  ${r.name}: p50=${r.p50.toFixed(2)}ms p95=${r.p95.toFixed(2)}ms avg=${r.avg.toFixed(2)}ms (${r.iterations} runs)`);
  }
  return lines.join('\n');
}
