/**
 * LightOn Background Service Worker
 *
 * Handles extension lifecycle, badge updates, and cross-tab communication.
 */

// Store scan results per tab
const tabResults = new Map();

/**
 * Update the extension badge for a tab
 */
function updateBadge(tabId, stats) {
  if (!stats) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }

  const total = stats.total || 0;

  if (total === 0) {
    chrome.action.setBadgeText({ tabId, text: '' });
  } else {
    chrome.action.setBadgeText({ tabId, text: String(total) });

    // Set badge color based on highest severity
    let color = '#4ECDC4';  // Low - teal
    if (stats.bySeverity?.high > 0) {
      color = '#FF6B6B';  // High - red
    } else if (stats.bySeverity?.medium > 0) {
      color = '#FFB800';  // Medium - yellow
    }

    chrome.action.setBadgeBackgroundColor({ tabId, color });
  }
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'SCAN_RESULTS':
      if (tabId) {
        tabResults.set(tabId, message.data);
        updateBadge(tabId, message.data.stats);
      }
      sendResponse({ success: true });
      break;

    case 'GET_TAB_RESULTS':
      if (tabId && tabResults.has(tabId)) {
        sendResponse(tabResults.get(tabId));
      } else {
        sendResponse(null);
      }
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true;
});

/**
 * Clean up when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  tabResults.delete(tabId);
});

/**
 * Clear results when tab navigates to a new page
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    tabResults.delete(tabId);
    updateBadge(tabId, null);
  }
});

/**
 * Handle extension install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      enabled: true,
      language: 'auto'
    });

    console.log('[LightOn] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[LightOn] Extension updated to version', chrome.runtime.getManifest().version);
  }
});

/**
 * Handle extension icon click (for when popup is disabled)
 */
chrome.action.onClicked.addListener((tab) => {
  // This only fires if there's no popup
  // Toggle extension for this tab
  chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, (response) => {
    if (response) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SET_ENABLED',
        enabled: !response.enabled
      });
    }
  });
});

console.log('[LightOn] Background service worker started');
