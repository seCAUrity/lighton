# LightOn - Dark Pattern Detector

<p align="center">
  <img src="https://raw.githubusercontent.com/seCAUrity/lighton/main/lighton.png" alt="LightOn Banner" width="100%">
</p>

<p align="center">
  <strong>디지털 소외계층을 위해 다크패턴을 밝혀주는 서비스</strong><br>
  <em>Illuminating dark patterns for digitally vulnerable users</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/manifest-v3-green" alt="Manifest V3">
</p>

---

## Why LightOn?

작은 글씨, 복잡한 UI, 화려한 가격 효과, 당장 구매하지 않으면 손해를 보게 만드는 후킹 멘트들...

이러한 구조를 **다크패턴**이라고 합니다.

> **다크패턴이란?**
>
> 이용자의 선택을 왜곡하거나 중요한 정보를 숨기는 등 **이용자를 기만할 목적으로 설계된 UI 또는 UX**를 의미합니다.
>
> — 공정거래위원회

다크패턴은 **기술적 취약점이 아닌 인간의 인지적 취약점**을 악용하는 공격입니다. GDPR이나 개인정보보호법이 요구하는 명시적 동의 원칙을 우회하는 심각한 보안 위협이기도 합니다.

### 디지털 소외계층의 문제

고령층의 디지털 이용률은 점점 늘어나고 있지만, **시각 저하**, **인지 처리 속도의 저하**, **디지털 경험 부족**이라는 고질적인 문제는 다크패턴에 특히 취약할 수밖에 없습니다.

그러나 국내에는 이러한 사용자들이 이용할 수 있는 다크패턴 탐지 서비스가 없었습니다.

---

## What is LightOn?

**LightOn**은 웹 서비스의 다크패턴을 **탐지**하여 사용자에게 **경고**하고, UI 재구성을 통해 다크패턴을 **완화**하는 Chrome Extension입니다.

### 심플하면서도 효과적

LightOn의 작업은 단순합니다:

1. **탐지** - 다크패턴을 자동으로 찾아냅니다
2. **수정** - 사전 선택된 체크박스 해제 등 UI를 교정합니다
3. **설명** - 어떤 다크패턴인지 쉽게 알려줍니다

---

## Features

- **실시간 탐지** - 페이지 로드 시 자동으로 다크패턴 검사
- **시각적 하이라이팅** - 탐지된 패턴을 눈에 띄는 인디케이터로 표시
- **자동 교정** - 사전 선택된 체크박스 자동 해제 등
- **다국어 지원** - 한국어, 영어 지원
- **프라이버시 보호** - 모든 분석이 로컬에서 수행됨

---

## Detected Patterns

### Interface Interference (인터페이스 조작)

| Pattern | Description |
|---------|-------------|
| 🎭 **감정 자극 문구** | "포기하시겠어요?" 등 감정적 압박으로 특정 선택 유도 |
| ⚠️ **사전 선택된 체크박스** | 마케팅 수신 동의 등이 미리 체크되어 있음 |
| 🔍 **숨겨진 해지 옵션** | 해지/취소 링크가 작은 글씨나 낮은 대비로 숨겨져 있음 |
| 🎯 **불필요한 강조** | 버튼 크기/색상 차이로 특정 선택을 과도하게 강조 |
| ❓ **모호한 버튼 문구** | "확인", "취소" 등 중의적 문구로 혼란 유발 |

### Sneaking (규정의 숨김)

| Pattern | Description |
|---------|-------------|
| 💰 **숨겨진 비용** | 배송비, 수수료 등이 결제 직전에 나타남 |
| 🔎 **작은 글씨 약관** | 환불 조건, 제한 사항이 매우 작은 글씨로 표시 |
| 🛒 **자동 추가 옵션** | 보험, 보증 등이 장바구니에 자동 추가 |
| ⏰ **무료체험 자동전환** | 무료체험 후 자동으로 유료 구독 전환 |

---

## Installation

### Chrome Web Store (Coming Soon)

### Manual Installation (개발자 모드)

1. 이 저장소를 클론합니다:
   ```bash
   git clone https://github.com/seCAUrity/lighton.git
   ```

2. Chrome에서 `chrome://extensions` 접속

3. 우측 상단의 **개발자 모드** 활성화

4. **압축해제된 확장 프로그램을 로드합니다** 클릭

5. `lighton` 폴더 선택

---

## Usage

1. 확장 프로그램 설치 후 자동으로 활성화됩니다.

2. 웹사이트 방문 시 다크패턴이 감지되면:
   - 해당 요소 옆에 **컬러 인디케이터(dot)** 가 표시됩니다
   - 우측 상단에 **탐지 개수**가 표시됩니다

3. **인디케이터 클릭** 시:
   - 패턴 이름과 설명이 포함된 툴팁이 나타납니다
   - 원래 상태(수정 전)를 미리볼 수 있습니다

4. **팝업 UI**에서:
   - 전체 탐지 결과 확인
   - 개별 패턴 클릭 시 해당 요소로 이동
   - 확장 프로그램 활성화/비활성화

---

## Tech Stack

- **Vanilla JavaScript** (ES6+) - 외부 의존성 없음
- **Chrome Extension Manifest V3**
- **CSS3** with CSS Variables

---

<p align="center">
  Made with 💡 by <a href="https://github.com/seCAUrity">seCAUrity</a>
</p>
