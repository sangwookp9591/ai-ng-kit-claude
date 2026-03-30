---
name: benchmark
description: |
  Performance regression detection. Establishes baselines and detects
  regressions in page load, bundle size, and runtime performance.
  Use when asked to "benchmark", "check performance", or "is it slower".
---

# /aing benchmark — Performance Regression Detection

## Metrics

### Build Metrics
- Bundle size (total, per-chunk)
- Build time
- TypeScript compilation time
- Number of dependencies

### Runtime Metrics (via browse)
- Page load time (domContentLoaded, load)
- Time to Interactive (TTI)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

### Code Metrics
- Function count
- Cyclomatic complexity (top files)
- Import depth
- Dead code percentage

## Regression Budgets

| Metric | Warning | Critical |
|--------|---------|----------|
| Bundle size | +5% | +10% |
| Build time | +20% | +50% |
| Page load | +200ms | +500ms |
| LCP | +100ms | +250ms |
| CLS | +0.05 | +0.1 |

## Workflow

1. **Baseline**: Read `.aing/benchmarks/baseline.json` or create one
2. **Measure**: Run current measurements
3. **Compare**: Diff against baseline
4. **Report**: Generate regression report with pass/fail per metric
5. **Update**: If all pass, optionally update baseline

## Output

Write to `.aing/benchmarks/report-{date}.json`
