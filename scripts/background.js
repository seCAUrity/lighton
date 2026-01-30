/**
 * LightOn Background Service Worker
 *
 * Handles extension lifecycle, badge updates, and cross-tab communication.
 */

// Store scan results per tab
const tabResults = new Map();

// =========================
// JustDeleteAccount.com API Integration
// =========================

// Session cache for secession info
const secessionCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1시간
const MAX_CACHE_SIZE = 100;
const API_BASE_URL = 'https://api.justdeleteaccount.com/v1';

/**
 * Rate Limiter for API requests (10 req/10s)
 */
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 10000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest() {
    this.requests.push(Date.now());
  }

  async waitForSlot() {
    while (!this.canMakeRequest()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

const rateLimiter = new RateLimiter();

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);

    // chrome:// 등 내부 페이지는 스킵
    if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'chrome-extension:') {
      return null;
    }

    // www. 제거
    const hostname = urlObj.hostname.replace(/^www\./, '');
    return hostname;
  } catch (e) {
    console.warn('[LightOn] Invalid URL:', url);
    return null;
  }
}

/**
 * Fetch account deletion info from JustDeleteAccount.com API
 */
async function fetchSecessionInfo(domain, lang = 'en') {
  const cacheKey = `${domain}_${lang}`;

  // 캐시 확인
  const cached = secessionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`[LightOn Secession] Cache hit for ${domain}`);
    return { ...cached.data, cached: true };
  }

  // Rate Limit 대기
  await rateLimiter.waitForSlot();

  try {
    const url = `${API_BASE_URL}/services/by-domain/${encodeURIComponent(domain)}?lang=${lang}&subdomains=exact`;
    console.log(`[LightOn Secession] Fetching: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    rateLimiter.recordRequest();

    if (response.status === 404) {
      const notFoundResult = {
        success: false,
        error: 'not_found',
        message: 'No deletion info available'
      };
      secessionCache.set(cacheKey, { data: notFoundResult, timestamp: Date.now() });
      return notFoundResult;
    }

    if (response.status === 429) {
      return {
        success: false,
        error: 'rate_limited',
        message: 'Rate limit exceeded'
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const jsonData = await response.json();

    if (jsonData.success && jsonData.data) {
      // LRU 캐시 크기 제한
      if (secessionCache.size >= MAX_CACHE_SIZE) {
        const firstKey = secessionCache.keys().next().value;
        secessionCache.delete(firstKey);
      }

      secessionCache.set(cacheKey, { data: jsonData, timestamp: Date.now() });
      console.log(`[LightOn Secession] Success for ${domain}`);
      return { ...jsonData, cached: false };
    }

    return {
      success: false,
      error: 'invalid_response',
      message: 'Invalid API response'
    };

  } catch (error) {
    console.error('[LightOn Secession] API error:', error);
    return {
      success: false,
      error: 'network_error',
      message: error.message
    };
  }
}

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

    case 'GET_SECESSION_INFO':
      const { url, lang = 'en' } = message.data;
      const domain = extractDomain(url);

      if (!domain) {
        sendResponse({
          success: false,
          error: 'invalid_domain',
          message: 'Cannot extract domain from URL'
        });
        return true;
      }

      fetchSecessionInfo(domain, lang).then(result => {
        sendResponse(result);
      });
      return true; // 비동기 응답

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
