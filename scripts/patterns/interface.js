/**
 * LightOn Interface Interference Patterns
 *
 * 인터페이스 조작 (Interface Interference) 패턴:
 * 사용자 인터페이스를 조작하여 특정 행동을 유도하는 다크패턴
 */

(function () {
  'use strict';

  const { CATEGORIES, SEVERITY, DETECTOR_TYPES, HIGHLIGHT_STYLES } = window.LightOn.PatternRegistry;

  const interfacePatterns = [
    // 1. 감정 자극 문구 (Emotional Manipulation / Confirmshaming)
    {
      id: 'emotional-manipulation',
      category: CATEGORIES.INTERFACE,
      name: {
        ko: '감정 자극 문구',
        en: 'Emotional Manipulation'
      },
      description: {
        ko: '감정적 압박으로 특정 선택을 유도합니다. "포기하시겠어요?", "혜택을 놓치실 거예요" 등의 문구가 사용됩니다.',
        en: 'Uses emotional pressure to guide choices with phrases like "Are you sure you want to miss out?"'
      },
      severity: SEVERITY.MEDIUM,
      detectors: [
        {
          type: DETECTOR_TYPES.TEXT,
          patterns: [
            // Korean patterns
            /포기하시겠|놓치시겠|아쉽지만|후회하실|혜택.*받지|특별.*기회.*잃/i,
            /정말.*떠나|진심으로.*원치|그래도.*나가|할인.*포기/i,
            /안.*받으실|안.*원하시|싫으시|관심.*없으시/i,
            // English patterns
            /no,?\s*(thanks|i('ll)?\s*(pass|skip|don't|rather)|i'm\s*good)/i,
            /miss\s*out|give\s*up|regret|lose.*benefit/i,
            /don't\s*want\s*(to\s*)?(save|discount|deal)/i,
            /i\s*don't\s*like\s*(saving|money|discounts)/i,
            /no,?\s*i\s*(prefer|want)\s*to\s*pay\s*full/i
          ],
          contexts: ['button', 'a', '[role="button"]', '.btn', '[class*="button"]']
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.BADGE,
        color: SEVERITY.MEDIUM,
        icon: '🎭'
      }
    },

    // 2. 사전 선택된 체크박스 (Preselected Checkbox)
    {
      id: 'preselected-checkbox',
      category: CATEGORIES.INTERFACE,
      name: {
        ko: '사전 선택된 체크박스',
        en: 'Preselected Checkbox'
      },
      description: {
        ko: '마케팅 수신, 뉴스레터 구독, 추가 서비스 동의 등의 체크박스가 미리 선택되어 있습니다.',
        en: 'Marketing, newsletter, or additional service checkboxes are pre-checked by default.'
      },
      severity: SEVERITY.HIGH,
      detectors: [
        {
          type: DETECTOR_TYPES.SELECTOR,
          selectors: [
            // :checked captures both HTML [checked] attribute and dynamic state
            'input[type="checkbox"]:checked'
          ],
          nearbyTextPatterns: [
            // Korean
            /마케팅|뉴스레터|동의|수신|프로모션|광고|알림|이벤트|제3자|제휴/i,
            // English
            /newsletter|marketing|subscribe|agree|promotion|advertising|notify|third.?party|partner/i
          ],
          excludePatterns: [
            /remember\s*me|로그인\s*유지|자동\s*로그인|keep\s*me\s*logged/i
          ]
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.OUTLINE,
        color: SEVERITY.HIGH,
        icon: '⚠️'
      }
    },

    // 3. 숨겨진 해지/취소 옵션 (Hidden Cancel Option)
    {
      id: 'hidden-cancel',
      category: CATEGORIES.INTERFACE,
      name: {
        ko: '숨겨진 해지 옵션',
        en: 'Hidden Cancel Option'
      },
      description: {
        ko: '해지, 취소, 탈퇴 링크가 작은 글씨나 눈에 띄지 않는 색상으로 숨겨져 있습니다.',
        en: 'Cancel, unsubscribe, or delete account links are hidden with small text or low contrast.'
      },
      severity: SEVERITY.HIGH,
      detectors: [
        {
          type: DETECTOR_TYPES.TEXT,
          patterns: [
            // Korean
            /해지|탈퇴|구독\s*취소|취소하기|삭제|그만두|나가기/i,
            // English
            /cancel|unsubscribe|delete\s*(my\s*)?(account)?|opt.?out|remove/i
          ],
          contexts: ['a', 'button', 'span', '[role="link"]'],
          visualChecks: {
            checkSmallFont: true,     // font-size < 12px
            checkLowContrast: true,   // contrast ratio < 3:1
            checkMutedColor: true     // gray or faded colors
          }
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.BADGE,
        color: SEVERITY.HIGH,
        icon: '🔍'
      }
    },

    // 4. 비대칭 버튼 (Asymmetric Buttons)
    {
      id: 'asymmetric-buttons',
      category: CATEGORIES.INTERFACE,
      name: {
        ko: '비대칭 버튼',
        en: 'Asymmetric Buttons'
      },
      description: {
        ko: '버튼의 크기, 색상, 위치가 비대칭적으로 설계되어 특정 선택을 유도합니다.',
        en: 'Buttons are designed with unequal size, color, or positioning to favor certain choices.'
      },
      severity: SEVERITY.MEDIUM,
      detectors: [
        {
          type: DETECTOR_TYPES.COMBINED,
          // Look for button pairs where one is prominently styled
          siblingAnalysis: true,
          patterns: [
            {
              // Accept/Continue/Yes type buttons (usually highlighted)
              positivePatterns: [
                /수락|동의|확인|계속|예|진행|구독|가입|시작/i,
                /accept|agree|confirm|continue|yes|proceed|subscribe|join|start/i
              ],
              // Decline/Cancel/No type buttons (usually muted)
              negativePatterns: [
                /거절|취소|아니오|나중에|건너뛰기|닫기/i,
                /decline|cancel|no|later|skip|close|maybe/i
              ]
            }
          ],
          visualChecks: {
            compareSiblingSize: true,
            compareSiblingColor: true,
            checkPrimarySecondaryPattern: true
          }
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.OUTLINE,
        color: SEVERITY.MEDIUM,
        icon: '⚖️'
      }
    },

    // 5. 모호한 버튼 문구 (Ambiguous Button Text)
    {
      id: 'ambiguous-button',
      category: CATEGORIES.INTERFACE,
      name: {
        ko: '모호한 버튼 문구',
        en: 'Ambiguous Button Text'
      },
      description: {
        ko: '"계속", "확인", "취소" 등 중의적인 문구로 사용자를 혼란스럽게 합니다.',
        en: 'Ambiguous text like "Continue", "OK", "Cancel" that can confuse users about the action.'
      },
      severity: SEVERITY.LOW,
      detectors: [
        {
          type: DETECTOR_TYPES.TEXT,
          patterns: [
            // Context-dependent ambiguous words (need modal/dialog context)
            /^(확인|취소|계속|닫기|OK|Cancel|Continue|Close|Done|Submit)$/i
          ],
          contexts: ['button', '[role="button"]', 'input[type="submit"]', 'input[type="button"]'],
          requiresModalContext: true,  // Only flag in modals/dialogs
          contextSelectors: [
            '[role="dialog"]',
            '[role="alertdialog"]',
            '.modal',
            '[class*="modal"]',
            '[class*="popup"]',
            '[class*="dialog"]'
          ]
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.BADGE,
        color: SEVERITY.LOW,
        icon: '❓'
      }
    },

    // 6. 잘못된 계층구조 (Visual Hierarchy Manipulation)
    {
      id: 'visual-hierarchy-manipulation',
      category: CATEGORIES.INTERFACE,
      name: {
        ko: '잘못된 계층구조',
        en: 'Visual Hierarchy Manipulation'
      },
      description: {
        ko: '선택항목의 크기·모양·색깔 등에 현저한 차이를 두어 사업자에게 유리한 특정 항목으로 유도합니다. 요금제, 구독 옵션 등에서 특정 선택을 강조합니다.',
        en: 'Creates significant visual differences in size, shape, and color to guide users toward specific options that favor the business.'
      },
      severity: SEVERITY.HIGH,
      detectors: [
        {
          type: DETECTOR_TYPES.COMBINED,
          // Use sibling comparison for visual hierarchy detection
          visualChecks: {
            compareWithSiblings: true      // Enable sibling-based visual comparison
          },
          contextTextPatterns: [
            /요금제|구독|플랜|옵션|패키지|등급|단계|가격\s*비교/i,
            /plan|subscription|tier|package|option|pricing|compare/i,
            /월|개월|연|year|month/i
          ],
          containerSelectors: [
            '[class*="pricing"]', '[class*="plan"]', '[class*="subscription"]',
            '[class*="option"]', '[class*="tier"]', '[class*="package"]',
            '[class*="card"]'
          ],
          thresholds: {
            prominenceScore: 3             // Minimum score to flag as manipulation
          }
        },
        {
          type: DETECTOR_TYPES.SELECTOR,
          selectors: [
            // Common class names for highlighted options
            '[class*="recommend"]',
            '[class*="featured"]',
            '[class*="highlight"]',
            '[class*="popular"]',
            '[class*="best"]',
            '[class*="premium"]',
            '.recommended',
            '.featured',
            '.highlighted',
            '.popular',
            '.best-value',
            '[data-recommended="true"]',
            '[data-featured="true"]'
          ],
          contextSelectors: [
            // Only flag within pricing/option containers
            '[class*="pricing"]',
            '[class*="plan"]',
            '[class*="subscription"]',
            '[class*="option"]',
            '.pricing-table',
            '.plans',
            '.options'
          ],
          nearbyTextPatterns: [
            // Look for pricing or subscription context
            /요금|요금제|구독|플랜|옵션|월|년|month|year|plan|subscription|pricing/i
          ]
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.BADGE,
        color: SEVERITY.HIGH,
        icon: '🎯'
      }
    }
  ];

  // Register all interface patterns
  window.LightOn.PatternRegistry.registerAll(interfacePatterns);

  console.log('[LightOn] Interface patterns loaded:', interfacePatterns.length);
})();
