---
name: evidence-verification
description: 증거 기반 검증 스킬. 작업 완료를 구조화된 증거 체인으로 증명합니다.
triggers: ["증거", "증명", "evidence", "verify", "proof", "완료 확인"]
agents:
  verify: verifier
---

# Evidence-Based Verification (Innovation #4)

"완료"는 증거가 있을 때만 선언합니다.

## Evidence Types
- **test**: 테스트 실행 결과 (pass/fail/skip count)
- **build**: 빌드 성공/실패 로그
- **lint**: 린트 에러/경고 카운트
- **diff**: 변경 파일 목록 + 라인 수
- **design**: Stitch 디자인 생성/편집 결과 (screenshot URL, projectId, screenId). PASS: 화면 정상 생성 + asset 저장 완료.
- **visual-qa**: 시각 검증 결과 (Chrome DevTools 스크린샷 비교 또는 수동 확인). PASS: 레이아웃/스타일 일치. Chrome DevTools MCP 미설치 시 `not_available` 허용.
- **component-ast**: AST 기반 코드 검증 결과 (`npm run validate` 출력). PASS: 하드코딩 hex 없음, TypeScript interface 존재, dark mode 클래스 포함.

## Evidence Chain
각 PDCA Check 단계에서 수집된 증거를 체인으로 연결합니다.

```
Feature: user-auth
├── [test] 2026-03-19T12:00:00Z — PASS (24/24)
├── [build] 2026-03-19T12:01:00Z — PASS
├── [lint] 2026-03-19T12:02:00Z — PASS (0 errors)
└── Verdict: PASS ✓
```

## Verdict Rules
- All evidence PASS → Overall PASS
- Any evidence FAIL → Overall FAIL (with reason)
- Missing evidence type → NOT_AVAILABLE (not auto-PASS)
- `visual-qa: not_available` → Chrome DevTools MCP 미설치로 인한 스킵 허용 (전체 verdict에 영향 없음)
- `design: not_available` → Stitch MCP 미설치로 인한 스킵 허용 (design skill fallback 모드)
