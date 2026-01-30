/**
 * LightOn Sneaking Patterns
 *
 * 규정의 숨김 (Sneaking) 패턴:
 * 중요한 정보를 숨기거나 눈에 띄지 않게 배치하는 다크패턴
 */

(function() {
  'use strict';

  const { CATEGORIES, SEVERITY, DETECTOR_TYPES, HIGHLIGHT_STYLES } = window.LightOn.PatternRegistry;

  const sneakingPatterns = [
    // 1. 숨겨진 비용 (Hidden Costs)
    {
      id: 'hidden-cost',
      category: CATEGORIES.SNEAKING,
      name: {
        ko: '숨겨진 비용',
        en: 'Hidden Cost'
      },
      description: {
        ko: '배송비, 수수료, 부가세 등 추가 비용이 명확하게 표시되지 않거나 결제 직전에 나타납니다.',
        en: 'Shipping fees, service charges, taxes, or other costs not clearly displayed until checkout.'
      },
      severity: SEVERITY.HIGH,
      detectors: [
        {
          type: DETECTOR_TYPES.TEXT,
          patterns: [
            // Korean
            /부가세\s*별도|배송비\s*별도|추가\s*요금|수수료\s*별도|세금\s*제외/i,
            /\+\s*(배송|수수료|세금)|결제\s*시\s*추가/i,
            /VAT\s*(별도|제외|미포함)|가격.*세금.*포함.*않/i,
            // English
            /plus\s*(shipping|tax|fee)|excluding\s*(tax|vat|shipping)/i,
            /additional\s*(charge|fee)|not\s*included/i,
            /\+\s*(shipping|handling|tax)/i,
            /price.*before.*tax|pre.?tax\s*price/i
          ],
          contexts: ['*'],  // Check all elements
          nearPriceElement: true  // Especially near prices
        },
        {
          type: DETECTOR_TYPES.SELECTOR,
          selectors: [
            '[class*="fee"]',
            '[class*="charge"]',
            '[class*="extra"]',
            '[class*="additional"]'
          ],
          visualChecks: {
            checkSmallFont: true,
            checkMutedColor: true
          }
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.BADGE,
        color: SEVERITY.HIGH,
        icon: '💰'
      }
    },

    // 2. 작은 글씨 약관 (Small Print Terms)
    {
      id: 'small-print',
      category: CATEGORIES.SNEAKING,
      name: {
        ko: '작은 글씨 약관',
        en: 'Small Print Terms'
      },
      description: {
        ko: '환불 조건, 약관, 제한 사항 등 중요한 정보가 매우 작은 글씨로 표시되어 있습니다.',
        en: 'Important terms, refund policies, or restrictions are displayed in very small text.'
      },
      severity: SEVERITY.MEDIUM,
      detectors: [
        {
          type: DETECTOR_TYPES.COMBINED,
          textPatterns: [
            // Korean
            /환불\s*불가|취소\s*수수료|위약금|자동\s*갱신|약관|이용\s*조건/i,
            /철회\s*불가|반품\s*불가|제한\s*사항|조건.*적용/i,
            // English
            /non.?refundable|cancellation\s*fee|penalty|auto.?renew/i,
            /terms\s*(and|&)\s*conditions|subject\s*to|restrictions?\s*apply/i,
            /final\s*sale|no\s*returns?|limited\s*time/i
          ],
          visualChecks: {
            maxFontSize: 11,  // Font size <= 11px
            checkLowContrast: true
          }
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.OUTLINE,
        color: SEVERITY.MEDIUM,
        icon: '🔎'
      }
    },

    // 3. 자동 추가 장바구니 (Sneak into Basket)
    {
      id: 'auto-add-cart',
      category: CATEGORIES.SNEAKING,
      name: {
        ko: '자동 추가 옵션',
        en: 'Auto-Added Items'
      },
      description: {
        ko: '장바구니에 보험, 보증, 추가 서비스 등이 자동으로 추가되어 있습니다.',
        en: 'Insurance, warranty, or additional services are automatically added to cart.'
      },
      severity: SEVERITY.HIGH,
      detectors: [
        {
          type: DETECTOR_TYPES.SELECTOR,
          selectors: [
            // Pre-selected add-ons in cart context
            'input[type="checkbox"][checked]',
            'input[type="checkbox"]:checked'
          ],
          contextSelectors: [
            '[class*="cart"]',
            '[class*="basket"]',
            '[class*="checkout"]',
            '[id*="cart"]',
            '[id*="basket"]',
            '[id*="checkout"]'
          ],
          nearbyTextPatterns: [
            // Korean
            /보험|보증|연장|보호|추가\s*서비스|옵션|프리미엄/i,
            /안심|케어|플러스|프로텍션/i,
            // English
            /insurance|warranty|protection|extended|premium|add.?on/i,
            /care\s*plan|service\s*plan|coverage/i
          ]
        },
        {
          type: DETECTOR_TYPES.TEXT,
          patterns: [
            /기본\s*포함|자동\s*추가|추천\s*상품|함께\s*구매/i,
            /included|added|recommended|bundle/i
          ],
          contexts: ['[class*="cart"]', '[class*="checkout"]', '[class*="basket"]']
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.BADGE,
        color: SEVERITY.HIGH,
        icon: '🛒'
      }
    },

    // 4. 무료체험 자동전환 (Free Trial Trap / Forced Continuity)
    {
      id: 'free-trial-trap',
      category: CATEGORIES.SNEAKING,
      name: {
        ko: '무료체험 자동전환',
        en: 'Free Trial Trap'
      },
      description: {
        ko: '무료체험 종료 후 자동으로 유료 구독으로 전환됩니다. 취소 방법이 명확하지 않을 수 있습니다.',
        en: 'Free trial automatically converts to paid subscription. Cancellation process may be unclear.'
      },
      severity: SEVERITY.HIGH,
      detectors: [
        {
          type: DETECTOR_TYPES.TEXT,
          patterns: [
            // Korean
            /무료\s*(체험|평가판|트라이얼).*자동/i,
            /자동\s*(갱신|결제|청구|연장|전환)/i,
            /체험\s*후.*유료|무료.*기간.*후.*청구/i,
            /언제든\s*취소|취소하지\s*않으면/i,
            // English
            /free\s*trial.*auto/i,
            /auto.?(renew|charge|bill|convert)/i,
            /after.*trial.*charged|will\s*be\s*charged/i,
            /cancel\s*anytime|unless\s*(you\s*)?cancel/i
          ],
          contexts: ['*']
        },
        {
          type: DETECTOR_TYPES.SELECTOR,
          selectors: [
            '[class*="trial"]',
            '[class*="subscription"]',
            '[class*="billing"]'
          ],
          nearbyTextPatterns: [
            /\$|₩|원|달러|결제|charge|billed?/i
          ]
        }
      ],
      highlight: {
        style: HIGHLIGHT_STYLES.BADGE,
        color: SEVERITY.HIGH,
        icon: '⏰'
      }
    }
  ];

  // Register all sneaking patterns
  window.LightOn.PatternRegistry.registerAll(sneakingPatterns);

  console.log('[LightOn] Sneaking patterns loaded:', sneakingPatterns.length);
})();
