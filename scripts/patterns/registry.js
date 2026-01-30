/**
 * LightOn Pattern Registry
 *
 * Central registry for all dark pattern definitions.
 * Patterns are automatically loaded and registered here.
 */

window.LightOn = window.LightOn || {};

window.LightOn.PatternRegistry = (function() {
  'use strict';

  // All registered patterns
  const patterns = [];

  // Pattern categories
  const CATEGORIES = {
    INTERFACE: 'interface',      // 인터페이스 조작
    SNEAKING: 'sneaking',        // 규정의 숨김
    OBSTRUCTION: 'obstruction',  // 경로의 방해
    NAGGING: 'nagging',          // 반복적 간섭
    SOCIAL: 'social',            // 사회적 증거 조작
    FORCED: 'forced'             // 행동의 강요
  };

  // Severity levels
  const SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  };

  // Detector types
  const DETECTOR_TYPES = {
    TEXT: 'text',           // Text pattern matching
    SELECTOR: 'selector',   // CSS selector matching
    VISUAL: 'visual',       // Visual element analysis
    COMBINED: 'combined'    // Multiple conditions
  };

  // Highlight styles
  const HIGHLIGHT_STYLES = {
    OUTLINE: 'outline',
    BADGE: 'badge',
    TOOLTIP: 'tooltip'
  };

  /**
   * Validate a pattern definition
   * @param {Object} pattern - Pattern to validate
   * @returns {boolean} - Whether the pattern is valid
   */
  function validatePattern(pattern) {
    const required = ['id', 'category', 'name', 'description', 'severity', 'detectors', 'highlight'];

    for (const field of required) {
      if (!pattern[field]) {
        console.warn(`[LightOn] Pattern missing required field: ${field}`, pattern);
        return false;
      }
    }

    if (!pattern.name.ko && !pattern.name.en) {
      console.warn(`[LightOn] Pattern must have at least one name translation`, pattern);
      return false;
    }

    if (!Array.isArray(pattern.detectors) || pattern.detectors.length === 0) {
      console.warn(`[LightOn] Pattern must have at least one detector`, pattern);
      return false;
    }

    return true;
  }

  /**
   * Register a single pattern
   * @param {Object} pattern - Pattern definition
   * @returns {boolean} - Success status
   */
  function register(pattern) {
    if (!validatePattern(pattern)) {
      return false;
    }

    // Check for duplicates
    if (patterns.some(p => p.id === pattern.id)) {
      console.warn(`[LightOn] Pattern already registered: ${pattern.id}`);
      return false;
    }

    patterns.push(pattern);
    console.log(`[LightOn] Registered pattern: ${pattern.id}`);
    return true;
  }

  /**
   * Register multiple patterns at once
   * @param {Array} patternList - Array of pattern definitions
   * @returns {number} - Number of successfully registered patterns
   */
  function registerAll(patternList) {
    let count = 0;
    for (const pattern of patternList) {
      if (register(pattern)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all registered patterns
   * @returns {Array} - All patterns
   */
  function getAll() {
    return [...patterns];
  }

  /**
   * Get patterns by category
   * @param {string} category - Category to filter by
   * @returns {Array} - Matching patterns
   */
  function getByCategory(category) {
    return patterns.filter(p => p.category === category);
  }

  /**
   * Get a pattern by ID
   * @param {string} id - Pattern ID
   * @returns {Object|null} - Pattern or null
   */
  function getById(id) {
    return patterns.find(p => p.id === id) || null;
  }

  /**
   * Get patterns by severity
   * @param {string} severity - Severity level
   * @returns {Array} - Matching patterns
   */
  function getBySeverity(severity) {
    return patterns.filter(p => p.severity === severity);
  }

  /**
   * Get pattern count
   * @returns {number} - Total pattern count
   */
  function count() {
    return patterns.length;
  }

  /**
   * Get localized text based on current language
   * @param {Object} textObj - Object with ko/en keys
   * @param {string} lang - Language code (default: 'ko')
   * @returns {string} - Localized text
   */
  function getLocalizedText(textObj, lang = 'ko') {
    return textObj[lang] || textObj.en || textObj.ko || '';
  }

  // Public API
  return {
    CATEGORIES,
    SEVERITY,
    DETECTOR_TYPES,
    HIGHLIGHT_STYLES,
    register,
    registerAll,
    getAll,
    getByCategory,
    getById,
    getBySeverity,
    count,
    getLocalizedText
  };
})();

// Shorthand alias
window.LightOnPatterns = window.LightOn.PatternRegistry;
