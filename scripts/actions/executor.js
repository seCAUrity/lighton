/**
 * LightOn Action Executor
 *
 * Handles action execution, undo functionality, and action management.
 * Uses ActionRegistry for configuration and ActionImplementations for actual work.
 */

window.LightOn = window.LightOn || {};

window.LightOn.Actions = (function() {
  'use strict';

  // Track applied actions for undo functionality
  const appliedActions = new Map();

  // Track previewing state
  let previewingActionId = null;

  // Get dependencies
  function getRegistry() {
    return window.LightOn.ActionRegistry;
  }

  function getImplementations() {
    return window.LightOn.ActionImplementations;
  }

  /**
   * Execute an action based on pattern ID and action type
   * @param {string} patternId - Pattern identifier
   * @param {HTMLElement} element - Target element
   * @param {string} actionType - Action type to execute
   * @returns {Object|null} Action result with actionId and restore function
   */
  function executeAction(patternId, element, actionType) {
    if (!element) return null;

    const Registry = getRegistry();
    const Impl = getImplementations();

    // Validate action is available for this pattern
    const availableActions = Registry.getAvailableActions(patternId);
    if (!availableActions.includes(actionType) && actionType !== 'hide') {
      console.warn(`[LightOn] Action "${actionType}" not available for pattern "${patternId}"`);
      return null;
    }

    let result = null;

    // Execute the appropriate implementation based on action type
    switch (actionType) {
      case 'uncheck':
        result = Impl.uncheckCheckbox(element);
        break;

      case 'equalize':
        result = Impl.equalizeVisualHierarchy(element);
        break;

      case 'neutralize':
        result = Impl.neutralizeHierarchy(element);
        break;

      case 'emphasize':
        result = Impl.emphasizeHidden(element);
        break;

      case 'enlarge':
        result = Impl.enlargeText(element);
        break;

      case 'hide':
        result = Impl.hideElement(element);
        break;

      default:
        console.warn(`[LightOn] Unknown action type: ${actionType}`);
        return null;
    }

    // Store action for undo
    if (result) {
      const actionId = `${patternId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      result.actionId = actionId;
      result.patternId = patternId;
      result.actionType = actionType;
      appliedActions.set(actionId, result);

      // Store actionId on element for highlighter access
      element.setAttribute('data-lighton-action-id', actionId);
    }

    return result;
  }

  /**
   * Preview the original state (before action was applied)
   * Used for hover preview on dots
   * @param {string} actionId - Action ID to preview
   * @returns {boolean} Whether preview started successfully
   */
  function previewOriginal(actionId) {
    // Already previewing this action
    if (previewingActionId === actionId) return true;

    // End any existing preview
    if (previewingActionId) {
      endPreview();
    }

    const action = appliedActions.get(actionId);
    if (action && action.restore) {
      // Temporarily restore original state
      action.restore();
      previewingActionId = actionId;
      return true;
    }
    return false;
  }

  /**
   * End preview and re-apply the action
   * @returns {boolean} Whether action was re-applied
   */
  function endPreview() {
    if (!previewingActionId) return false;

    const action = appliedActions.get(previewingActionId);
    if (!action) {
      previewingActionId = null;
      return false;
    }

    const { patternId, element, actionType } = action;
    previewingActionId = null;

    // Re-apply the action (need to execute again)
    if (element && patternId && actionType) {
      const Impl = getImplementations();
      let newResult = null;

      switch (actionType) {
        case 'uncheck':
          newResult = Impl.uncheckCheckbox(element);
          break;
        case 'equalize':
          newResult = Impl.equalizeVisualHierarchy(element);
          break;
        case 'neutralize':
          newResult = Impl.neutralizeHierarchy(element);
          break;
        case 'emphasize':
          newResult = Impl.emphasizeHidden(element);
          break;
        case 'enlarge':
          newResult = Impl.enlargeText(element);
          break;
        case 'hide':
          newResult = Impl.hideElement(element);
          break;
      }

      // Update stored action with new restore function
      if (newResult) {
        newResult.actionId = action.actionId;
        newResult.patternId = patternId;
        newResult.actionType = actionType;
        appliedActions.set(action.actionId, newResult);
      }

      return true;
    }
    return false;
  }

  /**
   * Check if currently previewing
   * @returns {boolean}
   */
  function isPreviewing() {
    return previewingActionId !== null;
  }

  /**
   * Execute the primary (default) action for a pattern
   * @param {string} patternId - Pattern identifier
   * @param {HTMLElement} element - Target element
   * @returns {Object|null} Action result
   */
  function executePrimaryAction(patternId, element) {
    const Registry = getRegistry();
    const primaryAction = Registry.getPrimaryAction(patternId);
    return executeAction(patternId, element, primaryAction);
  }

  /**
   * Undo an action
   * @param {string} actionId - Action ID to undo
   * @returns {boolean} Whether undo was successful
   */
  function undoAction(actionId) {
    const action = appliedActions.get(actionId);
    if (action && action.restore) {
      action.restore();
      appliedActions.delete(actionId);
      return true;
    }
    return false;
  }

  /**
   * Get available actions for a pattern
   * Delegates to ActionRegistry
   * @param {string} patternId - Pattern identifier
   * @returns {string[]} List of available action types
   */
  function getAvailableActions(patternId) {
    const Registry = getRegistry();
    return Registry.getAvailableActions(patternId);
  }

  /**
   * Apply action to all instances of a pattern
   * @param {string} patternId - Pattern identifier
   * @param {HTMLElement[]} elements - Array of elements
   * @param {string} actionType - Action type to apply
   * @returns {Object[]} Array of action results
   */
  function applyToAll(patternId, elements, actionType) {
    const results = [];
    for (const element of elements) {
      const result = executeAction(patternId, element, actionType);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  /**
   * Clear all applied actions (undo all)
   */
  function clearAll() {
    appliedActions.forEach(action => {
      if (action.restore) {
        action.restore();
      }
    });
    appliedActions.clear();
  }

  /**
   * Get count of applied actions
   * @returns {number}
   */
  function getAppliedCount() {
    return appliedActions.size;
  }

  /**
   * Get all applied action IDs
   * @returns {string[]}
   */
  function getAppliedActionIds() {
    return Array.from(appliedActions.keys());
  }

  /**
   * Get localized action labels
   * Delegates to ActionImplementations
   * @param {string} lang - Language code
   * @returns {Object}
   */
  function getActionLabels(lang = 'ko') {
    const Impl = getImplementations();
    return Impl.getActionLabels(lang);
  }

  // Public API
  return {
    executeAction,
    executePrimaryAction,
    undoAction,
    getAvailableActions,
    applyToAll,
    clearAll,
    getAppliedCount,
    getAppliedActionIds,
    getActionLabels,
    // Preview functionality
    previewOriginal,
    endPreview,
    isPreviewing
  };
})();
