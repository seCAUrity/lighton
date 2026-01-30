# LightOn - Dark Pattern Detector

<p align="center">
  <img src="https://raw.githubusercontent.com/seCAUrity/lighton/main/lighton.png" alt="LightOn Banner" width="100%">
</p>

<p align="center">
  <strong>웹사이트의 다크패턴을 탐지하고 하이라이팅하여 사용자를 보호합니다.</strong><br>
  <em>Detects and highlights dark patterns on websites to protect users.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/manifest-v3-green" alt="Manifest V3">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="License">
</p>

---

## What is a Dark Pattern?

**다크패턴(Dark Pattern)** 은 사용자를 속이거나 의도치 않은 행동을 유도하는 UI/UX 디자인 패턴입니다. LightOn은 이러한 패턴을 자동으로 탐지하여 사용자에게 알려줍니다.

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

## Project Structure

```
lighton/
├── manifest.json           # Extension 설정 (Manifest V3)
├── scripts/
│   ├── background.js       # Service Worker
│   ├── content.js          # Content Script (진입점)
│   ├── detector.js         # 패턴 탐지 엔진
│   ├── highlighter.js      # 하이라이팅 렌더러
│   ├── patterns/           # 패턴 정의 (탐지 규칙)
│   │   ├── registry.js     # 패턴 레지스트리
│   │   ├── interface.js    # 인터페이스 조작 패턴
│   │   └── sneaking.js     # 규정의 숨김 패턴
│   └── actions/            # 액션 로직 (수정/교정)
│       ├── registry.js     # 액션 설정 레지스트리
│       ├── implementations.js  # 순수 액션 함수
│       └── executor.js     # 액션 실행기 + undo
├── popup/                  # 팝업 UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── styles/
│   └── highlight.css       # 하이라이팅 스타일
├── _locales/               # 다국어 지원
│   ├── ko/messages.json
│   └── en/messages.json
├── icons/                  # 확장 프로그램 아이콘
└── test/                   # 테스트 페이지
```

---

## Tech Stack

- **Vanilla JavaScript** (ES6+) - 외부 의존성 없음
- **Chrome Extension Manifest V3**
- **CSS3** with CSS Variables

---

## Contributing

기여를 환영합니다! 새로운 다크패턴 추가, 버그 수정, 기능 개선 등 모든 기여가 도움이 됩니다.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Adding New Patterns

새로운 다크패턴을 추가하려면 두 파일을 수정해야 합니다:

1. **패턴 정의** (`scripts/patterns/*.js`)
2. **액션 설정** (`scripts/actions/registry.js`)

자세한 내용은 [CLAUDE.md](CLAUDE.md)를 참조하세요.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- 다크패턴 분류 체계: [Dark Patterns Tip Line](https://darkpatternstipline.org/)
- 영감: [Deceptive Design](https://www.deceptive.design/)

---

<p align="center">
  Made with 💡 by <a href="https://github.com/seCAUrity">seCAUrity</a>
</p>
