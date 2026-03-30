/**
 * aing Analytics — Usage statistics dashboard
 * @module scripts/cli/aing-analytics
 */
import { readUsageLog } from '../telemetry/telemetry-engine.js';

interface SkillStats {
  count: number;
  duration: number;
  success: number;
  error: number;
}

/**
 * Generate analytics report for a time window.
 */
export function generateAnalyticsReport(window: string = '7d', projectDir?: string): string {
  const days = parseInt(window) || 7;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const allLogs = readUsageLog(projectDir, 1000);
  const filtered = allLogs.filter((l: Record<string, unknown>) => new Date(l.ts as string) >= cutoff);

  if (filtered.length === 0) return `No activity in the last ${days} days.`;

  // Aggregate by skill
  const skills: Record<string, SkillStats> = {};
  let totalDuration = 0;
  let successCount = 0;

  for (const entry of filtered) {
    const skill = (entry.skill as string) || 'unknown';
    if (!skills[skill]) skills[skill] = { count: 0, duration: 0, success: 0, error: 0 };
    skills[skill].count++;
    skills[skill].duration += (entry.duration_s as number) || 0;
    totalDuration += (entry.duration_s as number) || 0;
    if (entry.outcome === 'success') { successCount++; skills[skill].success++; }
    else { skills[skill].error++; }
  }

  const sorted = Object.entries(skills).sort((a, b) => b[1].count - a[1].count);
  const maxCount = sorted[0]?.[1].count || 1;

  const lines: string[] = [
    `aing analytics (last ${days} days)`,
    '\u2501'.repeat(50),
  ];

  for (const [name, data] of sorted.slice(0, 15)) {
    const barLen = Math.round((data.count / maxCount) * 20);
    const bar = '\u2588'.repeat(barLen).padEnd(20);
    const avg = data.count > 0 ? Math.round(data.duration / data.count) : 0;
    lines.push(`  ${name.padEnd(20)} ${bar} ${data.count}x (avg ${avg}s)`);
  }

  const successRate = filtered.length > 0 ? Math.round((successCount / filtered.length) * 100) : 0;
  lines.push('\u2501'.repeat(50));
  lines.push(`Success: ${successRate}% | Total: ${filtered.length} runs | Duration: ${Math.round(totalDuration / 60)}m`);

  return lines.join('\n');
}
