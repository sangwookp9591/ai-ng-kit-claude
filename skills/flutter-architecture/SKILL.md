---
name: flutter-architecture
description: "Flutter 앱 아키텍처 설계. 레이어드 구조(UI/Logic/Data), 상태 관리, 프로젝트 구조화."
triggers: ["flutter architecture", "flutter 아키텍처", "flutter 설계", "flutter project structure"]
---

# /aing flutter-architecture — Flutter App Architecture

## Agent Deployment

Rowan(Mobile/sonnet) 에이전트가 Flutter 아키텍처를 설계합니다.

```
Agent({
  subagent_type: "aing:rowan",
  description: "Rowan: Flutter 아키텍처 설계 — {task}",
  model: "sonnet"
})
```

## Core Architectural Principles

- **Separation of Concerns**: UI/Logic/Data 계층 분리. 각 레이어는 인접 레이어만 접근.
- **Single Source of Truth (SSOT)**: Data layer가 유일한 데이터 소유자. SSOT만 데이터 변경 권한 보유.
- **Unidirectional Data Flow (UDF)**: State↓(Data→UI), Events↑(UI→Data)
- **UI as Function of State**: 불변 상태 객체로 UI 구동. 상태 변경 시 리액티브 리빌드.

## Layer Structure

### 1. UI Layer (Presentation)
- **Views (Widgets)**: 재사용 가능한 lean 위젯. 비즈니스/데이터 로직 금지. UI 관심사만 (animation, routing, layout).
- **ViewModels**: UI 상태 관리. Domain 모델 → 프레젠테이션 포맷 변환. 사용자 인터랙션 이벤트 처리.

### 2. Logic Layer (Domain) — 조건부
- 복잡한 클라이언트 비즈니스 로직이 필요할 때만 구현
- Use Cases/Interactors로 다수 Repository 간 상호작용 오케스트레이션
- 표준 CRUD 앱이면 이 레이어 생략 → ViewModel이 직접 Repository 사용

### 3. Data Layer (Model)
- **Services**: 외부 API 래퍼 (HTTP, DB, 플랫폼 플러그인). Stateless. 데이터 소스당 1개.
- **Repositories**: SSOT. Service에서 raw 데이터 소비. 캐싱, 오프라인 동기화, 재시도 처리. Domain Model로 변환.

## Feature Implementation Workflow

1. **Domain Models 정의** — 불변 Dart 클래스
2. **Services 구현** — Stateless API 래퍼
3. **Repositories 구현** — Services 소비, 캐싱, Domain Model 반환
4. **ViewModels 구현** — Repositories 소비, 불변 상태 노출, 사용자 액션 메서드
5. **Views 구현** — ViewModel 상태 바인딩, 인터랙션 트리거
6. **테스트 실행** — Service/Repository/ViewModel 유닛 테스트 + View 위젯 테스트

## Example: Data Layer

```dart
// 1. Service (Stateless API Wrapper)
class UserApiService {
  final HttpClient _client;
  UserApiService(this._client);

  Future<Map<String, dynamic>> fetchUserRaw(String userId) async {
    final response = await _client.get('/users/$userId');
    return response.data;
  }
}

// 2. Domain Model (Immutable)
class User {
  final String id;
  final String name;
  const User({required this.id, required this.name});
}

// 3. Repository (SSOT & Data Transformer)
class UserRepository {
  final UserApiService _apiService;
  User? _cachedUser;
  UserRepository(this._apiService);

  Future<User> getUser(String userId) async {
    if (_cachedUser != null && _cachedUser!.id == userId) {
      return _cachedUser!;
    }
    final rawData = await _apiService.fetchUserRaw(userId);
    final user = User(id: rawData['id'], name: rawData['name']);
    _cachedUser = user;
    return user;
  }
}
```

## Example: UI Layer

```dart
// 4. ViewModel (State Management)
class UserViewModel extends ChangeNotifier {
  final UserRepository _userRepository;
  User? user;
  bool isLoading = false;
  String? error;

  UserViewModel(this._userRepository);

  Future<void> loadUser(String userId) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      user = await _userRepository.getUser(userId);
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}

// 5. View (Lean UI)
class UserProfileView extends StatelessWidget {
  final UserViewModel viewModel;
  const UserProfileView({Key? key, required this.viewModel}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: viewModel,
      builder: (context, child) {
        if (viewModel.isLoading) return const CircularProgressIndicator();
        if (viewModel.error != null) return Text('Error: ${viewModel.error}');
        if (viewModel.user == null) return const Text('No user data.');
        return Text('Hello, ${viewModel.user!.name}');
      },
    );
  }
}
```

## Project Structure Template

```
lib/
├── main.dart
├── config/
│   ├── theme.dart
│   └── routes.dart
├── data/
│   ├── services/          # Stateless API wrappers
│   ├── repositories/      # SSOT, caching, transformation
│   └── models/            # Domain models (immutable)
├── logic/                 # (Optional) Use Cases / Interactors
├── ui/
│   ├── screens/           # Full page views
│   ├── widgets/           # Reusable components
│   └── view_models/       # State management
└── utils/
    ├── constants.dart
    └── extensions.dart
```
