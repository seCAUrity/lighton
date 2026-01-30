/**
 * LightOn Content Script
 *
 * Entry point for the extension's content script.
 * Initializes detection and highlighting on page load.
 */

(function () {
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

  /**
   * Get the current UI language
   */
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

    // AUTO-APPLY: Automatically equalize detected patterns
    autoApplyActions(currentResults);

    // Update indicator
    const stats = Detector.getStats(currentResults);
    Highlighter.createIndicator(stats);

    // Send results to popup/background
    sendResultsToBackground(stats);

    console.log('[LightOn] Scan complete. Found:', stats.total, 'patterns');
  }

  /**
   * Automatically apply equalization actions to detected patterns
   * 탐지된 다크패턴에 자동으로 균등화/중립화 적용
   * NOTE: 요금제 카드(visual-hierarchy-manipulation)는 폰트 깨짐 방지를 위해 제외
   */
  function autoApplyActions(results) {
    if (!window.LightOn.Actions) {
      console.warn('[LightOn] Actions module not available for auto-apply');
      return;
    }

    const Actions = window.LightOn.Actions;
    let appliedCount = 0;

    // 자동 균등화를 적용할 패턴 ID 목록 (팝업 버튼만)
    const autoApplyPatterns = [
      'asymmetric-buttons',  // 비대칭 버튼 (팝업/모달)
      'preselected-checkbox' // 사전 선택된 체크박스
    ];

    for (const result of results) {
      const { patternId, element } = result;
      if (!element) continue;

      // 자동 적용 대상 패턴만 처리
      if (!autoApplyPatterns.includes(patternId)) {
        continue;
      }

      // Skip if already equalized
      if (element.hasAttribute('data-lighton-equalized') ||
        element.hasAttribute('data-lighton-neutralized')) {
        continue;
      }

      // Get the first (primary) available action for this pattern
      const availableActions = Actions.getAvailableActions(patternId);

      // Prioritize equalize, then neutralize
      let actionType = null;
      if (availableActions.includes('equalize')) {
        actionType = 'equalize';
      } else if (availableActions.includes('uncheck')) {
        actionType = 'uncheck';
      }

      if (actionType) {
        const actionResult = Actions.executeAction(patternId, element, actionType);
        if (actionResult) {
          appliedCount++;
          console.log(`[LightOn] Auto-applied "${actionType}" to pattern "${patternId}"`);
        }
      }
    }

    if (appliedCount > 0) {
      console.log(`[LightOn] Auto-equalized ${appliedCount} dark patterns`);
    }
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

      case 'EXECUTE_ACTION':
        if (window.LightOn.Actions) {
          const { patternId, elementIds, actionType } = message;
          const results = [];

          if (elementIds && elementIds.length > 0) {
            elementIds.forEach(id => {
              const element = document.querySelector(`[data-lighton-id="${id}"]`);
              if (element) {
                const result = window.LightOn.Actions.executeAction(patternId, element, actionType);
                if (result) {
                  results.push({ elementId: id, success: true, actionId: result.actionId });
                } else {
                  results.push({ elementId: id, success: false });
                }
              }
            });
          }

          sendResponse({ success: true, results });
        } else {
          sendResponse({ success: false, error: 'Actions module not available' });
        }
        break;

      case 'UNDO_ACTION':
        if (window.LightOn.Actions) {
          const { actionId } = message;
          const success = window.LightOn.Actions.undoAction(actionId);
          sendResponse({ success });
        } else {
          sendResponse({ success: false, error: 'Actions module not available' });
        }
        break;

      case 'CLEAR_ALL_ACTIONS':
        if (window.LightOn.Actions) {
          window.LightOn.Actions.clearAll();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Actions module not available' });
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
