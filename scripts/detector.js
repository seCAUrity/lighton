/**
 * LightOn Pattern Detector Engine
 *
 * Core detection engine that scans DOM elements for dark patterns
 * using the registered pattern definitions.
 */

window.LightOn = window.LightOn || {};

window.LightOn.Detector = (function() {
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
   * Process a COMBINED type detector
   */
  function processCombinedDetector(detector, rootElement) {
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
   * Remove duplicate detections where parent and child both match the same pattern
   * Keeps the most specific (smallest/deepest) element
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
      if (patternResults.length === 1) {
        deduplicated.push(patternResults[0]);
        continue;
      }

      // For each result, check if any other result's element is its ancestor
      const toKeep = [];

      for (const result of patternResults) {
        let hasDescendantMatch = false;

        for (const other of patternResults) {
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
