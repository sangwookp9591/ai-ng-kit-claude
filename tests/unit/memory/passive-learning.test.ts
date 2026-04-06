/**
 * Unit tests for capturePassive() in scripts/memory/learning-capture.ts
 * TDD: RED -> GREEN -> REFACTOR
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';


vi.mock('../../../scripts/memory/project-memory.js', () => ({
  loadMemory: vi.fn(() => ({
    techStack: {},
    conventions: {},
    patterns: [],
    pitfalls: [],
    decisions: [],
  })),
  saveMemory: vi.fn(),
  addMemoryEntry: vi.fn(),
}));

vi.mock('../../../scripts/core/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../../../scripts/core/config.js', () => ({
  loadConfig: vi.fn(() => ({})),
  getConfig: vi.fn((_path: string, fallback: unknown) => fallback),
}));

import {
  capturePassive,
} from '../../../scripts/memory/learning-capture.js';
import { loadMemory, saveMemory, addMemoryEntry } from '../../../scripts/memory/project-memory.js';

const mockLoadMemory = vi.mocked(loadMemory);
const mockSaveMemory = vi.mocked(saveMemory);
const mockAddMemoryEntry = vi.mocked(addMemoryEntry);

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveMemory.mockReturnValue({ ok: true });
  mockLoadMemory.mockReturnValue({
    techStack: {},
    conventions: {},
    patterns: [],
    pitfalls: [],
    decisions: [],
  });
});

// ---------------------------------------------------------------------------
// capturePassive — basic behavior
// ---------------------------------------------------------------------------
describe('capturePassive — basic', () => {
  it('호출 시 pitfalls에 항목이 추가된다', () => {
    capturePassive({ trigger: 'session-end', content: '세션 종료 감지' }, '/project');
    expect(mockAddMemoryEntry).toHaveBeenCalledWith(
      'pitfalls',
      '세션 종료 감지',
      '/project',
      { confidence: 7, source: 'passive' }
    );
  });

  it('context가 있으면 [context] prefix가 붙는다', () => {
    capturePassive(
      { trigger: 'guardrail-denial', content: 'rm -rf 차단', context: 'bash' },
      '/project'
    );
    expect(mockAddMemoryEntry).toHaveBeenCalledWith(
      'pitfalls',
      '[bash] rm -rf 차단',
      '/project',
      { confidence: 7, source: 'passive' }
    );
  });

  it('source가 passive임을 명시한다', () => {
    capturePassive({ trigger: 'error-recovery', content: '에러 복구 성공' }, '/project');
    const call = mockAddMemoryEntry.mock.calls[0];
    expect(call[3]).toMatchObject({ source: 'passive' });
  });

  it('초기 confidence가 0.7이 아닌 정수 7로 저장된다', () => {
    capturePassive({ trigger: 'session-end', content: '테스트' }, '/project');
    const call = mockAddMemoryEntry.mock.calls[0];
    expect(call[3]).toMatchObject({ confidence: 7 });
  });
});

// ---------------------------------------------------------------------------
// capturePassive — deduplication
// ---------------------------------------------------------------------------
describe('capturePassive — dedup', () => {
  it('동일 content가 이미 있으면 addMemoryEntry를 호출하지 않는다', () => {
    mockLoadMemory.mockReturnValue({
      techStack: {},
      conventions: {},
      patterns: [],
      pitfalls: [
        {
          content: '[bash] rm -rf 차단',
          addedAt: '2026-01-01T00:00:00Z',
          confidence: 7,
          source: 'passive',
        },
      ],
      decisions: [],
    });

    capturePassive(
      { trigger: 'guardrail-denial', content: 'rm -rf 차단', context: 'bash' },
      '/project'
    );

    expect(mockAddMemoryEntry).not.toHaveBeenCalled();
  });

  it('다른 content라면 추가된다', () => {
    mockLoadMemory.mockReturnValue({
      techStack: {},
      conventions: {},
      patterns: [],
      pitfalls: [
        {
          content: '[bash] rm -rf 차단',
          addedAt: '2026-01-01T00:00:00Z',
          confidence: 7,
          source: 'passive',
        },
      ],
      decisions: [],
    });

    capturePassive(
      { trigger: 'guardrail-denial', content: '다른 내용', context: 'bash' },
      '/project'
    );

    expect(mockAddMemoryEntry).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// capturePassive — MAX_PITFALLS cap (100)
// ---------------------------------------------------------------------------
describe('capturePassive — pitfalls cap', () => {
  it('pitfalls가 100개를 초과하면 잘라낸다', () => {
    const many = Array.from({ length: 101 }, (_, i) => ({
      content: `pitfall-${i}`,
      addedAt: '2026-01-01T00:00:00Z',
      confidence: 7,
      source: 'passive' as const,
    }));

    // First call returns empty (for dedup), second returns 101 entries (after add)
    mockLoadMemory
      .mockReturnValueOnce({ techStack: {}, conventions: {}, patterns: [], pitfalls: [], decisions: [] })
      .mockReturnValueOnce({ techStack: {}, conventions: {}, patterns: [], pitfalls: many, decisions: [] });

    capturePassive({ trigger: 'session-end', content: 'new-entry' }, '/project');

    // saveMemory should be called with sliced pitfalls
    expect(mockSaveMemory).toHaveBeenCalled();
    const savedMemory = mockSaveMemory.mock.calls[0][0];
    expect(savedMemory.pitfalls.length).toBeLessThanOrEqual(100);
  });

  it('pitfalls가 100개 이하면 saveMemory를 추가로 호출하지 않는다', () => {
    const few = Array.from({ length: 50 }, (_, i) => ({
      content: `pitfall-${i}`,
      addedAt: '2026-01-01T00:00:00Z',
      confidence: 7,
      source: 'passive' as const,
    }));

    mockLoadMemory
      .mockReturnValueOnce({ techStack: {}, conventions: {}, patterns: [], pitfalls: [], decisions: [] })
      .mockReturnValueOnce({ techStack: {}, conventions: {}, patterns: [], pitfalls: few, decisions: [] });

    capturePassive({ trigger: 'session-end', content: 'new-entry' }, '/project');

    // saveMemory should NOT be called (under the cap)
    expect(mockSaveMemory).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// capturePassive — trigger types
// ---------------------------------------------------------------------------
describe('capturePassive — trigger types', () => {
  it('guardrail-denial 트리거가 동작한다', () => {
    capturePassive({ trigger: 'guardrail-denial', content: '차단 이벤트' }, '/project');
    expect(mockAddMemoryEntry).toHaveBeenCalled();
  });

  it('error-recovery 트리거가 동작한다', () => {
    capturePassive({ trigger: 'error-recovery', content: '복구 이벤트' }, '/project');
    expect(mockAddMemoryEntry).toHaveBeenCalled();
  });

  it('session-end 트리거가 동작한다', () => {
    capturePassive({ trigger: 'session-end', content: '종료 이벤트' }, '/project');
    expect(mockAddMemoryEntry).toHaveBeenCalled();
  });
});
