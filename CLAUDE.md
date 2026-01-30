# Claude AI Agent Guidelines

이 문서는 Claude AI가 LightOn 프로젝트에서 작업할 때 따라야 할 규칙과 가이드라인입니다.

## 프로젝트 개요

**LightOn**은 웹사이트의 다크패턴을 탐지하고 하이라이팅하는 Chrome Extension입니다.

- **핵심 원칙**: 확장 가능한 패턴 시스템, 최소한의 UI 방해, 사용자 친화적
- **기술 스택**: Vanilla JavaScript (ES6+), Chrome Extension Manifest V3

## 디렉토리 구조

```
lighton/
├── manifest.json           # Extension 설정
├── scripts/
│   ├── background.js       # Service Worker
│   ├── content.js          # Content Script (진입점)
│   ├── detector.js         # 패턴 탐지 엔진
│   ├── highlighter.js      # 하이라이팅 렌더러
│   ├── patterns/           # 패턴 정의 (탐지만)
│   │   ├── registry.js     # 패턴 레지스트리
│   │   ├── interface.js    # 인터페이스 조작 패턴
│   │   └── sneaking.js     # 규정의 숨김 패턴
│   └── actions/            # 액션 로직 (수정/교정)
│       ├── registry.js     # 액션 설정 레지스트리 (단일 설정 소스)
│       ├── implementations.js  # 순수 액션 함수들
│       └── executor.js     # 액션 실행기 + undo
├── popup/                  # 팝업 UI
├── styles/highlight.css    # 하이라이팅 스타일
├── _locales/               # 다국어 (ko, en)
├── icons/                  # 아이콘
└── test/                   # 테스트 페이지
```

## 작업 규칙

### 1. 코드 스타일

- **언어**: JavaScript ES6+ (빌드 도구 없음)
- **들여쓰기**: 2 spaces
- **명명 규칙**: camelCase (변수/함수), PascalCase (클래스)
- **주석**: 한국어 또는 영어, 일관성 유지

### 2. 패턴 추가 방법

새로운 다크패턴을 추가할 때는 **두 곳**에 등록이 필요합니다:

#### A. 패턴 정의 (scripts/patterns/*.js)

```javascript
{
  id: 'pattern-id',           // 고유 식별자
  category: 'interface',      // 카테고리
  name: { ko: '...', en: '...' },
  description: { ko: '...', en: '...' },
  severity: 'medium',         // low, medium, high
  detectors: [{
    type: 'text',             // text, selector, combined
    patterns: [/정규식/],
    contexts: ['button', 'a']
  }],
  highlight: {
    style: 'badge',           // outline, badge, tooltip
    color: 'medium',
    icon: '💡'
  }
}
```

#### B. 액션 설정 (scripts/actions/registry.js)

```javascript
'pattern-id': {
  available: ['equalize', 'hide'],    // 사용 가능한 액션 목록
  primary: 'equalize',                // 기본 액션
  autoApply: { enabled: false },      // 자동 적용 여부
  readabilityFix: { enabled: true, fontSize: 18 }  // 가독성 수정
}
```

**주의**: 액션 없이 탐지만 하는 패턴도 `actions/registry.js`에 기본 설정 등록 권장

### 3. UI 변경 시 주의사항

- **최소 침습**: 원래 웹사이트 UI를 최대한 방해하지 않음
- **z-index**: 2147483647 사용 (최상위)
- **스타일 격리**: `!important` 적절히 사용하여 충돌 방지

### 4. 테스트

- 변경 후 `test/test-page.html`에서 기능 확인
- Chrome에서 확장 프로그램 새로고침 후 테스트

## 주의사항

### 하지 말 것

- `node_modules` 또는 외부 라이브러리 도입 (Vanilla JS 유지)
- `note/` 폴더의 연구 자료 수정
- 기존 패턴 ID 변경 (하위 호환성)

### 할 것

- 새 패턴 추가 시 `registry.js`에 자동 등록되도록 구현
- 다국어 지원 (ko, en) 유지
- 변경사항 커밋 전 테스트

## 커밋 메시지 형식

```
<type>: <description>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `test`

예시:
- `feat: add countdown timer pattern detection`
- `fix: resolve duplicate detection in nested elements`

## 문의

프로젝트 관련 질문은 다른 AI 에이전트 가이드 문서(AGENTS.md, GEMINI.md)를 참조하세요.
