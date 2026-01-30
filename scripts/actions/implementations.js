/**
 * LightOn Action Implementations
 *
 * Pure implementation functions for each action type.
 * Each function takes an element and returns an action result with restore function.
 */

window.LightOn = window.LightOn || {};

window.LightOn.ActionImplementations = (function() {
  'use strict';

  /**
   * Get localized action labels
   * @param {string} lang - Language code ('ko' or 'en')
   * @returns {Object} Label mappings
   */
  function getActionLabels(lang = 'ko') {
    const labels = {
      ko: {
        uncheck: '체크 해제',
        unchecked: '체크 해제됨',
        neutralize: '중립화',
        neutralized: '중립화됨',
        equalize: '균등하게 만들기',
        equalized: '균등하게 됨',
        emphasize: '강조하기',
        emphasized: '강조됨',
        enlarge: '확대하기',
        enlarged: '확대됨',
        remove: '제거하기',
        removed: '제거됨',
        hide: '숨기기',
        hidden: '숨김',
        undo: '되돌리기'
      },
      en: {
        uncheck: 'Uncheck',
        unchecked: 'Unchecked',
        neutralize: 'Neutralize',
        neutralized: 'Neutralized',
        equalize: 'Equalize',
        equalized: 'Equalized',
        emphasize: 'Emphasize',
        emphasized: 'Emphasized',
        enlarge: 'Enlarge',
        enlarged: 'Enlarged',
        remove: 'Remove',
        removed: 'Removed',
        hide: 'Hide',
        hidden: 'Hidden',
        undo: 'Undo'
      }
    };
    return labels[lang] || labels.en;
  }

  /**
   * Action: Uncheck preselected checkboxes
   * @param {HTMLElement} element - Checkbox element
   * @returns {Object|null} Action result with restore function
   */
  function uncheckCheckbox(element) {
    if (element.tagName === 'INPUT' && element.type === 'checkbox') {
      const originalState = element.checked;
      element.checked = false;

      return {
        type: 'uncheck',
        element,
        restore: () => {
          element.checked = originalState;
        }
      };
    }
    return null;
  }

  /**
   * Action: Neutralize visual hierarchy (remove prominent styling)
   * @param {HTMLElement} element - Target element
   * @returns {Object|null} Action result with restore function
   */
  function neutralizeHierarchy(element) {
    const originalStyles = {
      transform: element.style.transform,
      boxShadow: element.style.boxShadow,
      border: element.style.border,
      borderWidth: element.style.borderWidth,
      borderColor: element.style.borderColor,
      backgroundColor: element.style.backgroundColor,
      scale: element.style.scale,
      zIndex: element.style.zIndex
    };

    // Remove prominent styling
    element.style.transform = 'none';
    element.style.boxShadow = 'none';
    element.style.scale = '1';

    // Normalize border
    const siblings = Array.from(element.parentElement?.children || []).filter(
      el => el !== element && el.nodeType === 1
    );

    if (siblings.length > 0) {
      const sibling = siblings[0];
      const siblingStyle = window.getComputedStyle(sibling);
      element.style.border = siblingStyle.border;
      element.style.borderWidth = siblingStyle.borderWidth;
      element.style.borderColor = siblingStyle.borderColor;
    } else {
      element.style.border = '1px solid #ddd';
    }

    // Remove or hide badge elements
    const badges = element.querySelectorAll('.badge, .ribbon, [class*="badge"], [class*="ribbon"], [class*="recommend"], [class*="featured"]');
    const badgeVisibility = [];
    badges.forEach(badge => {
      badgeVisibility.push(badge.style.display);
      badge.style.display = 'none';
    });

    // Mark as neutralized
    element.setAttribute('data-lighton-neutralized', 'true');

    return {
      type: 'neutralize',
      element,
      restore: () => {
        Object.assign(element.style, originalStyles);
        badges.forEach((badge, i) => {
          badge.style.display = badgeVisibility[i];
        });
        element.removeAttribute('data-lighton-neutralized');
      }
    };
  }

  /**
   * Action: Equalize visual hierarchy with siblings
   * Makes the emphasized element look identical to its siblings
   * @param {HTMLElement} element - Target element
   * @returns {Object|null} Action result with restore function
   */
  function equalizeVisualHierarchy(element) {
    // Find siblings in the same container
    const parent = element.parentElement;
    if (!parent) return null;

    const siblings = Array.from(parent.children).filter(
      el => el !== element && el.nodeType === 1 && !el.matches('script, style, br')
    );

    if (siblings.length === 0) {
      // No siblings, fall back to neutralize
      return neutralizeHierarchy(element);
    }

    // Store original styles for undo
    const originalStyles = {
      transform: element.style.transform,
      boxShadow: element.style.boxShadow,
      border: element.style.border,
      borderWidth: element.style.borderWidth,
      borderColor: element.style.borderColor,
      borderRadius: element.style.borderRadius,
      backgroundColor: element.style.backgroundColor,
      background: element.style.background,
      padding: element.style.padding,
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      flex: element.style.flex,
      scale: element.style.scale,
      zIndex: element.style.zIndex,
      position: element.style.position
    };

    // Calculate average styles from siblings
    const siblingStyles = siblings.map(sib => window.getComputedStyle(sib));

    // Get first sibling's styles as reference (most common case)
    const refStyle = siblingStyles[0];

    // Apply equalized styles
    element.style.transform = 'none';
    element.style.boxShadow = refStyle.boxShadow === 'none' ? 'none' : refStyle.boxShadow;
    element.style.border = refStyle.border;
    element.style.borderWidth = refStyle.borderWidth;
    element.style.borderColor = refStyle.borderColor;
    element.style.borderRadius = refStyle.borderRadius;
    element.style.scale = '1';
    element.style.zIndex = 'auto';

    // Match background (use neutral if sibling has no special background)
    const sibBgColor = refStyle.backgroundColor;
    if (sibBgColor && sibBgColor !== 'rgba(0, 0, 0, 0)') {
      element.style.backgroundColor = sibBgColor;
      element.style.background = refStyle.background;
    } else {
      element.style.backgroundColor = '#fff';
      element.style.background = 'none';
    }

    // Match padding
    element.style.padding = refStyle.padding;

    // Match size (flex properties)
    element.style.flex = refStyle.flex || '1';

    // Remove badges and ribbons
    const badges = element.querySelectorAll(
      '.badge, .ribbon, .tag, .label, ' +
      '[class*="badge"], [class*="ribbon"], [class*="recommend"], ' +
      '[class*="featured"], [class*="popular"], [class*="best"]'
    );
    const badgeOriginalStyles = [];
    badges.forEach(badge => {
      badgeOriginalStyles.push({
        element: badge,
        display: badge.style.display,
        visibility: badge.style.visibility
      });
      badge.style.display = 'none';
    });

    // Also hide absolutely positioned child elements that look like badges
    const absoluteChildren = element.querySelectorAll('[style*="position: absolute"], [style*="position:absolute"]');
    const absoluteOriginalStyles = [];
    absoluteChildren.forEach(child => {
      // Check if it looks like a badge (small, positioned at top/corner)
      const rect = child.getBoundingClientRect();
      const parentRect = element.getBoundingClientRect();
      if (rect.width < parentRect.width * 0.5 && rect.height < 50) {
        absoluteOriginalStyles.push({
          element: child,
          display: child.style.display
        });
        child.style.display = 'none';
      }
    });

    // Mark as equalized
    element.setAttribute('data-lighton-equalized', 'true');
    element.classList.add('lighton-equalized');

    console.log('[LightOn] Visual hierarchy equalized:', {
      element,
      originalStyles,
      newStyles: {
        transform: element.style.transform,
        boxShadow: element.style.boxShadow,
        border: element.style.border,
        padding: element.style.padding
      }
    });

    return {
      type: 'equalize',
      element,
      restore: () => {
        Object.assign(element.style, originalStyles);
        badgeOriginalStyles.forEach(({ element: badge, display, visibility }) => {
          badge.style.display = display;
          badge.style.visibility = visibility;
        });
        absoluteOriginalStyles.forEach(({ element: child, display }) => {
          child.style.display = display;
        });
        element.removeAttribute('data-lighton-equalized');
        element.classList.remove('lighton-equalized');
      }
    };
  }

  /**
   * Action: Equalize button sizes and colors
   * Makes asymmetric buttons have equal visual weight
   * @param {HTMLElement} element - Button or container element
   * @returns {Object|null} Action result with restore function
   */
  function equalizeButtons(element) {
    // Find the modal/dialog container
    const parent = element.closest('[role="dialog"], [role="alertdialog"], .modal, [class*="modal"], [class*="popup"], [class*="dialog"], form')
      || element.parentElement;
    if (!parent) return null;

    // Find all clickable elements: buttons, links, and any role="button" elements
    const clickables = parent.querySelectorAll(
      'button, [role="button"], a, input[type="submit"], input[type="button"], ' +
      '[class*="btn"], [class*="button"], [onclick]'
    );

    // Filter to only include visible interactive elements
    const buttons = Array.from(clickables).filter(el => {
      const style = window.getComputedStyle(el);
      const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
      const hasText = el.textContent?.trim().length > 0;
      const isInteractive = el.tagName === 'BUTTON' || el.tagName === 'A' ||
        el.tagName === 'INPUT' || el.getAttribute('role') === 'button' ||
        el.onclick || el.classList.toString().includes('btn');
      return isVisible && hasText && isInteractive;
    });

    if (buttons.length < 2) return null;

    // Store original styles for undo
    const originalStyles = buttons.map(btn => ({
      element: btn,
      cssText: btn.style.cssText,
      className: btn.className
    }));

    // Get font info from the most prominent button to preserve font family
    const computedStyles = buttons.map(btn => window.getComputedStyle(btn));
    const fontFamily = computedStyles[0].fontFamily;

    // Calculate button dimensions
    const sizes = buttons.map(btn => ({
      width: btn.offsetWidth,
      height: btn.offsetHeight,
      fontSize: parseFloat(window.getComputedStyle(btn).fontSize)
    }));

    // Use MAXIMUM size so all buttons match the largest one
    const maxWidth = Math.max(...sizes.map(s => s.width));
    const maxHeight = Math.max(...sizes.map(s => s.height));
    const maxFontSize = Math.max(...sizes.map(s => s.fontSize));

    // Equalized style - same size for all buttons
    const equalizedStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: `${maxWidth}px`,
      minHeight: `${maxHeight}px`,
      padding: '12px 24px',
      margin: '8px',
      fontFamily: fontFamily,
      fontSize: `${maxFontSize}px`,
      fontWeight: '500',
      lineHeight: '1.4',
      textAlign: 'center',
      textDecoration: 'none',
      cursor: 'pointer',
      borderRadius: '8px',
      boxSizing: 'border-box',
      transition: 'background-color 0.2s, border-color 0.2s'
    };

    // Apply equalized styles with alternating colors for distinction
    buttons.forEach((btn, index) => {
      // Apply base equalized styles
      Object.assign(btn.style, equalizedStyle);

      // Apply color scheme - both options should be equally visible
      if (index % 2 === 0) {
        // Primary style - original purple solid
        btn.style.backgroundColor = '#6366F1';
        btn.style.color = '#FFFFFF';
        btn.style.border = '2px solid #6366F1';
      } else {
        // Secondary style - complementary teal
        btn.style.backgroundColor = '#0D9488';
        btn.style.color = '#FFFFFF';
        btn.style.border = '2px solid #0D9488';
      }

      // Ensure button-like appearance for links
      if (btn.tagName === 'A') {
        btn.style.display = 'inline-flex';
      }

      btn.setAttribute('data-lighton-equalized', 'true');
      btn.classList.add('lighton-equalized-btn');
    });

    // If buttons are in a flex container, ensure they're laid out properly
    const buttonContainer = buttons[0].parentElement;
    if (buttonContainer && buttons.every(b => b.parentElement === buttonContainer)) {
      const originalContainerStyle = buttonContainer.style.cssText;
      buttonContainer.style.display = 'flex';
      buttonContainer.style.flexWrap = 'wrap';
      buttonContainer.style.gap = '12px';
      buttonContainer.style.justifyContent = 'center';
      buttonContainer.style.alignItems = 'center';

      // Store for undo
      originalStyles.push({
        element: buttonContainer,
        cssText: originalContainerStyle,
        isContainer: true
      });
    }

    console.log('[LightOn] Buttons equalized:', {
      count: buttons.length,
      buttons: buttons.map(b => b.textContent?.trim())
    });

    return {
      type: 'equalize',
      element,
      restore: () => {
        originalStyles.forEach(({ element: el, cssText, className, isContainer }) => {
          el.style.cssText = cssText;
          if (className !== undefined) {
            el.className = className;
          }
          if (!isContainer) {
            el.removeAttribute('data-lighton-equalized');
            el.classList.remove('lighton-equalized-btn');
          }
        });
      }
    };
  }

  /**
   * Action: Emphasize hidden elements (increase visibility)
   * @param {HTMLElement} element - Target element
   * @returns {Object|null} Action result with restore function
   */
  function emphasizeHidden(element) {
    const originalStyles = {
      fontSize: element.style.fontSize,
      color: element.style.color,
      fontWeight: element.style.fontWeight,
      backgroundColor: element.style.backgroundColor,
      padding: element.style.padding,
      border: element.style.border
    };

    // Make more visible
    element.style.fontSize = Math.max(14, parseFloat(window.getComputedStyle(element).fontSize) * 1.5) + 'px';
    element.style.color = '#000';
    element.style.fontWeight = '600';
    element.style.backgroundColor = '#FFF9C4';
    element.style.padding = '8px';
    element.style.border = '2px solid #FFC107';
    element.setAttribute('data-lighton-emphasized', 'true');

    return {
      type: 'emphasize',
      element,
      restore: () => {
        Object.assign(element.style, originalStyles);
        element.removeAttribute('data-lighton-emphasized');
      }
    };
  }

  /**
   * Action: Enlarge small text
   * @param {HTMLElement} element - Target element
   * @returns {Object|null} Action result with restore function
   */
  function enlargeText(element) {
    const originalFontSize = element.style.fontSize;
    const currentSize = parseFloat(window.getComputedStyle(element).fontSize);
    const newSize = Math.max(14, currentSize * 1.5);

    element.style.fontSize = newSize + 'px';
    element.setAttribute('data-lighton-enlarged', 'true');

    return {
      type: 'enlarge',
      element,
      restore: () => {
        element.style.fontSize = originalFontSize;
        element.removeAttribute('data-lighton-enlarged');
      }
    };
  }

  /**
   * Action: Hide element
   * @param {HTMLElement} element - Target element
   * @returns {Object|null} Action result with restore function
   */
  function hideElement(element) {
    const originalDisplay = element.style.display;
    element.style.display = 'none';
    element.setAttribute('data-lighton-hidden', 'true');

    return {
      type: 'hide',
      element,
      restore: () => {
        element.style.display = originalDisplay;
        element.removeAttribute('data-lighton-hidden');
      }
    };
  }

  // Public API
  return {
    getActionLabels,
    uncheckCheckbox,
    neutralizeHierarchy,
    equalizeVisualHierarchy,
    equalizeButtons,
    emphasizeHidden,
    enlargeText,
    hideElement
  };
})();
