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
