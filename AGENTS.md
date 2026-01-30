# AI Agents Collaboration Guide

이 문서는 여러 AI 에이전트가 LightOn 프로젝트에서 협업할 때의 공통 규칙입니다.

## 프로젝트 정보

| 항목 | 내용 |
|------|------|
| **프로젝트명** | LightOn - 다크패턴 탐지 Chrome Extension |
| **목표** | 웹사이트의 다크패턴을 탐지하고 사용자에게 알림 |
| **기술 스택** | JavaScript (ES6+), Chrome Extension Manifest V3 |
| **빌드 도구** | 없음 (Vanilla JS) |

## 핵심 파일

| 파일 | 역할 | 수정 시 주의 |
|------|------|-------------|
| `manifest.json` | Extension 설정 | 권한 변경 주의 |
| `scripts/detector.js` | 탐지 엔진 | 성능 영향 큼 |
| `scripts/highlighter.js` | UI 렌더링 | z-index, 스타일 충돌 |
| `scripts/patterns/*.js` | 패턴 정의 | 스키마 준수 |
| `styles/highlight.css` | 하이라이팅 스타일 | !important 사용 |

## 협업 규칙

### 1. 작업 전 확인

```
1. 현재 브랜치 확인
2. 최신 코드 pull
3. 작업할 파일의 현재 상태 파악
4. 관련 문서 읽기 (CLAUDE.md, GEMINI.md 등)
```

### 2. 파일 수정 원칙

- **단일 책임**: 하나의 작업에서 관련 파일만 수정
- **최소 변경**: 필요한 부분만 수정, 불필요한 리팩토링 자제
- **테스트**: 수정 후 반드시 `test/test-page.html`에서 확인

### 3. 충돌 방지

여러 에이전트가 동시 작업 시:

```
[ ] 같은 파일 동시 수정 피하기
[ ] 작업 시작 전 담당 파일 명시
[ ] 커밋 메시지에 작업 내용 상세히 기록
```

## 패턴 카테고리

| 카테고리 | ID | 설명 |
|---------|-----|------|
| 인터페이스 조작 | `interface` | 버튼, 체크박스 등 UI 조작 |
| 규정의 숨김 | `sneaking` | 숨겨진 비용, 작은 글씨 |
| 경로의 방해 | `obstruction` | 복잡한 해지 경로 |
| 반복적 간섭 | `nagging` | 반복 팝업, 알림 |
| 사회적 증거 | `social` | 가짜 리뷰, 카운트다운 |
| 행동의 강요 | `forced` | 필수 동의, 정보 공개 |

## 심각도 레벨

| 레벨 | 값 | 색상 | 사용 시점 |
|------|-----|------|----------|
| 낮음 | `low` | Teal (#4ECDC4) | 혼란을 줄 수 있는 패턴 |
| 중간 | `medium` | Yellow (#FFB800) | 사용자 판단을 흐리는 패턴 |
| 높음 | `high` | Red (#FF6B6B) | 금전적 손해 유발 패턴 |

## 디버깅

### 콘솔 로그 확인
```javascript
// content script 로그는 페이지 콘솔에서 확인
console.log('[LightOn]', message);
```

### 확장 프로그램 새로고침
```
1. chrome://extensions 열기
2. LightOn 카드에서 새로고침 클릭
3. 테스트 페이지 새로고침
```

## 커밋 규칙

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: 새 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링
- `style`: 코드 스타일 (기능 변경 없음)
- `docs`: 문서
- `test`: 테스트

### Scope (선택)
- `detector`: 탐지 엔진
- `highlighter`: 하이라이팅
- `patterns`: 패턴 정의
- `popup`: 팝업 UI
- `i18n`: 다국어

## 참고 문서

- `CLAUDE.md`: Claude AI 전용 가이드
- `GEMINI.md`: Gemini AI 전용 가이드
- `test/test-page.html`: 다크패턴 테스트 예시
