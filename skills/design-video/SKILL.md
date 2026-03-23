---
name: design-video
description: "🎬 Rowan 에이전트로 Remotion 워크스루 영상 생성. Stitch 디자인 → 전환/줌/오버레이 영상."
triggers: ["design-video", "디자인영상", "워크스루", "walkthrough", "remotion", "영상 생성"]
---

# /swkit design-video — Design Walkthrough Video Generation

## Usage
```
/swkit design-video
/swkit design-video "Calculator App 워크스루"
```

## Agent Deployment

```
Agent({
  subagent_type: "sw-kit:rowan",
  description: "Rowan: 디자인 워크스루 영상 생성",
  model: "sonnet",
  prompt: "..."
})
```

## PDCA Mapping
- **Do**: 영상 컴포지션 생성 및 렌더링
- **Check**: 렌더링 결과 스크린샷으로 검증

## MCP Availability Check (MANDATORY)

### Stitch MCP
1. `list_tools`로 Stitch MCP prefix 탐색
2. **발견 시**: 프로젝트 스크린 자동 수집
3. **미발견 시**: `.sw-kit/designs/` 로컬 스크린샷 사용

### Remotion
1. `remotion.config.ts` 또는 Remotion 의존성 존재 확인
2. **미설치 시**: 설치 안내 후 CLI fallback

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️ Remotion 미설치
  npm create video@latest -- --blank
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Execution Steps

### Step 1: Gather Screen Assets

**With Stitch MCP:**
1. `[prefix]:list_projects` → 대상 프로젝트 식별
2. `[prefix]:list_screens` → 모든 화면 수집
3. 각 화면의 `screenshot.downloadUrl`에 `=w{width}` 추가 후 다운로드
4. `assets/screens/{screen-name}.png`에 저장

**Without Stitch MCP:**
1. `.sw-kit/designs/*.png` 파일 수집
2. 파일명 순서대로 정렬

### Step 2: Create Screen Manifest

```json
{
  "projectName": "App Name",
  "screens": [
    {
      "id": "1",
      "title": "Home Screen",
      "description": "Main interface",
      "imagePath": "assets/screens/home.png",
      "width": 1200,
      "height": 800,
      "duration": 4
    }
  ]
}
```

### Step 3: Generate Remotion Components

1. **`ScreenSlide.tsx`**: 개별 화면 표시 (zoom-in, fade 애니메이션)
2. **`WalkthroughComposition.tsx`**: 메인 영상 (Sequence, 전환 효과)
3. **`config.ts`**: 프레임레이트(30fps), 해상도, 전체 재생시간

### Step 4: Transitions & Effects

```tsx
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
```

- **Fade**: 화면 간 부드러운 크로스페이드
- **Slide**: 방향성 슬라이드 전환
- **Zoom**: spring() 애니메이션으로 주요 UI 강조
- **Text Overlay**: 화면 제목, 기능 설명, 진행 표시기

### Step 5: Preview & Render

```bash
# Preview
npm run dev

# Render
npx remotion render WalkthroughComposition output.mp4 --codec h264
```

## Video Patterns

| Pattern | 설명 | 사용 시점 |
|---------|------|----------|
| Simple Slideshow | Fade 전환, 3-5초/화면, 하단 텍스트 | 기본 워크스루 |
| Feature Highlight | 특정 영역 Zoom, 화살표/원 애니메이션 | 기능 강조 |
| User Flow | 순차 Slide 전환, 번호 오버레이 | 사용자 여정 |

## Evidence Collection

| Evidence Type | 수집 방법 | PASS 기준 |
|--------------|----------|----------|
| `design` | 렌더링 완료 파일 경로 | `.sw-kit/videos/` 에 MP4 존재 |

## Output Directory

```
.sw-kit/videos/
└── {project-name}-walkthrough.mp4
```

## Troubleshooting

| 이슈 | 해결 |
|------|------|
| 스크린샷 흐림 | 다운로드 시 `=w{width}` 파라미터로 원본 해상도 요청 |
| 텍스트 겹침 | 텍스트 위치 및 타이밍 조정 |
| 전환 버벅임 | 프레임레이트 60fps + spring damping 조정 |
| 빌드 실패 | Node 버전 호환성 + Remotion 의존성 확인 |
