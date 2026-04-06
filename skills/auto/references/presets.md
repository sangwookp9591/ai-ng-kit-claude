# Team Presets

## Standard Presets

### Solo (complexity <= 2)
```
Agent(name: "jay", subagent_type: "aing:jay", description: "Jay: {task}", model: "opus")
```

### Duo (complexity 3-4)
```
Agent(name: "jay", subagent_type: "aing:jay", description: "Jay: {task}", model: "opus")
Agent(name: "milla", subagent_type: "aing:milla", description: "Milla: 보안 리뷰", model: "opus")
```

### Squad (complexity 5-6)
```
Agent(name: "able", subagent_type: "aing:able", description: "Able: 요구사항 + 태스크 분해", model: "opus")
Agent(name: "jay", subagent_type: "aing:jay", description: "Jay: {task}", model: "opus")
Agent(name: "derek", subagent_type: "aing:derek", description: "Derek: {task}", model: "opus")
Agent(name: "sam", subagent_type: "aing:sam", description: "Sam: 증거 수집 + 최종 판정", model: "haiku")
```

### Full (complexity >= 7)
```
Agent(name: "able", subagent_type: "aing:able", description: "Able: 요구사항 + 태스크 분해", model: "opus")
Agent(name: "klay", subagent_type: "aing:klay", description: "Klay: 아키텍처 탐색 + 구조 분석", model: "opus")
Agent(name: "jay", subagent_type: "aing:jay", description: "Jay: {task}", model: "opus")
Agent(name: "jerry", subagent_type: "aing:jerry", description: "Jerry: DB 스키마 + 마이그레이션", model: "opus")
Agent(name: "milla", subagent_type: "aing:milla", description: "Milla: 보안 리뷰 + 코드 품질", model: "opus")
Agent(name: "derek", subagent_type: "aing:derek", description: "Derek: {task}", model: "opus")
Agent(name: "sam", subagent_type: "aing:sam", description: "Sam: 증거 수집 + 최종 판정", model: "haiku")
```

## Design Presets

디자인 도메인이 감지되면 아래 preset을 사용합니다.

### Design Solo (디자인 생성만)
```
Agent(name: "willji", subagent_type: "aing:willji", description: "Willji: UI 디자인 생성", model: "opus")
```

### Design Duo (디자인 → 코드)
```
Agent(name: "willji", subagent_type: "aing:willji", description: "Willji: UI 디자인 생성", model: "opus")
Agent(name: "iron", subagent_type: "aing:iron", description: "Iron: 디자인 → React 변환", model: "opus")
```

### Design Squad (디자인 → 코드 → 모션 → 검증)
```
Agent(name: "willji", subagent_type: "aing:willji", description: "Willji: UI 디자인 생성", model: "opus")
Agent(name: "iron", subagent_type: "aing:iron", description: "Iron: 디자인 → React 변환", model: "opus")
Agent(name: "derek", subagent_type: "aing:derek", description: "Derek: 인터랙션 + 모션", model: "opus")
Agent(name: "sam", subagent_type: "aing:sam", description: "Sam: 증거 수집 + 최종 판정", model: "haiku")
```

Design Preset 선택 기준:
| Preset | 조건 |
|--------|------|
| Design Solo | 디자인 생성/편집만 요청 |
| Design Duo | 디자인 + 코드 변환 요청 |
| Design Squad | 디자인 + 코드 + 모션/영상 또는 복잡한 멀티페이지 |
