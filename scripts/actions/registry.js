/**
 * LightOn Action Registry
 *
 * Centralizes all action configurations for dark patterns.
 * Single source of truth for available actions, auto-apply settings,
 * and readability fix configurations.
 */

window.LightOn = window.LightOn || {};

window.LightOn.ActionRegistry = (function() {
  'use strict';

  /**
   * Action configuration for each pattern
   *
   * Schema:
   * {
   *   available: string[]       - List of available action types
   *   primary: string           - Primary/default action (optional)
   *   autoApply: {
   *     enabled: boolean        - Whether to auto-apply on detection
   *     action: string          - Which action to auto-apply
   *   }
   *   readabilityFix: {
   *     enabled: boolean        - Whether to apply readability fixes
   *     fontSize: number        - Minimum font size (optional)
   *     contrastFix: boolean    - Whether to apply contrast fix (optional)
   *   }
   * }
   */
  const actionConfig = {
    // Interface patterns
    'asymmetric-buttons': {
      available: [],
      primary: null,
      autoApply: { enabled: false },
      readabilityFix: { enabled: true }
    },
    'preselected-checkbox': {
      available: ['uncheck'],
      primary: 'uncheck',
      autoApply: { enabled: true, action: 'uncheck' },
      readabilityFix: { enabled: false }
    },
    'hidden-cancel': {
      available: ['emphasize'],
      primary: 'emphasize',
      autoApply: { enabled: false },
      readabilityFix: { enabled: true, fontSize: 18, contrastFix: true }
    },
    'visual-hierarchy-manipulation': {
      available: ['equalize', 'neutralize'],
      primary: 'equalize',
      autoApply: { enabled: false },  // Disabled to prevent font breaking
      readabilityFix: { enabled: false }
    },
    'ambiguous-button': {
      available: ['emphasize'],
      primary: 'emphasize',
      autoApply: { enabled: false },
      readabilityFix: { enabled: false }
    },

    // Sneaking patterns
    'small-print': {
      available: ['enlarge'],
      primary: 'enlarge',
      autoApply: { enabled: false },
      readabilityFix: { enabled: true, fontSize: 18 }
    },
    'hidden-cost': {
      available: ['emphasize'],
      primary: 'emphasize',
      autoApply: { enabled: false },
      readabilityFix: { enabled: true, contrastFix: true }
    },
    'auto-add-cart': {
      available: ['uncheck'],
      primary: 'uncheck',
      autoApply: { enabled: true, action: 'uncheck' },
      readabilityFix: { enabled: false }
    },
    'free-trial-trap': {
      available: ['emphasize'],
      primary: 'emphasize',
      autoApply: { enabled: false },
      readabilityFix: { enabled: false }
    },
    'emotional-manipulation': {
      available: [],
      primary: null,
      autoApply: { enabled: false },
      readabilityFix: { enabled: false }
    }
  };

  /**
   * Default configuration for patterns not explicitly defined
   */
  const defaultConfig = {
    available: [],
    primary: null,
    autoApply: { enabled: false },
    readabilityFix: { enabled: false }
  };

  /**
   * Get configuration for a specific pattern
   * @param {string} patternId - Pattern identifier
   * @returns {Object} Action configuration
   */
  function getConfig(patternId) {
    return actionConfig[patternId] || defaultConfig;
  }

  /**
   * Get available actions for a pattern
   * @param {string} patternId - Pattern identifier
   * @returns {string[]} List of available action types
   */
  function getAvailableActions(patternId) {
    const config = actionConfig[patternId];
    return config?.available || defaultConfig.available;
  }

  /**
   * Get primary action for a pattern
   * @param {string} patternId - Pattern identifier
   * @returns {string} Primary action type
   */
  function getPrimaryAction(patternId) {
    const config = actionConfig[patternId];
    return config?.primary || config?.available?.[0] || defaultConfig.primary;
  }

  /**
   * Get all patterns that should have auto-apply enabled
   * @returns {Array<{patternId: string, action: string}>}
   */
  function getAutoApplyPatterns() {
    return Object.entries(actionConfig)
      .filter(([_, cfg]) => cfg.autoApply?.enabled)
      .map(([id, cfg]) => ({
        patternId: id,
        action: cfg.autoApply.action
      }));
  }

  /**
   * Check if auto-apply is enabled for a pattern
   * @param {string} patternId - Pattern identifier
   * @returns {boolean}
   */
  function isAutoApplyEnabled(patternId) {
    return actionConfig[patternId]?.autoApply?.enabled || false;
  }

  /**
   * Get auto-apply action for a pattern
   * @param {string} patternId - Pattern identifier
   * @returns {string|null} Action to auto-apply, or null if disabled
   */
  function getAutoApplyAction(patternId) {
    const config = actionConfig[patternId];
    if (config?.autoApply?.enabled) {
      return config.autoApply.action;
    }
    return null;
  }

  /**
   * Get all pattern IDs that should have readability fixes applied
   * @returns {string[]} List of pattern IDs
   */
  function getReadabilityFixPatterns() {
    return Object.keys(actionConfig)
      .filter(id => actionConfig[id].readabilityFix?.enabled);
  }

  /**
   * Check if readability fix should be applied for a pattern
   * @param {string} patternId - Pattern identifier
   * @returns {boolean}
   */
  function shouldApplyReadabilityFix(patternId) {
    return actionConfig[patternId]?.readabilityFix?.enabled || false;
  }

  /**
   * Get readability fix configuration for a pattern
   * @param {string} patternId - Pattern identifier
   * @returns {Object|null} Readability fix config or null
   */
  function getReadabilityFixConfig(patternId) {
    const config = actionConfig[patternId];
    if (config?.readabilityFix?.enabled) {
      return config.readabilityFix;
    }
    return null;
  }

  /**
   * Get all registered pattern IDs in the action registry
   * @returns {string[]}
   */
  function getAllPatternIds() {
    return Object.keys(actionConfig);
  }

  /**
   * Check if a pattern has custom action configuration
   * @param {string} patternId - Pattern identifier
   * @returns {boolean}
   */
  function hasConfig(patternId) {
    return patternId in actionConfig;
  }

  // Public API
  return {
    getConfig,
    getAvailableActions,
    getPrimaryAction,
    getAutoApplyPatterns,
    isAutoApplyEnabled,
    getAutoApplyAction,
    getReadabilityFixPatterns,
    shouldApplyReadabilityFix,
    getReadabilityFixConfig,
    getAllPatternIds,
    hasConfig
  };
})();
