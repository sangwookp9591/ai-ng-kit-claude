/**
 * aing Multilingual Intent Detector
 * Supports Korean and English intent detection.
 * @module scripts/i18n/intent-detector
 */

interface LanguagePatterns {
  ko: string[];
  en: string[];
}

interface IntentResult {
  agent?: string;
  pdcaStage?: string;
  isWizardMode: boolean;
  confidence: number;
}

const INTENT_PATTERNS: Record<string, LanguagePatterns> = {
  // PDCA stage triggers
  pdca_plan: {
    ko: ['계획', '플랜', '기획', '설계', '구상'],
    en: ['plan', 'design', 'architect', 'outline']
  },
  pdca_do: {
    ko: ['구현', '실행', '개발', '만들어', '코딩', '작성'],
    en: ['implement', 'build', 'create', 'develop', 'code', 'write']
  },
  pdca_check: {
    ko: ['검증', '확인', '테스트', '검사', '리뷰', '점검'],
    en: ['verify', 'check', 'test', 'validate', 'review', 'inspect']
  },
  pdca_act: {
    ko: ['개선', '수정', '고쳐', '반영', '적용'],
    en: ['improve', 'fix', 'refactor', 'apply', 'iterate']
  },

  // Agent triggers
  agent_explore: {
    ko: ['탐색', '찾아', '어디', '구조', '분석'],
    en: ['explore', 'find', 'where', 'structure', 'analyze']
  },
  agent_review: {
    ko: ['리뷰', '검토', '코드리뷰', '품질'],
    en: ['review', 'code review', 'quality', 'audit']
  },

  // Wizard mode (non-developer friendly)
  wizard: {
    ko: ['만들어줘', '도와줘', '어떻게', '모르겠', '초보', '처음', '마법사'],
    en: ['help me', 'how do i', "don't know", 'beginner', 'first time', 'wizard', 'guide me']
  }
};

/**
 * Detect user intent from natural language input.
 */
export function detectIntent(text: string): IntentResult {
  if (!text) return { isWizardMode: false, confidence: 0 };

  const lower = text.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [intentKey, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const [lang, keywords] of Object.entries(patterns)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          const score = keyword.length / lower.length + (lang === 'ko' ? 0.1 : 0);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = intentKey;
          }
        }
      }
    }
  }

  if (!bestMatch) return { isWizardMode: false, confidence: 0 };

  const result: IntentResult = { isWizardMode: false, confidence: Math.min(bestScore * 5, 1) };

  if (bestMatch.startsWith('pdca_')) {
    result.pdcaStage = bestMatch.replace('pdca_', '');
  } else if (bestMatch.startsWith('agent_')) {
    result.agent = bestMatch.replace('agent_', '') + 'r';
    if (bestMatch === 'agent_explore') result.agent = 'explorer';
  } else if (bestMatch === 'wizard') {
    result.isWizardMode = true;
  }

  return result;
}
