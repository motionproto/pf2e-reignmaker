/**
 * OutcomeDisplayController.ts
 * 
 * Manages business logic for OutcomeDisplay component.
 * Handles validation, state computation, and event handling.
 * 
 * Extracted from 650-line OutcomeDisplay.svelte to improve:
 * - Testability (business logic can be unit tested)
 * - Maintainability (clearer separation of concerns)
 * - Reusability (controller logic can be used elsewhere)
 */

import type { OutcomePreview } from '../../models/OutcomePreview';
import type { ResourceType } from '../../types/events';
import type { ResolutionData } from '../../types/modifiers';
import {
  getInstanceResolutionState,
  updateInstanceResolutionState,
  clearInstanceResolutionState
} from '../shared/ResolutionStateHelpers';
import {
  canRerollWithFame,
  deductFameForReroll
} from '../shared/RerollHelpers';

/**
 * Display state computed by controller
 * Contains all derived state that was previously in reactive statements
 */
export interface OutcomeDisplayState {
  // Interaction detection
  hasDiceModifiers: boolean;
  diceResolved: boolean;
  hasChoices: boolean;
  choicesResolved: boolean;
  hasChoiceModifiers: boolean;
  choiceModifiersResolved: boolean;
  hasCustomComponent: boolean;
  customComponentResolved: boolean;
  hasStateChangeDice: boolean;
  stateChangeDiceResolved: boolean;
  
  // Button states
  canApply: boolean;
  showCancelButton: boolean;
  showFameRerollButton: boolean;
  primaryButtonLabel: string;
  primaryButtonDisabled: boolean;
  
  // Display data
  displayEffect: string;
  displayStateChanges: Record<string, any>;
  effectiveChoices: any[];
  standaloneDiceModifiers: any[];
  choiceModifiers: any[];
  
  // Resolution state
  resolvedDice: Map<number | string, number>;
  selectedResources: Map<number, string>;
  selectedChoice: number | null;
  customComponentData: Record<string, any> | null;
  
  // Validation
  unresolvedProviders: any[];
  hasContent: boolean;
}

/**
 * Result from interaction handlers
 */
export interface InteractionResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * OutcomeDisplay Controller
 * 
 * Centralizes all business logic for outcome display and interaction handling.
 */
export class OutcomeDisplayController {
  private preview: OutcomePreview;
  
  constructor(preview: OutcomePreview) {
    this.preview = preview;
  }
  
  /**
   * Compute complete display state
   * Replaces 40+ reactive statements in component
   */
  computeDisplayState(
    validationContext: any,
    choiceResult: any,
    customSelectionData: any
  ): OutcomeDisplayState {
    // Get resolution state from instance
    const resolutionState = getInstanceResolutionState(this.preview);
    
    // Convert to Maps for easier access
    const resolvedDice = new Map(
      Object.entries(resolutionState.resolvedDice || {}).map(([k, v]) => {
        const key = k.startsWith('state:') ? k : (isNaN(Number(k)) ? k : Number(k));
        return [key, v];
      })
    );
    const selectedResources = new Map(
      Object.entries(resolutionState.selectedResources || {}).map(([k, v]) => [Number(k), v])
    );
    
    // Detect interactions
    const { hasDiceModifiers, standaloneDiceModifiers } = this.detectDiceModifiers();
    const diceResolved = hasDiceModifiers && standaloneDiceModifiers.every(m => 
      resolvedDice.has(m.originalIndex)
    );
    
    const { hasChoices, effectiveChoices } = this.detectChoices();
    const choicesResolved = hasChoices && resolutionState.selectedChoice !== null;
    
    const choiceModifiers = this.detectChoiceModifiers();
    const hasChoiceModifiers = choiceModifiers.length > 0;
    const choiceModifiersResolved = hasChoiceModifiers && choiceModifiers.every(m => 
      selectedResources.has(m.originalIndex)
    );
    
    const hasCustomComponent = !!(this.preview.appliedOutcome?.customComponent);
    const customComponentResolved = this.validateCustomComponentResolution(
      hasCustomComponent,
      choiceResult,
      resolutionState.customComponentData,
      customSelectionData
    );
    
    const { hasStateChangeDice, stateChangeDiceResolved } = this.detectStateChangeDice(resolvedDice);
    
    // Compute button states
    const applied = this.preview.status === 'applied' || !!(this.preview.appliedOutcome?.effectsApplied);
    const isIgnored = false; // Not tracked in OutcomePreview model
    const hasAnyResolutionState = resolutionState.selectedChoice !== null || 
      resolvedDice.size > 0 || 
      selectedResources.size > 0;
    
    const showCancelButton = !applied && !isIgnored;
    const showFameRerollButton = !applied && !isIgnored && !hasAnyResolutionState;
    const primaryButtonLabel = applied ? '✓ Applied' : 'Apply Result';
    
    // Compute display data
    const displayEffect = this.computeDisplayEffect(choiceResult);
    const displayStateChanges = this.computeDisplayStateChanges(
      choiceResult,
      selectedResources,
      resolvedDice
    );
    
    // Validation
    const hasContent = this.validateHasContent();
    const unresolvedProviders = Array.from(validationContext.values()).filter(
      (p: any) => p.needsResolution && !p.isResolved
    );
    const contextValidationFails = unresolvedProviders.length > 0;
    
    const canApply = !applied && hasContent && !contextValidationFails;
    const primaryButtonDisabled = !canApply;
    
    return {
      hasDiceModifiers,
      diceResolved,
      hasChoices,
      choicesResolved,
      hasChoiceModifiers,
      choiceModifiersResolved,
      hasCustomComponent,
      customComponentResolved,
      hasStateChangeDice,
      stateChangeDiceResolved,
      
      canApply,
      showCancelButton,
      showFameRerollButton,
      primaryButtonLabel,
      primaryButtonDisabled,
      
      displayEffect,
      displayStateChanges,
      effectiveChoices,
      standaloneDiceModifiers,
      choiceModifiers,
      
      resolvedDice,
      selectedResources,
      selectedChoice: resolutionState.selectedChoice,
      customComponentData: resolutionState.customComponentData,
      
      unresolvedProviders,
      hasContent
    };
  }
  
  // ========================================
  // INTERACTION HANDLERS
  // ========================================
  
  /**
   * Handle dice roll
   */
  async handleDiceRoll(modifierIndex: number | string, result: number): Promise<InteractionResult> {
    try {
      const resolutionState = getInstanceResolutionState(this.preview);
      
      await updateInstanceResolutionState(this.preview.previewId, {
        resolvedDice: {
          ...resolutionState.resolvedDice,
          [modifierIndex]: result
        }
      });
      
      return { success: true, data: { modifierIndex, result } };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to handle dice roll' 
      };
    }
  }
  
  /**
   * Handle choice selection
   */
  async handleChoiceSelect(
    index: number,
    rolledValues: Record<string, number>,
    currentEffect: string
  ): Promise<InteractionResult> {
    try {
      const resolutionState = getInstanceResolutionState(this.preview);
      
      // Toggle selection
      if (resolutionState.selectedChoice === index) {
        await updateInstanceResolutionState(this.preview.previewId, { 
          selectedChoice: null 
        });
        return { success: true, data: { choiceResult: null } };
      }
      
      // Select new choice
      await updateInstanceResolutionState(this.preview.previewId, { 
        selectedChoice: index 
      });
      
      const choiceResult = {
        effect: currentEffect,
        stateChanges: rolledValues
      };
      
      return { success: true, data: { choiceResult } };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to handle choice selection' 
      };
    }
  }
  
  /**
   * Handle resource selection (for choice modifiers)
   */
  async handleResourceSelect(modifierIndex: number, resource: string): Promise<InteractionResult> {
    try {
      const resolutionState = getInstanceResolutionState(this.preview);
      
      await updateInstanceResolutionState(this.preview.previewId, {
        selectedResources: {
          ...resolutionState.selectedResources,
          [modifierIndex]: resource
        }
      });
      
      return { success: true, data: { modifierIndex, resource } };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to handle resource selection' 
      };
    }
  }
  
  /**
   * Handle custom component selection
   */
  async handleCustomSelection(
    metadata: Record<string, any>,
    modifiers: any[]
  ): Promise<InteractionResult> {
    try {
      // Store in instance
      await updateInstanceResolutionState(this.preview.previewId, {
        customComponentData: metadata
      });
      
      // Convert modifiers to state changes
      let choiceResult = null;
      if (modifiers && modifiers.length > 0) {
        const customStateChanges: Record<string, number> = {};
        
        for (const mod of modifiers) {
          if (mod.resource && typeof mod.value === 'number') {
            customStateChanges[mod.resource] = mod.value;
          }
        }
        
        choiceResult = {
          effect: this.preview.appliedOutcome?.effect || '',
          stateChanges: customStateChanges
        };
      }
      
      return { 
        success: true, 
        data: { 
          customSelectionData: metadata,
          choiceResult 
        } 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to handle custom selection' 
      };
    }
  }
  
  /**
   * Handle reroll
   */
  async handleReroll(): Promise<InteractionResult> {
    try {
      // Check if reroll is possible
      const fameCheck = await canRerollWithFame();
      if (!fameCheck.canReroll) {
        return { success: false, error: fameCheck.error || 'Not enough fame to reroll' };
      }
      
      // Deduct fame
      const deductResult = await deductFameForReroll();
      if (!deductResult.success) {
        return { success: false, error: deductResult.error || 'Failed to deduct fame' };
      }
      
      // Extract enabled modifiers from rollBreakdown
      const enabledModifiers = this.extractEnabledModifiers();
      
      // Store modifiers for reroll
      const { storeModifiersForReroll } = await import('../../services/pf2e/PF2eSkillService');
      storeModifiersForReroll(enabledModifiers);
      
      // Clear resolution state
      await clearInstanceResolutionState(this.preview.previewId);
      
      return { 
        success: true, 
        data: { 
          skill: this.preview.appliedOutcome?.skillName,
          previousFame: deductResult.previousFame 
        } 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to handle reroll' 
      };
    }
  }
  
  /**
   * Handle cancel
   */
  async handleCancel(): Promise<InteractionResult> {
    try {
      await clearInstanceResolutionState(this.preview.previewId);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to handle cancel' 
      };
    }
  }
  
  /**
   * Compute resolution data for application
   * Aggregates all user interactions (choices, dice, resources) into ResolutionData format
   */
  computeResolutionData(
    choiceResult: any,
    customSelectionData: any
  ): ResolutionData {
    const resolutionState = getInstanceResolutionState(this.preview);
    const modifiers = this.preview.appliedOutcome?.modifiers || [];
    
    // Convert Maps for easier access
    const resolvedDice = new Map(
      Object.entries(resolutionState.resolvedDice || {}).map(([k, v]) => {
        const key = k.startsWith('state:') ? k : (isNaN(Number(k)) ? k : Number(k));
        return [key, v];
      })
    );
    const selectedResources = new Map(
      Object.entries(resolutionState.selectedResources || {}).map(([k, v]) => [Number(k), v])
    );
    
    const numericModifiers: Array<{ resource: ResourceType; value: number }> = [];
    
    // 1. Add choice result modifiers (if any)
    if (choiceResult?.stateChanges) {
      for (const [resource, value] of Object.entries(choiceResult.stateChanges)) {
        if (typeof value === 'number') {
          numericModifiers.push({ resource: resource as ResourceType, value });
        }
      }
    }
    
    // 2. Process all modifiers array
    modifiers.forEach((modifier, idx) => {
      // Skip choice-dropdown modifiers (handled separately below)
      if ((modifier as any).type === 'choice-dropdown') return;
      
      // Skip resource arrays (these become choices, already handled in choiceResult)
      if ('resources' in modifier && Array.isArray((modifier as any).resources)) return;
      
      // Check for rolled dice value
      const rolledValue = resolvedDice.get(idx);
      
      if (rolledValue !== undefined) {
        // Use rolled value from DiceRoller
        if ('resource' in modifier) {
          numericModifiers.push({
            resource: (modifier as any).resource as ResourceType,
            value: rolledValue
          });
        }
      } else if ('resource' in modifier && 'value' in modifier && typeof (modifier as any).value === 'number') {
        // Use static value
        numericModifiers.push({
          resource: (modifier as any).resource as ResourceType,
          value: (modifier as any).value
        });
      }
    });
    
    // 3. Add choice-dropdown selections
    const choiceModifiers = this.detectChoiceModifiers();
    choiceModifiers.forEach((modifier) => {
      const selectedResource = selectedResources.get(modifier.originalIndex);
      if (selectedResource && 'value' in modifier && typeof (modifier as any).value === 'number') {
        numericModifiers.push({
          resource: selectedResource as ResourceType,
          value: (modifier as any).value
        });
      }
    });
    
    // 4. Merge custom component data
    const mergedCustomData = customSelectionData ? {
      ...resolutionState.customComponentData,
      ...customSelectionData
    } : resolutionState.customComponentData;
    
    return {
      numericModifiers,
      manualEffects: this.preview.appliedOutcome?.manualEffects || [],
      specialEffects: this.preview.appliedOutcome?.specialEffects || [],
      complexActions: this.preview.appliedOutcome?.gameCommands || [],  // ✅ Extract gameCommands for execution
      customComponentData: mergedCustomData
    };
  }
  
  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================
  
  private detectDiceModifiers(): {
    hasDiceModifiers: boolean;
    standaloneDiceModifiers: any[];
  } {
    const modifiers = this.preview.appliedOutcome?.modifiers;
    if (!modifiers) {
      return { hasDiceModifiers: false, standaloneDiceModifiers: [] };
    }
    
    // Detect dice formula modifiers
    // Supports BOTH legacy (value as string) and typed (formula field) formats
    const diceModifiers = modifiers
      .map((m, originalIdx) => ({ ...m, originalIndex: originalIdx }))
      .filter(m => {
        // Check if it's a choice modifier with resources array (use type guard)
        if ('resources' in m && Array.isArray((m as any).resources)) return false;
        
        // Legacy format: value as string matching dice pattern
        const hasLegacyDice = 'value' in m && typeof (m as any).value === 'string' && /^-?\d+d\d+([+-]\d+)?$/.test((m as any).value);
        
        // Typed format: has formula field
        const hasTypedDice = m.type === 'dice' && 'formula' in m;
        
        return hasLegacyDice || hasTypedDice;
      });
    
    // Show ALL dice modifiers (they can coexist with choices)
    return {
      hasDiceModifiers: diceModifiers.length > 0,
      standaloneDiceModifiers: diceModifiers
    };
  }
  
  private detectChoices(): {
    hasChoices: boolean;
    effectiveChoices: any[];
  } {
    const modifiers = this.preview.appliedOutcome?.modifiers;
    
    // Import helper function
    const { detectResourceArrayModifiers } = require('../../view/kingdom/components/OutcomeDisplay/logic/OutcomeDisplayLogic');
    const { getResourceIcon } = require('../../view/kingdom/utils/presentation');
    
    // Detect resource-array modifiers
    const resourceArrayModifiers = detectResourceArrayModifiers(modifiers);
    
    // Convert resource-array modifiers to choices automatically
    const autoGeneratedChoices = resourceArrayModifiers.length > 0
      ? resourceArrayModifiers.flatMap((modifier: any) =>
          modifier.resources.map((resourceType: string) => ({
            label: '', // Label is built dynamically in ChoiceButtons component
            icon: getResourceIcon(resourceType),
            modifiers: [{
              type: modifier.type,
              resource: resourceType,  // Single resource, not array
              value: modifier.value,
              negative: !!(modifier.negative),
              duration: modifier.duration
            }]
          }))
        )
      : [];
    
    // Merge explicit choices (if any) with auto-generated choices
    // Note: choices are not stored in OutcomePreview model yet, so this returns auto-generated only
    const effectiveChoices = [...autoGeneratedChoices];
    
    return {
      hasChoices: effectiveChoices.length > 0,
      effectiveChoices
    };
  }
  
  private detectChoiceModifiers(): any[] {
    const modifiers = this.preview.appliedOutcome?.modifiers;
    if (!modifiers) return [];
    
    // Detect choice modifiers (type: "choice-dropdown") that need resource selection
    // Note: "choice-dropdown" is a legacy type not in the typed EventModifier union
    return modifiers
      .map((m, idx) => ({ ...m, originalIndex: idx }))
      .filter(m => {
        // Use type guards to check for legacy choice-dropdown type
        return (m as any).type === 'choice-dropdown' && 'resources' in m && Array.isArray((m as any).resources);
      });
  }
  
  private detectStateChangeDice(resolvedDice: Map<number | string, number>): {
    hasStateChangeDice: boolean;
    stateChangeDiceResolved: boolean;
  } {
    // Import helper function from resolution service
    const { detectStateChangeDice } = require('../../services/resolution');
    
    // Note: stateChanges is not stored in OutcomePreview - it's computed on the fly
    // This is a placeholder that returns no dice for now
    const stateChangeDice: Array<{ key: string }> = []; // detectStateChangeDice would need stateChanges parameter
    
    const hasStateChangeDice = stateChangeDice.length > 0;
    const stateChangeDiceResolved = hasStateChangeDice && stateChangeDice.every((d: any) => 
      resolvedDice.has(`state:${d.key}`)
    );
    
    return { hasStateChangeDice, stateChangeDiceResolved };
  }
  
  private validateCustomComponentResolution(
    hasCustomComponent: boolean,
    choiceResult: any,
    customComponentData: any,
    customSelectionData: any
  ): boolean {
    if (!hasCustomComponent) return true;
    
    return (
      (choiceResult !== null && 
       choiceResult.stateChanges !== undefined && 
       Object.keys(choiceResult.stateChanges).length > 0) ||
      (customComponentData && Object.keys(customComponentData).length > 0) ||
      (customSelectionData && Object.keys(customSelectionData).length > 0) ||
      (this.preview.appliedOutcome?.specialEffects && this.preview.appliedOutcome.specialEffects.length > 0)
    );
  }
  
  private validateHasContent(): boolean {
    const hasMessage = this.preview.appliedOutcome?.effect && this.preview.appliedOutcome.effect.trim().length > 0;
    const hasManualEffects = this.preview.appliedOutcome?.manualEffects && this.preview.appliedOutcome.manualEffects.length > 0;
    const hasNumericModifiers = this.preview.appliedOutcome?.modifiers && this.preview.appliedOutcome.modifiers.length > 0;
    const hasSpecialEffects = this.preview.appliedOutcome?.specialEffects && this.preview.appliedOutcome.specialEffects.length > 0;
    
    return hasMessage || hasManualEffects || hasNumericModifiers || hasSpecialEffects;
  }
  
  private computeDisplayEffect(choiceResult: any): string {
    const { hasChoices } = this.detectChoices();
    const effect = this.preview.appliedOutcome?.effect || '';
    const modifiers = this.preview.appliedOutcome?.modifiers;
    
    // When choices are present, don't show choice result in effect (it's in the button)
    let baseEffect = hasChoices ? effect : (choiceResult ? choiceResult.effect : effect);
    
    // Special handling for imprisoned unrest - inject settlement name
    // Note: This uses global state - will be refactored during Action Overhaul
    if (modifiers?.some(m => 'resource' in m && (m as any).resource === 'imprisoned')) {
      const settlementName = this.getSelectedSettlementName();
      if (settlementName) {
        baseEffect = baseEffect.replace('the settlement', settlementName);
        baseEffect = baseEffect.replace('in the settlement', `in ${settlementName}`);
        baseEffect = baseEffect.replace('from the settlement', `from ${settlementName}`);
      }
    }
    
    // Special handling for economic aid - inject faction name
    // Note: This uses global state - will be refactored during Action Overhaul
    const factionName = this.getSelectedFactionName();
    if (factionName) {
      baseEffect = baseEffect.replace('your ally', factionName);
      baseEffect = baseEffect.replace('Your ally', factionName);
    }
    
    return baseEffect;
  }
  
  /**
   * Helper to get settlement name from pending state (global state read)
   * TODO: Refactor to pass as parameter during Action Overhaul
   */
  private getSelectedSettlementName(): string | null {
    const settlementId = (globalThis as any).__pendingExecuteOrPardonSettlement;
    if (!settlementId) return null;
    
    // Note: This requires access to kingdom data - will be refactored
    return null; // Placeholder - needs kingdom data access
  }
  
  /**
   * Helper to get faction name from pending state (global state read)
   * TODO: Refactor to pass as parameter during Action Overhaul
   */
  private getSelectedFactionName(): string | null {
    return (globalThis as any).__pendingEconomicAidFactionName || 
           (globalThis as any).__pendingInfiltrationFactionName || 
           null;
  }
  
  private computeDisplayStateChanges(
    choiceResult: any,
    selectedResources: Map<number, string>,
    resolvedDice: Map<number | string, number>
  ): Record<string, any> {
    // Import helper function
    const { computeDisplayStateChanges } = require('../../view/kingdom/components/OutcomeDisplay/logic/OutcomeDisplayLogic');
    
    // Note: stateChanges is not stored in OutcomePreview - it's computed on the fly
    // For now, this is a simplified version that will be enhanced when stateChanges is added to the model
    const baseStateChanges = undefined; // Will come from OutcomePreview.appliedOutcome.stateChanges when added
    const resourceArrayModifiers = this.detectResourceArrayModifiers();
    const modifiers = this.preview.appliedOutcome?.modifiers;
    const stateChangeDice = this.detectStateChangeDiceArray();
    
    return computeDisplayStateChanges(
      baseStateChanges,
      choiceResult,
      resourceArrayModifiers,
      selectedResources,
      true, // resourceArraysResolved - always true since arrays are now choices
      modifiers,
      resolvedDice,
      stateChangeDice
    ) || {};
  }
  
  /**
   * Detect resource array modifiers (for computeDisplayStateChanges)
   */
  private detectResourceArrayModifiers(): any[] {
    const { detectResourceArrayModifiers } = require('../../view/kingdom/components/OutcomeDisplay/logic/OutcomeDisplayLogic');
    return detectResourceArrayModifiers(this.preview.appliedOutcome?.modifiers);
  }
  
  /**
   * Detect state change dice (for computeDisplayStateChanges)
   */
  private detectStateChangeDiceArray(): Array<{ key: string; formula: string }> {
    // Note: stateChanges is not stored in OutcomePreview yet
    // This will be implemented when stateChanges is added to the model
    return [];
  }
  
  private extractEnabledModifiers(): Array<{ label: string; modifier: number }> {
    // Note: rollBreakdown is not stored in OutcomePreview model yet
    // This will need to be passed as a parameter when the component is updated
    // For now, return empty array (reroll will work but won't preserve modifiers)
    
    // TODO: When rollBreakdown is added to OutcomePreview, implement this logic:
    // Extract enabled modifiers from rollBreakdown
    // FILTER: Only preserve kingdom modifiers and custom modifiers, exclude system-generated ones
    
    /* FUTURE IMPLEMENTATION:
    const rollBreakdown = this.preview.appliedOutcome?.rollBreakdown;
    const enabledModifiers: Array<{ label: string; modifier: number }> = [];
    
    if (rollBreakdown?.modifiers) {
      for (const mod of rollBreakdown.modifiers) {
        if (mod.enabled === true) {
          // Kingdom modifier patterns to preserve:
          const isUnrestPenalty = mod.label === 'Unrest Penalty';
          const isInfrastructureBonus = mod.label.includes(' Infrastructure');
          const isAidBonus = mod.label.startsWith('Aid from ');
          
          // System-generated patterns to exclude (these are added automatically by PF2e):
          const isSkillBonus = mod.label.match(/^\+?\d+\s+[A-Z]/); // e.g., "+15 Diplomacy", "12 Society"
          const isAbilityScore = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'].some(
            ability => mod.label.includes(ability)
          );
          const isProficiency = mod.label.toLowerCase().includes('proficiency');
          const isProficiencyRank = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'].some(
            rank => mod.label.includes(rank)
          );
          const isLevel = mod.label.toLowerCase().includes('level');
          
          // Include if it's a kingdom modifier OR a custom modifier (not system-generated)
          const isKingdomModifier = isUnrestPenalty || isInfrastructureBonus || isAidBonus;
          const isSystemGenerated = isSkillBonus || isAbilityScore || isProficiency || isProficiencyRank || isLevel;
          
          if (isKingdomModifier || !isSystemGenerated) {
            enabledModifiers.push({
              label: mod.label,
              modifier: mod.modifier
            });
          }
        }
      }
    }
    
    return enabledModifiers;
    */
    
    return [];
  }
}

/**
 * Factory function to create controller
 */
export function createOutcomeDisplayController(preview: OutcomePreview): OutcomeDisplayController {
  return new OutcomeDisplayController(preview);
}
