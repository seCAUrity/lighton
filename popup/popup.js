/**
 * LightOn Popup Script
 *
 * Handles the extension popup UI interactions.
 */

(function() {
  'use strict';

  // DOM Elements
  const elements = {
    enableToggle: document.getElementById('enableToggle'),
    statusSection: document.getElementById('statusSection'),
    statusIcon: document.getElementById('statusIcon'),
    statusText: document.getElementById('statusText'),
    resultsSection: document.getElementById('resultsSection'),
    emptySection: document.getElementById('emptySection'),
    disabledSection: document.getElementById('disabledSection'),
    highCount: document.getElementById('highCount'),
    mediumCount: document.getElementById('mediumCount'),
    lowCount: document.getElementById('lowCount'),
    patternList: document.getElementById('patternList'),
    rescanBtn: document.getElementById('rescanBtn'),
    // Secession elements
    secessionSection: document.getElementById('secessionSection'),
    secessionTrigger: document.getElementById('secessionTrigger'),
    secessionBody: document.getElementById('secessionBody'),
    secessionArrow: document.getElementById('secessionArrow'),
    secessionLoading: document.getElementById('secessionLoading'),
    secessionContent: document.getElementById('secessionContent'),
    secessionNotFound: document.getElementById('secessionNotFound'),
    secessionError: document.getElementById('secessionError'),
    secessionServiceName: document.getElementById('secessionServiceName'),
    secessionDifficulty: document.getElementById('secessionDifficulty'),
    secessionDifficultyText: document.querySelector('.secession__difficulty-text'),
    secessionNotes: document.getElementById('secessionNotes'),
    secessionAction: document.getElementById('secessionAction'),
    secessionRetry: document.getElementById('secessionRetry')
  };

  // Localization strings
  const i18n = {
    ko: {
      popupSubtitle: '다크패턴 탐지기',
      detectedCount: '탐지된 패턴',
      severityHigh: '높음',
      severityMedium: '중간',
      severityLow: '낮음',
      noPatterns: '이 페이지에서 다크패턴이 발견되지 않았습니다.',
      scanning: '검사 중...',
      patternsFound: '개의 패턴이 발견되었습니다',
      disabled: 'LightOn이 비활성화되어 있습니다.',
      rescan: '다시 검사',
      categories: {
        interface: '인터페이스 조작',
        sneaking: '규정의 숨김',
        obstruction: '경로의 방해',
        nagging: '반복적 간섭',
        social: '사회적 증거 조작',
        forced: '행동의 강요'
      },
      // Secession info
      secessionTitle: '계정 탈퇴 정보',
      secessionLoadingText: '정보 조회 중...',
      secessionNotFound: '이 사이트의 탈퇴 정보를 찾을 수 없습니다.',
      secessionError: '정보를 불러올 수 없습니다.',
      secessionViewGuide: '탈퇴 가이드 보기',
      secessionSeeGuide: '자세한 정보는 가이드를 참조하세요.',
      secessionDifficultyEasy: '쉬움',
      secessionDifficultyMedium: '중간',
      secessionDifficultyHard: '어려움',
      secessionDifficultyLimited: '제한적',
      secessionDifficultyImpossible: '불가능',
      retry: '다시 시도'
    },
    en: {
      popupSubtitle: 'Dark Pattern Detector',
      detectedCount: 'Detected Patterns',
      severityHigh: 'High',
      severityMedium: 'Medium',
      severityLow: 'Low',
      noPatterns: 'No dark patterns detected on this page.',
      scanning: 'Scanning...',
      patternsFound: 'patterns found',
      disabled: 'LightOn is disabled.',
      rescan: 'Rescan',
      categories: {
        interface: 'Interface Interference',
        sneaking: 'Sneaking',
        obstruction: 'Obstruction',
        nagging: 'Nagging',
        social: 'Social Proof',
        forced: 'Forced Action'
      },
      // Secession info
      secessionTitle: 'Account Deletion',
      secessionLoadingText: 'Loading...',
      secessionNotFound: 'No deletion info available for this site.',
      secessionError: 'Unable to load information.',
      secessionViewGuide: 'View Deletion Guide',
      secessionSeeGuide: '자세한 정보는 가이드를 참조하세요.',
      secessionDifficultyEasy: 'Easy',
      secessionDifficultyMedium: 'Medium',
      secessionDifficultyHard: 'Hard',
      secessionDifficultyLimited: 'Limited',
      secessionDifficultyImpossible: 'Impossible',
      retry: 'Retry'
    }
  };

  // Current language
  const lang = navigator.language?.startsWith('ko') ? 'ko' : 'en';
  const t = i18n[lang];

  /**
   * Get the active tab
   */
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  /**
   * Send message to content script
   */
  async function sendToContent(message) {
    const tab = await getActiveTab();
    if (!tab?.id) return null;

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[LightOn Popup] Message error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Update the UI based on current state
   */
  function updateUI(enabled, stats, results) {
    // Toggle state
    elements.enableToggle.checked = enabled;

    if (!enabled) {
      // Show disabled state
      elements.statusSection.style.display = 'none';
      elements.resultsSection.style.display = 'none';
      elements.emptySection.style.display = 'none';
      elements.disabledSection.style.display = 'flex';
      return;
    }

    elements.disabledSection.style.display = 'none';
    elements.statusSection.style.display = 'flex';

    if (!stats || stats.total === 0) {
      // No patterns found
      elements.statusIcon.textContent = '✨';
      elements.statusIcon.className = 'popup__status-icon popup__status-icon--clean';
      elements.statusText.textContent = t.noPatterns;
      elements.resultsSection.style.display = 'none';
      elements.emptySection.style.display = 'flex';
      return;
    }

    // Patterns found
    elements.emptySection.style.display = 'none';
    elements.resultsSection.style.display = 'block';

    // Update status
    if (stats.bySeverity.high > 0) {
      elements.statusIcon.textContent = '⚠️';
      elements.statusIcon.className = 'popup__status-icon popup__status-icon--high';
    } else if (stats.bySeverity.medium > 0) {
      elements.statusIcon.textContent = '💡';
      elements.statusIcon.className = 'popup__status-icon popup__status-icon--medium';
    } else {
      elements.statusIcon.textContent = 'ℹ️';
      elements.statusIcon.className = 'popup__status-icon popup__status-icon--low';
    }

    elements.statusText.textContent = `${stats.total} ${t.patternsFound}`;

    // Update counts
    updateCount(elements.highCount, stats.bySeverity.high);
    updateCount(elements.mediumCount, stats.bySeverity.medium);
    updateCount(elements.lowCount, stats.bySeverity.low);

    // Update pattern list
    updatePatternList(results);
  }

  /**
   * Update a count display
   */
  function updateCount(element, count) {
    if (count > 0) {
      element.style.display = 'flex';
      element.querySelector('.popup__count-number').textContent = count;
    } else {
      element.style.display = 'none';
    }
  }

  // Store all results for navigation
  let allResults = [];
  let currentNavIndex = {};  // Track current index per pattern type

  /**
   * Update the pattern list
   */
  function updatePatternList(results) {
    elements.patternList.innerHTML = '';
    allResults = results || [];
    currentNavIndex = {};

    if (!results || results.length === 0) return;

    // Group by pattern with element references
    const grouped = {};
    for (const result of results) {
      const key = result.patternId;
      if (!grouped[key]) {
        grouped[key] = {
          ...result,
          count: 0,
          elements: []
        };
      }
      grouped[key].count++;
      grouped[key].elements.push(result.elementId);
    }

    // Create list items
    for (const pattern of Object.values(grouped)) {
      const li = document.createElement('li');
      li.className = `popup__list-item popup__list-item--${pattern.severity}`;
      li.setAttribute('data-pattern-id', pattern.patternId);
      li.setAttribute('data-element-ids', JSON.stringify(pattern.elements));
      li.style.cursor = 'pointer';
      li.title = lang === 'ko' ? '클릭하여 해당 위치로 이동' : 'Click to navigate to this pattern';

      const icon = document.createElement('span');
      icon.className = 'popup__list-icon';
      icon.textContent = getPatternIcon(pattern.patternId);

      const content = document.createElement('div');
      content.className = 'popup__list-content';

      const name = document.createElement('span');
      name.className = 'popup__list-name';
      name.textContent = pattern.patternName;

      const category = document.createElement('span');
      category.className = 'popup__list-category';
      category.textContent = t.categories[pattern.category] || pattern.category;

      content.appendChild(name);
      content.appendChild(category);

      const countContainer = document.createElement('div');
      countContainer.className = 'popup__list-count-container';

      const count = document.createElement('span');
      count.className = 'popup__list-count';
      count.textContent = pattern.count > 1 ? `×${pattern.count}` : '';

      const arrow = document.createElement('span');
      arrow.className = 'popup__list-arrow';
      arrow.textContent = '→';

      countContainer.appendChild(count);
      countContainer.appendChild(arrow);

      li.appendChild(icon);
      li.appendChild(content);
      li.appendChild(countContainer);

      // Click handler - navigate to element
      li.addEventListener('click', () => handlePatternClick(pattern.patternId, pattern.elements));

      elements.patternList.appendChild(li);
    }
  }

  /**
   * Handle click on pattern list item - scroll to element
   */
  async function handlePatternClick(patternId, elementIds) {
    if (!elementIds || elementIds.length === 0) return;

    // Initialize or increment navigation index for this pattern
    if (currentNavIndex[patternId] === undefined) {
      currentNavIndex[patternId] = 0;
    } else {
      currentNavIndex[patternId] = (currentNavIndex[patternId] + 1) % elementIds.length;
    }

    const currentIndex = currentNavIndex[patternId];
    const elementId = elementIds[currentIndex];

    // Update UI to show current position
    updateActiveItem(patternId, currentIndex, elementIds.length);

    // Send message to content script to scroll to element
    await sendToContent({
      type: 'SCROLL_TO_PATTERN',
      elementId: elementId
    });

    // 팝업을 닫지 않음 - Ctrl+F 스타일 연속 탐색 지원
  }

  /**
   * Update active item styling and navigation counter
   */
  function updateActiveItem(patternId, currentIndex, total) {
    // 모든 항목에서 active 클래스 제거
    document.querySelectorAll('.popup__list-item').forEach(item => {
      item.classList.remove('popup__list-item--active');
    });

    // 현재 항목에 active 클래스 추가
    const activeItem = document.querySelector(`[data-pattern-id="${patternId}"]`);
    if (activeItem) {
      activeItem.classList.add('popup__list-item--active');

      // 카운터 업데이트 (2개 이상일 때만 표시)
      let counter = activeItem.querySelector('.popup__nav-counter');
      if (total > 1) {
        if (!counter) {
          counter = document.createElement('span');
          counter.className = 'popup__nav-counter';
          const countContainer = activeItem.querySelector('.popup__list-count-container');
          if (countContainer) {
            countContainer.insertBefore(counter, countContainer.firstChild);
          }
        }
        counter.textContent = `${currentIndex + 1}/${total}`;
      } else if (counter) {
        counter.remove();
      }
    }
  }

  /**
   * Get icon for a pattern
   */
  function getPatternIcon(patternId) {
    const icons = {
      'emotional-manipulation': '🎭',
      'preselected-checkbox': '⚠️',
      'hidden-cancel': '🔍',
      'asymmetric-buttons': '⚖️',
      'ambiguous-button': '❓',
      'hidden-cost': '💰',
      'small-print': '🔎',
      'auto-add-cart': '🛒',
      'free-trial-trap': '⏰'
    };
    return icons[patternId] || '💡';
  }

  /**
   * Show scanning state
   */
  function showScanning() {
    elements.statusIcon.textContent = '🔍';
    elements.statusIcon.className = 'popup__status-icon popup__status-icon--scanning';
    elements.statusText.textContent = t.scanning;
    elements.resultsSection.style.display = 'none';
    elements.emptySection.style.display = 'none';
  }

  // =========================
  // Secession Info Functions
  // =========================

  /**
   * Capitalize first letter
   */
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Request secession info from background script
   */
  async function requestSecessionInfo(url) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'GET_SECESSION_INFO',
        data: { url: url, lang: lang }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[LightOn Popup] Secession info error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Show secession loading state
   */
  function showSecessionLoading() {
    if (!elements.secessionSection) return;

    // Ensure section is visible but collapsed initially
    elements.secessionSection.style.display = 'block';
    
    // Set loading state in body
    elements.secessionLoading.style.display = 'flex';
    elements.secessionContent.style.display = 'none';
    elements.secessionNotFound.style.display = 'none';
    elements.secessionError.style.display = 'none';
  }

  /**
   * Display secession info in UI
   */
  function displaySecessionInfo(response) {
    if (!response || !elements.secessionSection) return;

    elements.secessionLoading.style.display = 'none';

    if (!response.success) {
      if (response.error === 'not_found') {
        elements.secessionNotFound.style.display = 'block';
        elements.secessionContent.style.display = 'none';
        elements.secessionError.style.display = 'none';
      } else if (response.error === 'invalid_domain') {
        elements.secessionSection.style.display = 'none';
        return;
      } else {
        elements.secessionError.style.display = 'block';
        elements.secessionContent.style.display = 'none';
        elements.secessionNotFound.style.display = 'none';
      }
      return;
    }

    const data = response.data;

    elements.secessionContent.style.display = 'block';
    elements.secessionNotFound.style.display = 'none';
    elements.secessionError.style.display = 'none';

    // 서비스 이름
    elements.secessionServiceName.textContent = data.name;

    // 난이도 배지
    const difficultyKey = `secessionDifficulty${capitalize(data.difficulty)}`;
    const difficultyText = t[difficultyKey] || data.difficulty;
    elements.secessionDifficultyText.textContent = difficultyText;

    elements.secessionDifficulty.className = `secession__difficulty secession__difficulty--${data.difficulty}`;

    const difficultyIcons = {
      easy: '✅',
      medium: '⚠️',
      hard: '❌',
      limited: '⏱️',
      impossible: '🚫'
    };
    const icon = elements.secessionDifficulty.querySelector('.secession__difficulty-icon');
    if (icon) {
      icon.textContent = difficultyIcons[data.difficulty] || '📋';
    }

    // 설명
    elements.secessionNotes.textContent = data.notes || t.secessionSeeGuide;

    // 액션 링크
    elements.secessionAction.href = data.url;
    elements.secessionAction.style.display = data.url ? 'flex' : 'none';
  }

  /**
   * Apply localization to secession section
   */
  function applyLocalization() {
    // Secession section
    if (document.getElementById('secessionTitleText')) {
      document.getElementById('secessionTitleText').textContent = t.secessionTitle;
    }
    if (document.getElementById('secessionLoadingText')) {
      document.getElementById('secessionLoadingText').textContent = t.secessionLoadingText;
    }
    if (document.getElementById('secessionNotFoundText')) {
      document.getElementById('secessionNotFoundText').textContent = t.secessionNotFound;
    }
    if (document.getElementById('secessionErrorText')) {
      document.getElementById('secessionErrorText').textContent = t.secessionError;
    }
    if (document.getElementById('secessionActionText')) {
      document.getElementById('secessionActionText').textContent = t.secessionViewGuide;
    }
    if (document.getElementById('secessionRetryText')) {
      document.getElementById('secessionRetryText').textContent = t.retry;
    }

    // Existing data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });
  }
  
  /**
   * Toggle secession section
   */
  if (elements.secessionTrigger) {
    elements.secessionTrigger.addEventListener('click', () => {
      const isHidden = elements.secessionBody.style.display === 'none';
      elements.secessionBody.style.display = isHidden ? 'block' : 'none';
      
      if (isHidden) {
        elements.secessionSection.classList.add('open');
      } else {
        elements.secessionSection.classList.remove('open');
      }
    });
  }

  /**
   * Initialize popup
   */
  async function initialize() {
    // Get current state from content script
    const response = await sendToContent({ type: 'GET_STATUS' });

    if (response) {
      // Get detailed results
      const resultsResponse = await sendToContent({ type: 'GET_RESULTS' });
      updateUI(response.enabled, response.stats, resultsResponse?.results);
    } else {
      // Content script not available (might be a chrome:// page)
      elements.statusIcon.textContent = '❌';
      elements.statusText.textContent = lang === 'ko'
        ? '이 페이지에서는 사용할 수 없습니다.'
        : 'Not available on this page.';
      elements.resultsSection.style.display = 'none';
    }

    // Fetch secession info
    const tab = await getActiveTab();
    if (tab?.url) {
      showSecessionLoading();
      const secessionInfo = await requestSecessionInfo(tab.url);
      displaySecessionInfo(secessionInfo);
    }

    // Apply localization
    applyLocalization();
  }

  /**
   * Handle enable toggle
   */
  elements.enableToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;

    // Save to storage
    chrome.storage.sync.set({ enabled });

    // Update content script
    await sendToContent({ type: 'SET_ENABLED', enabled });

    if (enabled) {
      showScanning();
      // Wait for scan to complete
      setTimeout(async () => {
        const response = await sendToContent({ type: 'GET_STATUS' });
        const resultsResponse = await sendToContent({ type: 'GET_RESULTS' });
        if (response) {
          updateUI(response.enabled, response.stats, resultsResponse?.results);
        }
      }, 1000);
    } else {
      updateUI(false, null, null);
    }
  });

  /**
   * Handle rescan button
   */
  elements.rescanBtn.addEventListener('click', async () => {
    showScanning();

    const response = await sendToContent({ type: 'RESCAN' });

    if (response) {
      setTimeout(async () => {
        const resultsResponse = await sendToContent({ type: 'GET_RESULTS' });
        updateUI(true, response.stats, resultsResponse?.results);
      }, 500);
    }
  });

  /**
   * Handle secession retry button
   */
  if (elements.secessionRetry) {
    elements.secessionRetry.addEventListener('click', async () => {
      const tab = await getActiveTab();
      if (tab?.url) {
        showSecessionLoading();
        const secessionInfo = await requestSecessionInfo(tab.url);
        displaySecessionInfo(secessionInfo);
      }
    });
  }

  // Initialize on load
  initialize();
})();
