/**
 * LightOn Pattern Detector Engine
 *
 * Core detection engine that scans DOM elements for dark patterns
 * using the registered pattern definitions.
 */

window.LightOn = window.LightOn || {};

window.LightOn.Detector = (function () {
  'use strict';

  const registry = window.LightOn.PatternRegistry;

  // Detection results cache
  const detectionCache = new Map();

  // Elements already processed
  const processedElements = new WeakSet();

  /**
   * Configuration options
   */
  const config = {
    minFontSizeThreshold: 11,       // px - for small print detection
    minContrastRatio: 3,            // WCAG AA for small text
    debounceDelay: 250,             // ms - for mutation observer
    maxElementsPerScan: 1000,       // Limit for performance
    excludeSelectors: [
      'script', 'style', 'noscript', 'template',
      '[data-lighton-ignore]'
    ]
  };

  /**
   * Get computed styles for an element
   */
  function getComputedStyles(element) {
    try {
      return window.getComputedStyle(element);
    } catch (e) {
      return null;
    }
  }

  /**
   * Get the visible text content of an element
   */
  function getVisibleText(element) {
    if (!element) return '';

    // For input elements, check value and labels
    if (element.tagName === 'INPUT') {
      return element.value || element.placeholder || '';
    }

    // Get text content, excluding hidden children
    let text = '';
    const walk = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const style = getComputedStyles(parent);
          if (style && (style.display === 'none' || style.visibility === 'hidden')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walk.nextNode())) {
      text += node.textContent + ' ';
    }

    return text.trim();
  }

  /**
   * Check if text matches any pattern in an array
   */
  function matchesPatterns(text, patterns) {
    if (!text || !patterns) return false;

    for (const pattern of patterns) {
      if (pattern instanceof RegExp) {
        if (pattern.test(text)) return true;
      } else if (typeof pattern === 'string') {
        if (text.toLowerCase().includes(pattern.toLowerCase())) return true;
      }
    }
    return false;
  }

  /**
   * Check if element matches any of the context selectors
   */
  function matchesContext(element, contexts) {
    if (!contexts || contexts.length === 0 || contexts.includes('*')) {
      return true;
    }

    for (const selector of contexts) {
      try {
        if (element.matches(selector)) return true;
      } catch (e) {
        // Invalid selector, skip
      }
    }
    return false;
  }

  /**
   * Check if element is near a price-related context
   */
  const priceContextSelectors = [
    '[class*="price"]', '[class*="cost"]', '[class*="amount"]', '[class*="total"]',
    '[class*="checkout"]', '[class*="cart"]', '[class*="order"]',
    '[class*="payment"]', '[class*="billing"]', '[class*="shipping"]',
    '[id*="price"]', '[id*="cost"]', '[id*="amount"]', '[id*="total"]',
    '[id*="checkout"]', '[id*="cart"]', '[id*="order"]'
  ];

  const priceTextPattern = /(?:[$€£¥₩]|(?:\b(?:usd|eur|gbp|jpy|krw|price|total|amount|cost|fee|charge|shipping|tax)\b)|(?:\d[\d,\.]*\s*(?:원|달러|엔|유로|파운드|위안))|(?:가격|요금|금액|합계|총액|결제|구매|배송비|세금))/i;

  function isPriceText(text) {
    return !!text && priceTextPattern.test(text);
  }

  function hasPriceContext(element) {
    if (!element) return false;

    // Structural hints via closest selectors
    for (const selector of priceContextSelectors) {
      try {
        if (element.closest(selector)) return true;
      } catch (e) {
        // Invalid selector, skip
      }
    }

    // Text-based hints in nearby elements
    const candidates = new Set();
    const addCandidate = (el) => {
      if (el && el.nodeType === 1) candidates.add(el);
    };

    addCandidate(element);
    addCandidate(element.parentElement);
    addCandidate(element.parentElement?.parentElement);

    const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
    for (const sibling of siblings) addCandidate(sibling);

    for (const candidate of candidates) {
      const text = getVisibleText(candidate);
      if (isPriceText(text)) return true;
    }

    return false;
  }

  /**
   * Check if element is within a modal/dialog context
   */
  function isInModalContext(element, contextSelectors) {
    if (!contextSelectors) return true;

    let parent = element;
    while (parent && parent !== document.body) {
      for (const selector of contextSelectors) {
        try {
          if (parent.matches(selector)) return true;
        } catch (e) {
          // Invalid selector, skip
        }
      }
      parent = parent.parentElement;
    }
    return false;
  }

  /**
   * Check visual properties of an element
   */
  function checkVisualProperties(element, visualChecks) {
    if (!visualChecks) return { passed: true };

    const style = getComputedStyles(element);
    if (!style) return { passed: true };

    const results = { passed: true, details: {} };

    // Check font size
    if (visualChecks.checkSmallFont || visualChecks.maxFontSize) {
      const fontSize = parseFloat(style.fontSize);
      const threshold = visualChecks.maxFontSize || config.minFontSizeThreshold;

      if (fontSize <= threshold) {
        results.details.smallFont = true;
        results.passed = visualChecks.checkSmallFont ? true : results.passed;
      }
    }

    // Check for muted/low contrast colors
    if (visualChecks.checkMutedColor || visualChecks.checkLowContrast) {
      const color = style.color;
      // Simple check for gray-ish colors
      const rgb = color.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const [r, g, b] = rgb.map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        // Check if color is grayish (low saturation) and mid-brightness
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;

        if (saturation < 0.2 && brightness > 100 && brightness < 180) {
          results.details.mutedColor = true;
          results.passed = visualChecks.checkMutedColor ? true : results.passed;
        }
      }
    }

    // Check for prominent styling (bright colors, borders, shadows)
    if (visualChecks.checkProminentStyling) {
      const bgColor = style.backgroundColor;
      const borderWidth = parseFloat(style.borderWidth) || 0;
      const boxShadow = style.boxShadow;
      const transform = style.transform;

      let isProminent = false;

      // Check for vivid background color (high saturation)
      const bgRgb = bgColor.match(/\d+/g);
      if (bgRgb && bgRgb.length >= 3) {
        const [r, g, b] = bgRgb.map(Number);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;

        if (saturation > 0.4) {  // Vivid color
          isProminent = true;
        }
      }

      // Check for prominent border
      if (borderWidth > 2) {
        isProminent = true;
      }

      // Check for box shadow
      if (boxShadow && boxShadow !== 'none') {
        isProminent = true;
      }

      // Check for transform (scale, etc.)
      if (transform && transform !== 'none' && transform.includes('scale')) {
        isProminent = true;
      }

      if (isProminent) {
        results.details.prominentStyling = true;
        results.passed = true;
      }
    }

    // Check if element is larger than siblings
    if (visualChecks.checkLargerSize) {
      const parent = element.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(el =>
          el !== element && el.nodeType === 1 && !el.matches('script, style')
        );

        if (siblings.length > 0) {
          const elementArea = element.offsetWidth * element.offsetHeight;
          const avgSiblingArea = siblings.reduce((sum, sib) =>
            sum + (sib.offsetWidth * sib.offsetHeight), 0
          ) / siblings.length;

          // Element is significantly larger (>30% bigger)
          if (elementArea > avgSiblingArea * 1.3) {
            results.details.largerSize = true;
            results.passed = true;
          }
        }
      }
    }

    // Check if element is centered among siblings (visual prominence)
    if (visualChecks.checkCenterPosition) {
      const parent = element.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(el =>
          el.nodeType === 1 && !el.matches('script, style')
        );

        if (siblings.length >= 3) {
          const index = siblings.indexOf(element);
          const middleIndex = Math.floor(siblings.length / 2);

          // Element is in the center position
          if (index === middleIndex) {
            results.details.centerPosition = true;
            results.passed = true;
          }
        }
      }
    }

    // Check for badge/ribbon elements (common in highlighted options)
    if (visualChecks.checkBadge) {
      // Check if element contains badge/ribbon child elements
      const badgeSelectors = [
        '.badge', '.ribbon', '.tag', '.label',
        '[class*="badge"]', '[class*="ribbon"]', '[class*="tag"]',
        '[class*="recommend"]', '[class*="featured"]'
      ];

      for (const selector of badgeSelectors) {
        if (element.querySelector(selector)) {
          results.details.hasBadge = true;
          results.passed = true;
          break;
        }
      }

      // Check if element itself has badge-like styling
      const position = style.position;
      const zIndex = parseInt(style.zIndex) || 0;

      if ((position === 'absolute' || position === 'relative') && zIndex > 0) {
        const parent = element.parentElement;
        if (parent && parent.style.position === 'relative') {
          results.details.hasBadge = true;
          results.passed = true;
        }
      }
    }

    return results;
  }

  /**
   * Check for nearby text matching patterns
   */
  function hasNearbyText(element, patterns) {
    if (!patterns || patterns.length === 0) return true;

    // Check parent element text
    const parent = element.parentElement;
    if (parent) {
      const parentText = getVisibleText(parent);
      if (matchesPatterns(parentText, patterns)) return true;
    }

    // Check sibling elements
    const siblings = element.parentElement?.children || [];
    for (const sibling of siblings) {
      if (sibling !== element) {
        const siblingText = getVisibleText(sibling);
        if (matchesPatterns(siblingText, patterns)) return true;
      }
    }

    // Check for associated label (for inputs)
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        const labelText = getVisibleText(label);
        if (matchesPatterns(labelText, patterns)) return true;
      }
    }

    return false;
  }

  /**
   * Check if element should be excluded
   */
  function shouldExclude(element, excludePatterns) {
    if (!excludePatterns) return false;

    const text = getVisibleText(element);
    return matchesPatterns(text, excludePatterns);
  }

  /**
   * Process a TEXT type detector
   */
  function processTextDetector(detector, elements) {
    const matches = [];

    for (const element of elements) {
      // Check context
      if (!matchesContext(element, detector.contexts)) continue;

      // Check price context if required
      if (detector.nearPriceElement && !hasPriceContext(element)) continue;

      // Check modal context if required
      if (detector.requiresModalContext && !isInModalContext(element, detector.contextSelectors)) {
        continue;
      }

      // Get element text
      const text = getVisibleText(element);
      if (!text) continue;

      // Check if text matches patterns
      if (matchesPatterns(text, detector.patterns)) {
        // Check visual properties if specified
        const visualResult = checkVisualProperties(element, detector.visualChecks);

        matches.push({
          element,
          text,
          visualDetails: visualResult.details
        });
      }
    }

    return matches;
  }

  /**
   * Process a SELECTOR type detector
   */
  function processSelectorDetector(detector, rootElement) {
    const matches = [];

    for (const selector of detector.selectors) {
      try {
        const elements = rootElement.querySelectorAll(selector);

        for (const element of elements) {
          // Check context selectors
          if (detector.contextSelectors && !isInModalContext(element, detector.contextSelectors)) {
            continue;
          }

          // Check price context if required
          if (detector.nearPriceElement && !hasPriceContext(element)) {
            continue;
          }

          // Check nearby text
          if (detector.nearbyTextPatterns && !hasNearbyText(element, detector.nearbyTextPatterns)) {
            continue;
          }

          // Check exclude patterns
          if (shouldExclude(element, detector.excludePatterns)) {
            continue;
          }

          // Check visual properties
          const visualResult = checkVisualProperties(element, detector.visualChecks);

          matches.push({
            element,
            selector,
            visualDetails: visualResult.details
          });
        }
      } catch (e) {
        console.warn('[LightOn] Invalid selector:', selector, e);
      }
    }

    return matches;
  }

  /**
   * Calculate visual prominence score of an element compared to its siblings
   * Used to detect visual hierarchy manipulation (잘못된 계층구조)
   */
  function calculateVisualProminence(element, siblings) {
    const style = getComputedStyles(element);
    if (!style) return { score: 0, details: {} };

    const details = {};
    let score = 0;

    // 1. Size comparison (면적 비교)
    const elementArea = element.offsetWidth * element.offsetHeight;
    const siblingAreas = siblings.map(sib => sib.offsetWidth * sib.offsetHeight);
    const avgSiblingArea = siblingAreas.length > 0
      ? siblingAreas.reduce((a, b) => a + b, 0) / siblingAreas.length
      : elementArea;

    const sizeRatio = avgSiblingArea > 0 ? elementArea / avgSiblingArea : 1;
    if (sizeRatio > 1.15) {  // 15% larger
      score += 1;
      details.largerSize = true;
      details.sizeRatio = sizeRatio.toFixed(2);
    }

    // 2. Box shadow check (그림자 효과)
    const boxShadow = style.boxShadow;
    if (boxShadow && boxShadow !== 'none') {
      score += 1;
      details.hasBoxShadow = true;
    }

    // 3. Transform scale check (확대 효과)
    const transform = style.transform;
    if (transform && transform !== 'none' && transform.includes('scale')) {
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      if (scaleMatch) {
        const scaleValue = parseFloat(scaleMatch[1]);
        if (scaleValue > 1) {
          score += 1;
          details.hasScale = true;
          details.scaleValue = scaleValue;
        }
      }
    }

    // 4. Background color saturation comparison (배경색 채도)
    const bgColor = style.backgroundColor;
    const bgRgb = bgColor.match(/\d+/g);
    if (bgRgb && bgRgb.length >= 3) {
      const [r, g, b] = bgRgb.map(Number);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      // Compare with siblings
      let avgSibSaturation = 0;
      let sibCount = 0;
      for (const sib of siblings) {
        const sibStyle = getComputedStyles(sib);
        if (sibStyle) {
          const sibBgColor = sibStyle.backgroundColor;
          const sibRgb = sibBgColor.match(/\d+/g);
          if (sibRgb && sibRgb.length >= 3) {
            const [sr, sg, sb] = sibRgb.map(Number);
            const smax = Math.max(sr, sg, sb);
            const smin = Math.min(sr, sg, sb);
            const sibSat = smax === 0 ? 0 : (smax - smin) / smax;
            avgSibSaturation += sibSat;
            sibCount++;
          }
        }
      }
      avgSibSaturation = sibCount > 0 ? avgSibSaturation / sibCount : 0;

      if (saturation > avgSibSaturation + 0.2) {  // Noticeably more saturated
        score += 1;
        details.higherSaturation = true;
      }
    }

    // 5. Border emphasis (테두리 강조)
    const borderWidth = parseFloat(style.borderWidth) || 0;
    const siblingBorderWidths = siblings.map(sib => {
      const sibStyle = getComputedStyles(sib);
      return sibStyle ? parseFloat(sibStyle.borderWidth) || 0 : 0;
    });
    const avgSibBorder = siblingBorderWidths.length > 0
      ? siblingBorderWidths.reduce((a, b) => a + b, 0) / siblingBorderWidths.length
      : 0;

    if (borderWidth > avgSibBorder + 1) {  // Thicker border
      score += 1;
      details.thickerBorder = true;
    }

    // 6. Badge/Ribbon detection (뱃지/리본)
    const badgePatterns = [
      /추천|BEST|베스트|인기|권장|특가|프리미엄|PREMIUM/i,
      /recommended|best|popular|featured|top.?pick|most.?popular/i,
      /save\s*\d+%|best\s*(value|deal)|limited/i
    ];

    const elementText = getVisibleText(element);
    for (const pattern of badgePatterns) {
      if (pattern.test(elementText)) {
        score += 2;  // Badges are strong indicators
        details.hasBadge = true;
        break;
      }
    }

    // 7. Check for badge/ribbon child elements
    const badgeSelectors = [
      '.badge', '.ribbon', '.tag', '.label',
      '[class*="badge"]', '[class*="ribbon"]', '[class*="recommend"]',
      '[class*="featured"]', '[class*="popular"]', '[class*="best"]'
    ];
    for (const selector of badgeSelectors) {
      try {
        if (element.querySelector(selector)) {
          if (!details.hasBadge) {
            score += 2;
            details.hasBadge = true;
          }
          break;
        }
      } catch (e) {
        // Skip invalid selectors
      }
    }

    // 8. Z-index check (시각적 레이어)
    const zIndex = parseInt(style.zIndex) || 0;
    if (zIndex > 0) {
      score += 1;
      details.elevatedZIndex = true;
    }

    return { score, details };
  }

  /**
   * Process visual hierarchy manipulation detector
   * Finds elements that are visually emphasized compared to their siblings
   */
  function processVisualHierarchyDetector(detector, rootElement) {
    const matches = [];

    // Find container elements (pricing tables, plan selectors, etc.)
    const containerSelectors = detector.containerSelectors || [
      '[class*="pricing"]', '[class*="plan"]', '[class*="subscription"]',
      '[class*="option"]', '[class*="tier"]', '[class*="package"]',
      '[class*="card-group"]', '[class*="cards"]'
    ];

    const containers = new Set();
    for (const selector of containerSelectors) {
      try {
        rootElement.querySelectorAll(selector).forEach(el => containers.add(el));
      } catch (e) {
        // Skip invalid selectors
      }
    }

    // Also look for flex/grid containers with multiple similar children
    const flexGridContainers = rootElement.querySelectorAll('[style*="flex"], [style*="grid"]');
    flexGridContainers.forEach(container => {
      const children = Array.from(container.children).filter(c =>
        c.nodeType === 1 && !c.matches('script, style, br')
      );
      if (children.length >= 2) {
        containers.add(container);
      }
    });

    // Check display: flex or grid from computed styles
    const allDivs = rootElement.querySelectorAll('div, section, article');
    for (const div of allDivs) {
      const style = getComputedStyles(div);
      if (style && (style.display === 'flex' || style.display === 'grid')) {
        const children = Array.from(div.children).filter(c =>
          c.nodeType === 1 && !c.matches('script, style, br')
        );
        if (children.length >= 2) {
          containers.add(div);
        }
      }
    }

    // Analyze each container
    for (const container of containers) {
      const children = Array.from(container.children).filter(c =>
        c.nodeType === 1 && !c.matches('script, style, br, span, a')
      );

      if (children.length < 2) continue;  // Need at least 2 items to compare

      // Check if this looks like a pricing/option container
      const containerText = getVisibleText(container);
      if (detector.contextTextPatterns && !matchesPatterns(containerText, detector.contextTextPatterns)) {
        continue;
      }

      const isPricingContext = /₩|원|\$|usd|월|year|month|요금|가격|price|plan|subscription|옵션|option/i.test(containerText);

      if (!isPricingContext && !detector.skipContextCheck) continue;

      // Calculate prominence for each child
      const prominenceScores = [];
      for (const child of children) {
        const siblings = children.filter(c => c !== child);
        const result = calculateVisualProminence(child, siblings);
        prominenceScores.push({ element: child, ...result });
      }

      // Find the most prominent element(s)
      const threshold = detector.thresholds?.prominenceScore || 3;

      for (const item of prominenceScores) {
        if (item.score >= threshold) {
          console.log('[LightOn] Visual hierarchy manipulation detected:', {
            element: item.element,
            score: item.score,
            details: item.details
          });

          matches.push({
            element: item.element,
            text: getVisibleText(item.element),
            visualDetails: item.details,
            prominenceScore: item.score
          });
        }
      }
    }

    return matches;
  }

  /**
   * Process asymmetric buttons detector
   * Finds button pairs in modals/dialogs where one is visually emphasized over another
   * 비대칭 버튼 다크패턴 탐지
   */
  function processAsymmetricButtonsDetector(detector, rootElement) {
    const matches = [];

    // Find containers that might have asymmetric buttons
    const modalSelectors = [
      // Modals and dialogs
      '[role="dialog"]', '[role="alertdialog"]',
      '.modal', '[class*="modal"]', '[class*="popup"]', '[class*="dialog"]',
      '[class*="overlay"]', '[class*="toast"]', '[class*="notification"]',
      // Subscription/pricing/billing sections
      '[class*="subscription"]', '[class*="premium"]', '[class*="pricing"]',
      '[class*="billing"]', '[class*="payment"]', '[class*="plan"]',
      '[class*="upgrade"]', '[class*="cancel"]',
      // Cards and action areas
      '[class*="card"]', '[class*="action"]', '[class*="cta"]',
      // Forms
      'form'
    ];

    const modals = new Set();
    for (const selector of modalSelectors) {
      try {
        rootElement.querySelectorAll(selector).forEach(el => modals.add(el));
      } catch (e) {
        // Skip invalid selectors
      }
    }

    // Also check for fixed/absolute positioned containers (often used for popups)
    const allDivs = rootElement.querySelectorAll('div, section, aside');
    for (const div of allDivs) {
      const style = getComputedStyles(div);
      if (style && (style.position === 'fixed' || style.position === 'absolute')) {
        // Check if it has button-like children
        const buttons = div.querySelectorAll('button, a, [role="button"]');
        if (buttons.length >= 2) {
          modals.add(div);
        }
      }
    }

    // Analyze each modal for asymmetric buttons
    for (const modal of modals) {
      // Find all clickable elements
      const clickables = modal.querySelectorAll(
        'button, [role="button"], a, input[type="submit"], input[type="button"]'
      );

      // Filter to visible interactive elements
      const buttons = Array.from(clickables).filter(el => {
        const style = getComputedStyles(el);
        if (!style) return false;
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
        const hasText = el.textContent?.trim().length > 0;
        return isVisible && hasText;
      });

      if (buttons.length < 2) continue;

      // Calculate visual metrics for each button
      const buttonMetrics = buttons.map(btn => {
        const style = getComputedStyles(btn);
        const rect = btn.getBoundingClientRect();

        // Parse background color
        const bgColor = style.backgroundColor;
        const bgRgb = bgColor.match(/\d+/g);
        let bgBrightness = 255;
        let bgSaturation = 0;
        if (bgRgb && bgRgb.length >= 3) {
          const [r, g, b] = bgRgb.map(Number);
          bgBrightness = (r * 299 + g * 587 + b * 114) / 1000;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          bgSaturation = max === 0 ? 0 : (max - min) / max;
        }

        return {
          element: btn,
          text: btn.textContent?.trim(),
          area: rect.width * rect.height,
          width: rect.width,
          height: rect.height,
          fontSize: parseFloat(style.fontSize),
          fontWeight: parseInt(style.fontWeight) || 400,
          bgBrightness,
          bgSaturation,
          hasBackground: bgSaturation > 0.1 || bgBrightness < 240,
          padding: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
        };
      });

      // Calculate asymmetry score
      const areas = buttonMetrics.map(b => b.area);
      const maxArea = Math.max(...areas);
      const minArea = Math.min(...areas);
      const areaRatio = minArea > 0 ? maxArea / minArea : 10;

      const fontSizes = buttonMetrics.map(b => b.fontSize);
      const maxFontSize = Math.max(...fontSizes);
      const minFontSize = Math.min(...fontSizes);
      const fontRatio = minFontSize > 0 ? maxFontSize / minFontSize : 2;

      // Check for background vs no background pattern
      const withBg = buttonMetrics.filter(b => b.hasBackground);
      const withoutBg = buttonMetrics.filter(b => !b.hasBackground);
      const hasBgAsymmetry = withBg.length > 0 && withoutBg.length > 0;

      // Determine if there's significant asymmetry
      // Thresholds: area ratio > 2, font ratio > 1.3, or bg asymmetry
      const isAsymmetric = areaRatio > 1.5 || fontRatio > 1.2 || hasBgAsymmetry;

      if (isAsymmetric) {
        // Find the most prominent button (larger, colored)
        const prominentButton = buttonMetrics.reduce((a, b) => {
          const aScore = a.area + (a.hasBackground ? 1000 : 0) + a.fontSize * 10;
          const bScore = b.area + (b.hasBackground ? 1000 : 0) + b.fontSize * 10;
          return aScore > bScore ? a : b;
        });

        console.log('[LightOn] Asymmetric buttons detected:', {
          modal: modal,
          buttons: buttonMetrics.map(b => ({ text: b.text, area: b.area, hasBackground: b.hasBackground })),
          areaRatio: areaRatio.toFixed(2),
          fontRatio: fontRatio.toFixed(2),
          hasBgAsymmetry
        });

        // Report the modal as the detected element (so equalization affects all buttons)
        matches.push({
          element: modal,
          text: buttonMetrics.map(b => b.text).join(' / '),
          visualDetails: {
            areaRatio: areaRatio.toFixed(2),
            fontRatio: fontRatio.toFixed(2),
            hasBgAsymmetry,
            buttonCount: buttons.length
          }
        });
      }
    }

    return matches;
  }

  /**
   * Process a COMBINED type detector
   */
  function processCombinedDetector(detector, rootElement) {
    // Use visual hierarchy detector for sibling comparison
    if (detector.visualChecks?.compareWithSiblings) {
      return processVisualHierarchyDetector(detector, rootElement);
    }

    // Use asymmetric buttons detector for siblingAnalysis
    if (detector.siblingAnalysis) {
      return processAsymmetricButtonsDetector(detector, rootElement);
    }

    const matches = [];

    // Get all potential elements
    let elements;
    if (detector.selectors) {
      elements = new Set();
      for (const selector of detector.selectors) {
        try {
          rootElement.querySelectorAll(selector).forEach(el => elements.add(el));
        } catch (e) {
          // Skip invalid selectors
        }
      }
      elements = Array.from(elements);
    } else {
      elements = rootElement.querySelectorAll('*');
    }

    for (const element of elements) {
      let matchedText = false;
      let matchedVisual = false;

      // Check text patterns
      if (detector.textPatterns) {
        const text = getVisibleText(element);
        if (matchesPatterns(text, detector.textPatterns)) {
          matchedText = true;
        }
      } else {
        matchedText = true;  // No text requirement
      }

      // Check visual properties
      if (detector.visualChecks) {
        const visualResult = checkVisualProperties(element, detector.visualChecks);
        if (Object.keys(visualResult.details).length > 0) {
          matchedVisual = true;
        }
      } else {
        matchedVisual = true;  // No visual requirement
      }

      if (matchedText && matchedVisual) {
        matches.push({
          element,
          text: getVisibleText(element)
        });
      }
    }

    return matches;
  }

  /**
   * Detect patterns in a single element
   */
  function detectInElement(element, pattern) {
    const results = [];

    for (const detector of pattern.detectors) {
      let matches = [];

      switch (detector.type) {
        case 'text':
          matches = processTextDetector(detector, [element]);
          break;
        case 'selector':
          matches = processSelectorDetector(detector, element);
          break;
        case 'combined':
          matches = processCombinedDetector(detector, element);
          break;
      }

      for (const match of matches) {
        results.push({
          pattern,
          element: match.element,
          details: match
        });
      }
    }

    return results;
  }

  /**
   * Remove duplicate detections where:
   * 1. Same element matched by multiple selectors/detectors for the same pattern
   * 2. Parent and child both match the same pattern (keeps the most specific element)
   */
  function deduplicateResults(results) {
    // Group results by pattern ID
    const byPattern = new Map();
    for (const result of results) {
      const id = result.patternId;
      if (!byPattern.has(id)) {
        byPattern.set(id, []);
      }
      byPattern.get(id).push(result);
    }

    const deduplicated = [];

    for (const [patternId, patternResults] of byPattern) {
      // Step 1: Remove same-element duplicates using Set
      const seenElements = new Set();
      const uniqueResults = [];

      for (const result of patternResults) {
        if (!seenElements.has(result.element)) {
          seenElements.add(result.element);
          uniqueResults.push(result);
        }
      }

      if (uniqueResults.length === 1) {
        deduplicated.push(uniqueResults[0]);
        continue;
      }

      // Step 2: For each result, check if any other result's element is its ancestor
      const toKeep = [];

      for (const result of uniqueResults) {
        let hasDescendantMatch = false;

        for (const other of uniqueResults) {
          if (other === result) continue;

          // Check if 'other' element is a descendant of 'result' element
          if (result.element.contains(other.element) && result.element !== other.element) {
            hasDescendantMatch = true;
            break;
          }
        }

        // Only keep this result if no descendant also matched
        if (!hasDescendantMatch) {
          toKeep.push(result);
        }
      }

      deduplicated.push(...toKeep);
    }

    return deduplicated;
  }

  /**
   * Scan a root element for all registered patterns
   */
  function scan(rootElement = document.body) {
    const startTime = performance.now();
    let allResults = [];
    const patterns = registry.getAll();

    if (patterns.length === 0) {
      console.warn('[LightOn] No patterns registered');
      return allResults;
    }

    // Get all potentially relevant elements
    const allElements = rootElement.querySelectorAll('*');
    const elementsToScan = [];

    // Filter out excluded elements
    for (const element of allElements) {
      if (elementsToScan.length >= config.maxElementsPerScan) break;

      let shouldSkip = false;
      for (const excludeSelector of config.excludeSelectors) {
        try {
          if (element.matches(excludeSelector)) {
            shouldSkip = true;
            break;
          }
        } catch (e) {
          // Invalid selector, skip
        }
      }

      if (!shouldSkip && !processedElements.has(element)) {
        elementsToScan.push(element);
      }
    }

    // Scan for each pattern
    for (const pattern of patterns) {
      for (const detector of pattern.detectors) {
        let matches = [];

        switch (detector.type) {
          case 'text':
            matches = processTextDetector(detector, elementsToScan);
            break;
          case 'selector':
            matches = processSelectorDetector(detector, rootElement);
            break;
          case 'combined':
            matches = processCombinedDetector(detector, rootElement);
            break;
        }

        for (const match of matches) {
          allResults.push({
            patternId: pattern.id,
            pattern,
            element: match.element,
            details: match
          });

          // Mark element as processed
          processedElements.add(match.element);
        }
      }
    }

    // Remove duplicate parent-child detections
    allResults = deduplicateResults(allResults);

    const endTime = performance.now();
    console.log(`[LightOn] Scan completed in ${(endTime - startTime).toFixed(2)}ms, found ${allResults.length} patterns`);

    return allResults;
  }

  /**
   * Clear detection cache and processed elements
   */
  function clearCache() {
    detectionCache.clear();
    // Note: WeakSet doesn't have clear(), so we create a new one
    // This is handled by the garbage collector
  }

  /**
   * Get detection statistics
   */
  function getStats(results) {
    const stats = {
      total: results.length,
      byCategory: {},
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0
      }
    };

    for (const result of results) {
      const { pattern } = result;

      // Count by category
      stats.byCategory[pattern.category] = (stats.byCategory[pattern.category] || 0) + 1;

      // Count by severity
      stats.bySeverity[pattern.severity]++;
    }

    return stats;
  }

  // Public API
  return {
    scan,
    detectInElement,
    clearCache,
    getStats,
    config
  };
})();
