# Gemini AI Agent Guidelines

이 문서는 Gemini AI가 LightOn 프로젝트에서 작업할 때 따라야 할 규칙입니다.

## Quick Start

```
프로젝트: LightOn (다크패턴 탐지 Chrome Extension)
언어: JavaScript (ES6+, Vanilla)
빌드: 없음 (직접 실행)
테스트: test/test-page.html
```

## 프로젝트 구조 요약

```
lighton/
├── manifest.json        # Chrome Extension 설정
├── scripts/
│   ├── content.js       # 메인 진입점 (페이지에 주입됨)
│   ├── detector.js      # 다크패턴 탐지 로직
│   ├── highlighter.js   # 탐지된 요소 하이라이팅
│   └── patterns/        # 패턴 정의 파일들
├── popup/               # 확장 프로그램 팝업 UI
├── styles/              # CSS 스타일
└── _locales/            # 다국어 지원 (ko, en)
```

## 핵심 개념

### 1. 패턴 정의

모든 다크패턴은 `scripts/patterns/` 아래에 정의됩니다:

```javascript
// scripts/patterns/interface.js 예시
{
  id: 'emotional-manipulation',
  category: 'interface',
  name: { ko: '감정 자극 문구', en: 'Emotional Manipulation' },
  severity: 'medium',  // low | medium | high
  detectors: [{
    type: 'text',      // text | selector | combined
    patterns: [/포기|놓치/i],
    contexts: ['button']
  }]
}
```

### 2. 탐지 흐름

```
페이지 로드
    ↓
content.js 초기화
    ↓
detector.js: DOM 스캔
    ↓
패턴 매칭 (patterns/*.js)
    ↓
highlighter.js: UI 표시
    ↓
popup.js: 결과 표시
```

### 3. 하이라이팅 방식

- **Subtle Dot**: 작은 점으로 탐지된 요소 표시
- **Dashed Outline**: 점선 테두리
- **Hover Tooltip**: 마우스 오버 시 상세 정보

## 작업 가이드

### 새 패턴 추가하기

1. 적절한 카테고리 파일 선택 (`interface.js` 또는 `sneaking.js`)
2. 패턴 객체 추가
3. `_locales/ko/messages.json`, `_locales/en/messages.json`에 번역 추가
4. `test/test-page.html`에 테스트 케이스 추가

### UI 수정 시

- `styles/highlight.css`: 하이라이팅 스타일
- `popup/popup.css`: 팝업 UI 스타일
- **주의**: `!important` 사용하여 웹사이트 스타일과 충돌 방지

### 탐지 로직 수정 시

- `scripts/detector.js`의 `scan()` 함수 확인
- 성능 고려: `maxElementsPerScan` 제한 있음
- 중복 탐지 방지: `deduplicateResults()` 함수 활용

## 자주 하는 실수

### 하지 마세요

```javascript
// ❌ 외부 라이브러리 import
import React from 'react';

// ❌ Node.js API 사용
const fs = require('fs');

// ❌ 빌드가 필요한 문법
const x = await import('./module.js');
```

### 이렇게 하세요

```javascript
// ✅ 전역 객체 사용
window.LightOn = window.LightOn || {};

// ✅ IIFE로 모듈화
(function() {
  'use strict';
  // code here
})();

// ✅ chrome API 사용
chrome.storage.sync.get(['enabled'], callback);
```

## 테스트 방법

```bash
# 1. Chrome 확장 프로그램 페이지 열기
# chrome://extensions

# 2. "개발자 모드" 활성화

# 3. "압축해제된 확장 프로그램을 로드합니다" 클릭

# 4. lighton 폴더 선택

# 5. test/test-page.html 열기
```

## 디버깅

```javascript
// 콘솔에서 확인
console.log('[LightOn]', data);

// 탐지 결과 확인
window.LightOn.Detector.scan(document.body);

// 하이라이트 수동 테스트
window.LightOn.Highlighter.focusElement(element);
```

## 관련 문서

| 문서 | 내용 |
|------|------|
| `AGENTS.md` | 공통 협업 규칙 |
| `CLAUDE.md` | Claude AI 가이드 |
| `test/test-page.html` | 테스트용 다크패턴 예시 |

## 도움이 필요하면

1. 기존 코드 패턴 참고
2. `AGENTS.md`의 협업 규칙 확인
3. `test/test-page.html`에서 동작 확인
