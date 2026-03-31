/**
 * aing Harness Gallery — Pattern DB + recommendation engine
 * Stores, searches, and recommends harness patterns.
 * @module scripts/harness/harness-gallery
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
import { readStateOrDefault, writeState } from '../core/state.js';
import { scoreComplexity } from '../routing/complexity-scorer.js';
const log = createLogger('harness-gallery');
// ─── Gallery Paths ──────────────────────────────────────────────
function galleryDir(projectDir) {
    return join(projectDir, '.aing', 'harness-gallery');
}
function indexPath(projectDir) {
    return join(galleryDir(projectDir), 'index.json');
}
// ─── Built-in Patterns (seeded from team-examples.md) ───────────
const BUILTIN_PATTERNS = [
    {
        id: 'builtin-research-fanout',
        name: '리서치 팀',
        domain: 'research',
        pattern: 'fanout',
        executionMode: 'agent-team',
        agentCount: 4,
        agents: ['official-researcher', 'media-researcher', 'community-researcher', 'background-researcher'],
        description: '4명의 조사자가 병렬로 조사 후 통합 보고서 생성. 팀원 간 발견 공유.',
        keywords: ['리서치', 'research', '조사', '분석', '보고서', 'report', 'survey'],
        complexity: { min: 5, max: 15 },
        successCount: 0,
        failCount: 0,
        createdAt: '2026-03-31',
        source: 'builtin',
    },
    {
        id: 'builtin-code-review-fanout',
        name: '코드 리뷰 팀',
        domain: 'code-review',
        pattern: 'fanout',
        executionMode: 'agent-team',
        agentCount: 3,
        agents: ['security-reviewer', 'performance-reviewer', 'test-reviewer'],
        description: '보안/성능/테스트 3관점 병렬 리뷰. 리뷰어 간 직접 토론.',
        keywords: ['코드 리뷰', 'code review', 'review', 'PR', '보안', 'security'],
        complexity: { min: 3, max: 12 },
        successCount: 0,
        failCount: 0,
        createdAt: '2026-03-31',
        source: 'builtin',
    },
    {
        id: 'builtin-novel-pipeline',
        name: 'SF 소설 집필 팀',
        domain: 'creative-writing',
        pattern: 'pipeline',
        executionMode: 'agent-team',
        agentCount: 6,
        agents: ['worldbuilder', 'character-designer', 'plot-architect', 'prose-stylist', 'science-consultant', 'continuity-manager'],
        description: '세계관→캐릭터→플롯(병렬) → 집필 → 리뷰(병렬) → 수정. 팀 재구성 패턴.',
        keywords: ['소설', 'novel', '집필', 'writing', '창작', 'creative', 'story'],
        complexity: { min: 8, max: 15 },
        successCount: 0,
        failCount: 0,
        createdAt: '2026-03-31',
        source: 'builtin',
    },
    {
        id: 'builtin-webtoon-producer',
        name: '웹툰 제작 팀',
        domain: 'webtoon',
        pattern: 'producer-reviewer',
        executionMode: 'sub-agent',
        agentCount: 2,
        agents: ['webtoon-artist', 'webtoon-reviewer'],
        description: '아티스트 생성 → 리뷰어 검수 → 재생성 루프 (최대 2회).',
        keywords: ['웹툰', 'webtoon', '만화', 'comic', '패널', 'panel', '생성'],
        complexity: { min: 2, max: 8 },
        successCount: 0,
        failCount: 0,
        createdAt: '2026-03-31',
        source: 'builtin',
    },
    {
        id: 'builtin-migration-supervisor',
        name: '코드 마이그레이션 팀',
        domain: 'migration',
        pattern: 'supervisor',
        executionMode: 'agent-team',
        agentCount: 4,
        agents: ['migration-supervisor', 'migrator-1', 'migrator-2', 'migrator-3'],
        description: '감독자가 파일 복잡도를 분석하고 워커에게 동적으로 배치 할당.',
        keywords: ['마이그레이션', 'migration', '변환', 'convert', '대규모', 'bulk', '리팩토링'],
        complexity: { min: 7, max: 15 },
        successCount: 0,
        failCount: 0,
        createdAt: '2026-03-31',
        source: 'builtin',
    },
];
// ─── Gallery Operations ─────────────────────────────────────────
export function initGallery(projectDir) {
    const dir = galleryDir(projectDir);
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    const existing = readStateOrDefault(indexPath(projectDir), null);
    if (!existing) {
        writeState(indexPath(projectDir), BUILTIN_PATTERNS);
        log.info('Gallery initialized with builtin patterns', { count: BUILTIN_PATTERNS.length });
    }
}
export function getPatterns(projectDir) {
    initGallery(projectDir);
    return readStateOrDefault(indexPath(projectDir), BUILTIN_PATTERNS);
}
export function registerPattern(entry, projectDir) {
    const patterns = getPatterns(projectDir);
    // Avoid duplicates
    const existing = patterns.findIndex(p => p.id === entry.id);
    if (existing >= 0) {
        patterns[existing] = entry;
    }
    else {
        patterns.push(entry);
    }
    writeState(indexPath(projectDir), patterns);
    log.info('Pattern registered', { id: entry.id, name: entry.name });
}
export function updateMetrics(patternId, success, metrics, projectDir) {
    const patterns = getPatterns(projectDir);
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern)
        return;
    if (success)
        pattern.successCount++;
    else
        pattern.failCount++;
    pattern.metrics = {
        quality: metrics.quality ?? pattern.metrics?.quality,
        tokens: metrics.tokens ?? pattern.metrics?.tokens,
        duration: metrics.duration ?? pattern.metrics?.duration,
    };
    writeState(indexPath(projectDir), patterns);
}
// ─── Search & Recommend ─────────────────────────────────────────
export function searchPatterns(query, projectDir) {
    const patterns = getPatterns(projectDir);
    const lower = query.toLowerCase();
    return patterns
        .map(p => ({ pattern: p, score: matchScore(p, lower) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(r => r.pattern);
}
function matchScore(entry, query) {
    let score = 0;
    // Name match
    if (entry.name.toLowerCase().includes(query))
        score += 10;
    // Domain match
    if (entry.domain.toLowerCase().includes(query))
        score += 8;
    // Keyword match
    for (const kw of entry.keywords) {
        if (kw.toLowerCase().includes(query) || query.includes(kw.toLowerCase())) {
            score += 3;
        }
    }
    // Description match
    if (entry.description.toLowerCase().includes(query))
        score += 2;
    // Success rate bonus
    const total = entry.successCount + entry.failCount;
    if (total > 0) {
        score += (entry.successCount / total) * 3;
    }
    return score;
}
export function recommendPattern(taskDescription, signals, projectDir) {
    const complexity = scoreComplexity(signals);
    const patterns = getPatterns(projectDir);
    const lower = taskDescription.toLowerCase();
    return patterns
        .filter(p => complexity.score >= p.complexity.min && complexity.score <= p.complexity.max)
        .map(p => ({ pattern: p, score: matchScore(p, lower) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(r => r.pattern);
}
// ─── Display ────────────────────────────────────────────────────
export function formatGallery(entries) {
    if (!entries.length)
        return '  검색 결과 없음.';
    const lines = [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '  aing harness find: 패턴 갤러리',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
    ];
    for (const entry of entries) {
        const total = entry.successCount + entry.failCount;
        const rate = total > 0 ? `${Math.round(entry.successCount / total * 100)}%` : '-';
        const source = entry.source === 'builtin' ? '[builtin]' : '[user]';
        lines.push(`  ${entry.name} ${source}`);
        lines.push(`    패턴: ${entry.pattern} | 모드: ${entry.executionMode} | 에이전트: ${entry.agentCount}명`);
        lines.push(`    성공률: ${rate} | 복잡도: ${entry.complexity.min}-${entry.complexity.max}`);
        lines.push(`    ${entry.description}`);
        lines.push('');
    }
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return lines.join('\n');
}
//# sourceMappingURL=harness-gallery.js.map