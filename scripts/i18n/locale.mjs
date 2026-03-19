/**
 * sw-kit Locale — Bilingual message support (ko/en)
 * @module scripts/i18n/locale
 */

import { getConfig } from '../core/config.mjs';

const MESSAGES = {
  pdca_started: {
    ko: (f) => `PDCA 시작: "${f}" — Plan 단계로 진입합니다.`,
    en: (f) => `PDCA started: "${f}" — entering Plan stage.`
  },
  pdca_advanced: {
    ko: (from, to) => `${from} → ${to} 단계로 전환되었습니다.`,
    en: (from, to) => `Advanced from ${from} to ${to}.`
  },
  pdca_completed: {
    ko: (f) => `"${f}" PDCA 사이클이 완료되었습니다! ✓`,
    en: (f) => `PDCA cycle for "${f}" completed! ✓`
  },
  evidence_pass: {
    ko: '모든 증거가 통과되었습니다. ✓',
    en: 'All evidence passed. ✓'
  },
  evidence_fail: {
    ko: '일부 증거가 실패했습니다. 확인이 필요합니다.',
    en: 'Some evidence failed. Review required.'
  },
  circuit_open: {
    ko: (f) => `[자동 복구] "${f}" 기능이 반복 실패로 일시 비활성화되었습니다.`,
    en: (f) => `[Self-Healing] "${f}" disabled due to repeated failures.`
  },
  wizard_welcome: {
    ko: '안녕하세요! 무엇을 만들고 싶으세요? 🪄',
    en: 'Hello! What would you like to build? 🪄'
  },
  budget_warning: {
    ko: (pct) => `[컨텍스트 예산] ~${pct}% 사용 중`,
    en: (pct) => `[Context Budget] ~${pct}% used`
  }
};

/**
 * Get a localized message.
 * @param {string} key - Message key
 * @param  {...any} args - Message arguments
 * @returns {string}
 */
export function msg(key, ...args) {
  const locale = getConfig('i18n.defaultLocale', 'ko');
  const msgDef = MESSAGES[key];
  if (!msgDef) return key;

  const template = msgDef[locale] || msgDef.en;
  return typeof template === 'function' ? template(...args) : template;
}
