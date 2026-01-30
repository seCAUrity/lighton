/**
 * LightOn Content Script
 *
 * Entry point for the extension's content script.
 * Initializes detection and highlighting on page load.
 */

(function() {
  'use strict';

  // Wait for LightOn modules to be available
  if (!window.LightOn || !window.LightOn.PatternRegistry || !window.LightOn.Detector || !window.LightOn.Highlighter) {
    console.warn('[LightOn] Modules not loaded yet, retrying...');
    setTimeout(() => {
      // Re-run this script
      const script = document.currentScript || document.querySelector('script[src*="content.js"]');
      if (script) {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        document.head.appendChild(newScript);
      }
    }, 100);
    return;
  }

  const { PatternRegistry, Detector, Highlighter } = window.LightOn;

  // Extension state
  let isEnabled = true;
  let currentResults = [];
  let mutationObserver = null;
  let scanTimeout = null;
  let elementIdCounter = 0;

  // Configuration
  const config = {
    scanDelay: 500,           // Initial scan delay after page load
    mutationDebounce: 300,    // Debounce for mutation observer
    rescanOnMutation: true    // Whether to rescan on DOM changes
  };

  // Readability fix configuration
  const readabilityFix = {
    fontSize: 18,
    lineHeight: 1.6,
    contrastThreshold: 4.5,
    minOpacity: 0.7
  };

  
  function elementText(el) {
    if (!el) return '';
    const aria = el.getAttribute?.('aria-label') || '';
    const title = el.getAttribute?.('title') || '';
    const text = el.innerText || el.textContent || '';
    return [aria, title, text].filter(Boolean).join(' ').trim();
  }
  function isInLightOnUI(el) {
    return !!el.closest('.lighton-tooltip, .lighton-dot, .lighton-indicator, .lighton-focus-overlay');
  }

  function shouldApplyReadabilityFix(patternId) {
    const targets = new Set([
      'hidden-cancel',
      'small-print',
      'hidden-cost',
      'asymmetric-buttons'
    ]);
    return targets.has(patternId);
  }

  function applyReadabilityFixes(results) {
    clearReadabilityFixes();

    document.documentElement.style.setProperty('--lighton-fix-font-size', `${readabilityFix.fontSize}px`);
    document.documentElement.style.setProperty('--lighton-fix-line-height', `${readabilityFix.lineHeight}`);

    results.forEach(result => {
      if (!result || !result.element) return;
      const el = result.element;
      if (el.closest('[data-lighton-ignore]') || isInLightOnUI(el)) return;

      const isEligible = el.matches?.('a,button,span,p,small,label,li,em,strong,b,i,u,[role="button"],input,textarea');
      const text = elementText(el);
      if (!text || (!isEligible && !shouldApplyReadabilityFix(result.patternId))) return;

      const style = window.getComputedStyle(el);
      const fontPx = parseFloat(style.fontSize) || 16;
      const shouldFixText = fontPx < readabilityFix.fontSize;
      if (fontPx < readabilityFix.fontSize) {
        el.classList.add('lighton-fix-text');
      }

      const fg = parseColor(style.color);
      const bg = getEffectiveBackground(el);
      const ratio = contrastRatio(fg, bg);
      const opacity = parseFloat(style.opacity) || 1;
      const shouldFixContrast = ratio < readabilityFix.contrastThreshold || opacity < readabilityFix.minOpacity;
      const shouldForce = shouldApplyReadabilityFix(result.patternId);

      if ((shouldForce || shouldFixText || shouldFixContrast) && shouldFixContrast) {
        if (!el.hasAttribute('data-lighton-fix-old-color')) {
          el.setAttribute('data-lighton-fix-old-color', el.style.getPropertyValue('color') || '');
          el.setAttribute('data-lighton-fix-old-priority', el.style.getPropertyPriority('color') || '');
        }
        const light = { r: 249, g: 250, b: 251, a: 1 };
        const dark = { r: 15, g: 23, b: 42, a: 1 };
        const lightRatio = contrastRatio(light, bg);
        const darkRatio = contrastRatio(dark, bg);
        const next = lightRatio >= darkRatio ? '#f9fafb' : '#0f172a';
        el.style.setProperty('color', next, 'important');
        el.classList.add('lighton-fix-contrast');
      }
    });
  }

  function clearReadabilityFixes() {
    document.documentElement.style.removeProperty('--lighton-fix-font-size');
    document.documentElement.style.removeProperty('--lighton-fix-line-height');

    const fixed = document.querySelectorAll('.lighton-fix-text, .lighton-fix-contrast');
    fixed.forEach(el => {
      el.classList.remove('lighton-fix-text', 'lighton-fix-contrast');
      if (el.hasAttribute('data-lighton-fix-old-color')) {
        const prev = el.getAttribute('data-lighton-fix-old-color');
        const priority = el.getAttribute('data-lighton-fix-old-priority') || '';
        if (prev) {
          el.style.setProperty('color', prev, priority);
        } else {
          el.style.removeProperty('color');
        }
        el.removeAttribute('data-lighton-fix-old-color');
        el.removeAttribute('data-lighton-fix-old-priority');
      }
    });
  }

  function parseColor(input) {
    if (!input) return null;
    const s = input.trim().toLowerCase();
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const rgba = s.match(/^rgba?\(([^)]+)\)$/);
    if (rgba) {
      const parts = rgba[1].split(',').map(p => p.trim());
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      return { r, g, b, a };
    }
    const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const h = hex[1];
      if (h.length === 3) {
        return {
          r: parseInt(h[0] + h[0], 16),
          g: parseInt(h[1] + h[1], 16),
          b: parseInt(h[2] + h[2], 16),
          a: 1
        };
      }
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: 1
      };
    }
    return null;
  }

  function getEffectiveBackground(el) {
    let node = el;
    while (node && node.nodeType === 1) {
      const style = window.getComputedStyle(node);
      const bg = parseColor(style.backgroundColor);
      if (bg && bg.a > 0.05) return bg;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  function relativeLuminance(rgb) {
    const channel = v => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function contrastRatio(fg, bg) {
    if (!fg || !bg) return 1;
    const l1 = relativeLuminance(fg) + 0.05;
    const l2 = relativeLuminance(bg) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  }

  function getCurrentLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    return lang.startsWith('ko') ? 'ko' : 'en';
  }

  /**
   * Perform a scan and update highlights
   */
  function performScan() {
    if (!isEnabled) return;

    console.log('[LightOn] Starting scan...');

    // Clear existing highlights
    Highlighter.clearAll();
    clearReadabilityFixes();

    // Scan for patterns
    currentResults = Detector.scan(document.body);

    // Assign unique IDs to detected elements for scroll targeting
    currentResults.forEach((result, index) => {
      if (result.element && !result.element.hasAttribute('data-lighton-id')) {
        result.element.setAttribute('data-lighton-id', `lighton-${elementIdCounter++}`);
      }
      result.elementId = result.element?.getAttribute('data-lighton-id');
    });

    // Apply highlights
    Highlighter.highlightAll(currentResults);

    // Apply readability fixes for matched patterns
    applyReadabilityFixes(currentResults);

    // Update indicator
    const stats = Detector.getStats(currentResults);
    Highlighter.createIndicator(stats);

    // Send results to popup/background
    sendResultsToBackground(stats);

    console.log('[LightOn] Scan complete. Found:', stats.total, 'patterns');
  }

  /**
   * Debounced scan for mutation observer
   */
  function debouncedScan() {
    if (scanTimeout) {
      clearTimeout(scanTimeout);
    }
    scanTimeout = setTimeout(() => {
      performScan();
    }, config.mutationDebounce);
  }

  /**
   * Set up mutation observer to detect DOM changes
   */
  function setupMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver((mutations) => {
      if (!config.rescanOnMutation || !isEnabled) return;

      // Check if mutations are significant enough to warrant a rescan
      let shouldRescan = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if added nodes contain interactive elements
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches?.('button, a, input, [role="button"], [role="dialog"], form, .modal, [class*="popup"]')) {
                shouldRescan = true;
                break;
              }
              if (node.querySelector?.('button, a, input, [role="button"], [role="dialog"], form')) {
                shouldRescan = true;
                break;
              }
            }
          }
        }
        if (shouldRescan) break;
      }

      if (shouldRescan) {
        debouncedScan();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  /**
   * Send results to background script
   */
  function sendResultsToBackground(stats) {
    try {
      chrome.runtime.sendMessage({
        type: 'SCAN_RESULTS',
        data: {
          url: window.location.href,
          stats: stats,
          timestamp: Date.now()
        }
      });
    } catch (e) {
      // Extension context may be invalidated
      console.warn('[LightOn] Failed to send message to background:', e);
    }
  }

  /**
   * Handle messages from popup/background
   */
  function handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_STATUS':
        sendResponse({
          enabled: isEnabled,
          stats: Detector.getStats(currentResults),
          patternCount: PatternRegistry.count()
        });
        break;

      case 'SET_ENABLED':
        isEnabled = message.enabled;
        Highlighter.setEnabled(isEnabled);

        if (isEnabled) {
          performScan();
        } else {
          Highlighter.clearAll();
          Highlighter.removeIndicator();
          clearReadabilityFixes();
        }
        sendResponse({ success: true });
        break;

      case 'RESCAN':
        performScan();
        sendResponse({
          success: true,
          stats: Detector.getStats(currentResults)
        });
        break;

      case 'GET_RESULTS':
        sendResponse({
          results: currentResults.map((r, index) => ({
            patternId: r.patternId,
            patternName: PatternRegistry.getLocalizedText(r.pattern.name, getCurrentLanguage()),
            severity: r.pattern.severity,
            category: r.pattern.category,
            elementId: r.elementId,
            index: index
          })),
          stats: Detector.getStats(currentResults)
        });
        break;

      case 'SCROLL_TO_PATTERN':
        const { elementId } = message;
        if (elementId) {
          const targetElement = document.querySelector(`[data-lighton-id="${elementId}"]`);
          if (targetElement) {
            Highlighter.focusElement(targetElement);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Element not found' });
          }
        } else {
          sendResponse({ success: false, error: 'No elementId provided' });
        }
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }

    return true;  // Keep channel open for async response
  }

  /**
   * Initialize the extension
   */
  function initialize() {
    console.log('[LightOn] Initializing...');

    // Set language
    Highlighter.setLanguage(getCurrentLanguage());

    // Check if extension is enabled from storage
    try {
      chrome.storage.sync.get(['enabled'], (result) => {
        isEnabled = result.enabled !== false;  // Default to enabled

        if (isEnabled) {
          // Initial scan after a short delay
          setTimeout(performScan, config.scanDelay);
        }
      });
    } catch (e) {
      // Storage not available, proceed with defaults
      setTimeout(performScan, config.scanDelay);
    }

    // Set up mutation observer
    setupMutationObserver();

    // Listen for messages
    try {
      chrome.runtime.onMessage.addListener(handleMessage);
    } catch (e) {
      console.warn('[LightOn] Failed to set up message listener:', e);
    }

    // Re-scan when page becomes visible (e.g., tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isEnabled) {
        debouncedScan();
      }
    });

    console.log(`[LightOn] Initialized with ${PatternRegistry.count()} patterns`);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
    if (scanTimeout) {
      clearTimeout(scanTimeout);
    }
  });
})();


