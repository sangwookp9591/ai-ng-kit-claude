---
name: flutter-animation
description: "Flutter 애니메이션 구현. Implicit/Explicit/Hero/Physics-Based 애니메이션 전략 및 워크플로우."
triggers: ["flutter animation", "flutter 애니메이션", "motion", "transition"]
---

# /aing flutter-animation — Flutter Animation Implementation

## Agent Deployment

Rowan(Mobile/sonnet) 에이전트가 Flutter 애니메이션을 구현합니다.

```
Agent({
  subagent_type: "aing:rowan",
  description: "Rowan: Flutter 애니메이션 구현 — {task}",
  model: "sonnet"
})
```

## Core Concepts

Flutter 애니메이션은 타입된 `Animation` 시스템을 사용합니다. 프레임을 수동 계산하지 마세요.

- **`Animation<T>`**: 시간에 따라 변하는 값의 추상 표현. UI를 모름.
- **`AnimationController`**: 애니메이션 구동. 0.0~1.0 값 생성. **반드시 `vsync: this` 제공** (SingleTickerProviderStateMixin). **반드시 `dispose()` 호출**.
- **`Tween<T>`**: 입력 범위(0.0-1.0)를 출력 타입(Color, Offset, double)으로 매핑.
- **`Curve`**: 비선형 타이밍 (Curves.easeIn, Curves.bounceOut) 적용.

## Animation Strategy Selection

| 상황 | 접근법 |
|------|--------|
| 단순 속성 변경 (size, color, opacity) | **Implicit** (AnimatedContainer, AnimatedOpacity, TweenAnimationBuilder) |
| 재생 제어 필요 (play, pause, reverse, loop) | **Explicit** (AnimationController + AnimatedBuilder) |
| 두 라우트 간 위젯 전환 | **Hero** Animation |
| 제스처 기반 자연스러운 움직임 | **Physics-Based** (SpringSimulation) |
| 순차/겹침 모션 | **Staggered** (Interval curves + 단일 Controller) |

## Workflows

### Implicit Animation
1. 애니메이션할 속성 식별 (width, color 등)
2. 정적 위젯을 애니메이션 대응 위젯으로 교체 (Container → AnimatedContainer)
3. `duration` 속성 정의
4. (선택) `curve` 속성 정의
5. `setState()` 내에서 속성 업데이트로 트리거

### Explicit Animation
1. State 클래스에 `SingleTickerProviderStateMixin` 추가
2. `initState()`에서 `AnimationController` 초기화 (`vsync: this`, `duration`)
3. `Tween` 정의 후 `.animate()`로 컨트롤러에 연결
4. `AnimatedBuilder`로 대상 UI 래핑
5. `controller.forward()`, `.reverse()`, `.repeat()`으로 재생 제어
6. **`dispose()`에서 `controller.dispose()` 호출 필수**

### Hero Transition
1. 소스 위젯을 `Hero`로 래핑 + 고유 `tag` 할당
2. 목적지 위젯도 `Hero`로 래핑 + **동일한 `tag`**
3. `Navigator`로 라우트 전환 시 자동 트리거

### Physics-Based Animation
1. `AnimationController` 설정 (고정 duration 없이)
2. `GestureDetector`로 제스처 속도 캡처 (`onPanEnd`)
3. 속도를 애니메이션 좌표계로 변환
4. `SpringSimulation` 생성 (mass, stiffness, damping, velocity)
5. `controller.animateWith(simulation)`으로 구동

## Example: Staggered Animation

```dart
class StaggeredAnimationDemo extends StatefulWidget {
  @override
  State<StaggeredAnimationDemo> createState() => _StaggeredAnimationDemoState();
}

class _StaggeredAnimationDemoState extends State<StaggeredAnimationDemo>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _widthAnimation;
  late Animation<Color?> _colorAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    _widthAnimation = Tween<double>(begin: 50.0, end: 200.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.5, curve: Curves.easeIn),
      ),
    );
    _colorAnimation = ColorTween(begin: Colors.blue, end: Colors.red).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.5, 1.0, curve: Curves.easeOut),
      ),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: _widthAnimation.value,
          height: 50.0,
          color: _colorAnimation.value,
        );
      },
    );
  }
}
```

## Example: Custom Page Route Transition

```dart
Route createCustomRoute(Widget destination) {
  return PageRouteBuilder(
    pageBuilder: (context, animation, secondaryAnimation) => destination,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      const begin = Offset(0.0, 1.0);
      const end = Offset.zero;
      const curve = Curves.easeOut;
      final tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
      final offsetAnimation = animation.drive(tween);
      return SlideTransition(position: offsetAnimation, child: child);
    },
  );
}
```
