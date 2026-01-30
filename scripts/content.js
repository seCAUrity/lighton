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
