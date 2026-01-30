/**
 * LightOn Highlighter
 *
 * Renders visual highlights on detected dark pattern elements.
 * Supports outline, badge, and tooltip styles.
 */

window.LightOn = window.LightOn || {};

window.LightOn.Highlighter = (function() {
  'use strict';

  const registry = window.LightOn.PatternRegistry;

  // Store highlight elements for cleanup
  const highlightElements = new Map();

  // Current language
  let currentLang = 'ko';

  // Tooltip currently visible
  let activeTooltip = null;

  /**
   * Create a subtle dot indicator
   */
  function createDot(pattern, targetElement) {
    const dot = document.createElement('div');
    dot.className = `lighton-dot lighton-dot--${pattern.severity}`;
    dot.setAttribute('data-lighton-dot', pattern.id);
    dot.setAttribute('role', 'status');
    dot.setAttribute('aria-label', registry.getLocalizedText(pattern.name, currentLang));

    // Hover handlers for tooltip
    dot.addEventListener('mouseenter', (e) => {
      showHoverTooltip(pattern, dot, e);
    });

    dot.addEventListener('mouseleave', () => {
      hideHoverTooltip();
    });

    // Click handler - keep tooltip open
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    return dot;
  }

  // Hover tooltip element
  let hoverTooltip = null;

  /**
   * Show tooltip on hover
   */
  function showHoverTooltip(pattern, dot, event) {
    hideHoverTooltip();

    const tooltip = createTooltip(pattern);
    tooltip.style.pointerEvents = 'none';
    document.body.appendChild(tooltip);

    // Position tooltip near the dot
    const dotRect = dot.getBoundingClientRect();

    // Calculate position - prefer above the dot, fall back to below
    let top = dotRect.top - 8;
    let left = dotRect.left + dotRect.width / 2;

    // Get tooltip dimensions after adding to DOM
    const tooltipRect = tooltip.getBoundingClientRect();

    // Adjust horizontal position
    left = left - tooltipRect.width / 2;
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    // Adjust vertical position - show above if possible, below if not
    if (dotRect.top - tooltipRect.height - 12 > 10) {
      top = dotRect.top - tooltipRect.height - 8;
    } else {
      top = dotRect.bottom + 8;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    // Show with animation
    requestAnimationFrame(() => {
      tooltip.classList.add('lighton-tooltip--visible');
    });

    hoverTooltip = tooltip;
  }

  /**
   * Hide hover tooltip
   */
  function hideHoverTooltip() {
    if (hoverTooltip) {
      hoverTooltip.remove();
      hoverTooltip = null;
    }
  }

  /**
   * Create a badge element (legacy - kept for compatibility)
   */
  function createBadge(pattern, targetElement) {
    // Now returns a dot instead
    return createDot(pattern, targetElement);
  }

  /**
   * Create a tooltip element
   */
  function createTooltip(pattern) {
    const tooltip = document.createElement('div');
    tooltip.className = 'lighton-tooltip';
    tooltip.setAttribute('data-lighton-tooltip', pattern.id);
    tooltip.setAttribute('role', 'tooltip');

    // Header
    const header = document.createElement('div');
    header.className = 'lighton-tooltip__header';

    const icon = document.createElement('span');
    icon.className = 'lighton-tooltip__icon';
    icon.textContent = pattern.highlight.icon || '💡';
    header.appendChild(icon);

    const title = document.createElement('span');
    title.className = 'lighton-tooltip__title';
    title.textContent = registry.getLocalizedText(pattern.name, currentLang);
    header.appendChild(title);

    const severity = document.createElement('span');
    severity.className = `lighton-tooltip__severity lighton-tooltip__severity--${pattern.severity}`;
    severity.textContent = getSeverityLabel(pattern.severity);
    header.appendChild(severity);

    tooltip.appendChild(header);

    // Description
    const description = document.createElement('div');
    description.className = 'lighton-tooltip__description';
    description.textContent = registry.getLocalizedText(pattern.description, currentLang);
    tooltip.appendChild(description);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'lighton-tooltip__footer';
    footer.textContent = currentLang === 'ko' ? 'LightOn으로 탐지됨' : 'Detected by LightOn';
    tooltip.appendChild(footer);

    return tooltip;
  }

  /**
   * Get localized severity label
   */
  function getSeverityLabel(severity) {
    const labels = {
      low: { ko: '낮음', en: 'Low' },
      medium: { ko: '중간', en: 'Medium' },
      high: { ko: '높음', en: 'High' }
    };
    return labels[severity]?.[currentLang] || severity;
  }

  /**
   * Show tooltip near an element
   */
  function showTooltip(pattern, targetElement, badge) {
    // Hide any existing tooltip
    hideActiveTooltip();

    const tooltip = createTooltip(pattern);
    document.body.appendChild(tooltip);

    // Position tooltip below the badge
    const badgeRect = badge.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = badgeRect.bottom + 8 + window.scrollY;
    let left = badgeRect.left + window.scrollX;

    // Adjust if tooltip would go off-screen
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 16;
    }
    if (left < 16) {
      left = 16;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    // Animate in
    requestAnimationFrame(() => {
      tooltip.classList.add('lighton-tooltip--visible');
    });

    activeTooltip = tooltip;

    // Close on click outside
    const closeHandler = (e) => {
      if (!tooltip.contains(e.target) && !badge.contains(e.target)) {
        hideActiveTooltip();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  /**
   * Hide the active tooltip
   */
  function hideActiveTooltip() {
    if (activeTooltip) {
      activeTooltip.classList.remove('lighton-tooltip--visible');
      setTimeout(() => {
        activeTooltip?.remove();
        activeTooltip = null;
      }, 200);
    }
  }

  /**
   * Apply outline highlight to an element
   */
  function applyOutline(element, pattern) {
    element.classList.add('lighton-detected', 'lighton-outline', `lighton-outline--${pattern.severity}`);
    element.setAttribute('data-lighton-pattern', pattern.id);
  }

  /**
   * Apply dot indicator to an element
   */
  function applyDot(element, pattern) {
    // Check if element can contain the dot properly
    const computedStyle = window.getComputedStyle(element);
    const isInline = computedStyle.display === 'inline' ||
                     computedStyle.display === 'inline-block' ||
                     element.tagName === 'A' ||
                     element.tagName === 'SPAN';

    element.classList.add('lighton-detected');
    element.setAttribute('data-lighton-pattern', pattern.id);

    const dot = createDot(pattern, element);

    if (isInline) {
      // For inline elements, insert dot after the element
      dot.classList.add('lighton-dot--inline');
      element.parentNode.insertBefore(dot, element.nextSibling);
    } else {
      // For block elements, position absolutely
      if (computedStyle.position === 'static') {
        element.style.position = 'relative';
      }
      element.appendChild(dot);
    }

    // Store reference for cleanup
    if (!highlightElements.has(element)) {
      highlightElements.set(element, []);
    }
    highlightElements.get(element).push(dot);
  }

  /**
   * Apply badge highlight to an element (legacy - now uses dot)
   */
  function applyBadge(element, pattern) {
    applyDot(element, pattern);
  }

  /**
   * Highlight a detected pattern
   */
  function highlight(detection) {
    const { element, pattern } = detection;

    if (!element || !pattern) {
      console.warn('[LightOn] Invalid detection:', detection);
      return;
    }

    // Skip if already highlighted with this pattern
    if (element.getAttribute('data-lighton-pattern') === pattern.id) {
      return;
    }

    const style = pattern.highlight?.style || 'badge';

    switch (style) {
      case 'outline':
        applyOutline(element, pattern);
        applyBadge(element, pattern);  // Also add badge for interactivity
        break;
      case 'badge':
        applyBadge(element, pattern);
        break;
      case 'tooltip':
        // Tooltip style just adds a subtle outline, tooltip shows on hover
        applyOutline(element, pattern);
        break;
      default:
        applyBadge(element, pattern);
    }
  }

  /**
   * Highlight multiple detections
   */
  function highlightAll(detections) {
    for (const detection of detections) {
      highlight(detection);
    }
  }

  /**
   * Remove highlight from an element
   */
  function removeHighlight(element) {
    // Remove classes
    element.classList.remove(
      'lighton-detected',
      'lighton-outline',
      'lighton-outline--low',
      'lighton-outline--medium',
      'lighton-outline--high'
    );

    // Remove data attribute
    element.removeAttribute('data-lighton-pattern');

    // Remove dot/badge elements
    if (highlightElements.has(element)) {
      const indicators = highlightElements.get(element);
      for (const indicator of indicators) {
        indicator.remove();
      }
      highlightElements.delete(element);
    }

    // Remove any dots/badges that might have been added
    const dots = element.querySelectorAll('[data-lighton-dot]');
    dots.forEach(dot => dot.remove());

    // Also check for inline dots after the element
    if (element.nextSibling && element.nextSibling.classList?.contains('lighton-dot--inline')) {
      element.nextSibling.remove();
    }
  }

  /**
   * Remove all highlights
   */
  function clearAll() {
    // Remove all highlight classes and indicators
    const highlighted = document.querySelectorAll('.lighton-detected');
    highlighted.forEach(removeHighlight);

    // Remove any orphaned dots/tooltips
    document.querySelectorAll('[data-lighton-dot], [data-lighton-tooltip], .lighton-dot').forEach(el => el.remove());

    // Clear storage
    highlightElements.clear();

    // Hide tooltips
    hideActiveTooltip();
    hideHoverTooltip();
  }

  /**
   * Create the indicator bar showing detection counts
   */
  function createIndicator(stats) {
    // Remove existing indicator
    const existing = document.querySelector('.lighton-indicator');
    if (existing) existing.remove();

    if (stats.total === 0) return null;

    const indicator = document.createElement('div');
    indicator.className = 'lighton-indicator lighton-fade-in';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');

    // Just show total count with colored dot
    const dot = document.createElement('span');
    dot.className = 'lighton-indicator__dot';

    // Color based on highest severity
    if (stats.bySeverity.high > 0) {
      dot.classList.add('lighton-indicator__dot--high');
    } else if (stats.bySeverity.medium > 0) {
      dot.classList.add('lighton-indicator__dot--medium');
    } else {
      dot.classList.add('lighton-indicator__dot--low');
    }
    indicator.appendChild(dot);

    // Total count
    const count = document.createElement('span');
    count.className = 'lighton-indicator__total';
    count.textContent = stats.total;
    indicator.appendChild(count);

    document.body.appendChild(indicator);

    return indicator;
  }

  /**
   * Remove the indicator bar
   */
  function removeIndicator() {
    const indicator = document.querySelector('.lighton-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Set the current language
   */
  function setLanguage(lang) {
    currentLang = lang;
  }

  /**
   * Enable/disable all highlights
   */
  function setEnabled(enabled) {
    document.body.classList.toggle('lighton-disabled', !enabled);
  }

  /**
   * Scroll to and focus on a specific element with highlight animation
   */
  function focusElement(element) {
    if (!element) return;

    // Hide any active tooltip first
    hideActiveTooltip();

    // Create overlay for dimming effect
    const overlay = document.createElement('div');
    overlay.className = 'lighton-focus-overlay';
    document.body.appendChild(overlay);

    // Scroll element into view with smooth animation
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    // Add focus class after scroll starts
    setTimeout(() => {
      element.classList.add('lighton-focus');
    }, 100);

    // Remove focus class and overlay after animation
    setTimeout(() => {
      element.classList.remove('lighton-focus');
      overlay.remove();
    }, 1600);
  }

  /**
   * Get element by its unique lighton ID
   */
  function getElementByLightOnId(id) {
    return document.querySelector(`[data-lighton-id="${id}"]`);
  }

  // Public API
  return {
    highlight,
    highlightAll,
    removeHighlight,
    clearAll,
    createIndicator,
    removeIndicator,
    setLanguage,
    setEnabled,
    hideActiveTooltip,
    focusElement,
    getElementByLightOnId
  };
})();
