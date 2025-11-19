<script lang="ts">
  /**
   * OutcomeDisplay - Universal outcome renderer for Actions, Events, and Incidents
   * 
   * ============================================================================
   * AUTOMATIC COMPONENT INFERENCE RULES
   * ============================================================================
   * This component automatically selects UI components based on modifier types.
   * No need to specify components explicitly in pipelines - they're inferred!
   * 
   * Modifier Type              → Component Rendered
   * -------------------------------------------------------------------------
   * { type: 'dice', ... }      → DiceRoller.svelte (interactive dice rolling)
   * { type: 'choice', ... }    → ChoiceButtons.svelte or ResourceSelector.svelte
   * { type: 'static', ... }    → StateChanges.svelte (display only, no interaction)
   * 
   * ============================================================================
   * CUSTOM COMPONENT OVERRIDE
   * ============================================================================
   * For unique UI needs, pipelines can specify a custom component:
   * 
   * In pipeline's preview.calculate():
   * ```typescript
   * return {
   *   resources: [...],
   *   specialEffects: [...],
   *   customComponent: {
   *     name: 'MyUniqueComponent',  // Must be registered in COMPONENT_REGISTRY
   *     props: { ...data }
   *   }
   * };
   * ```
   * 
   * Example Usage:
   * ```typescript
   * // In executeOrPardonPrisoners.ts
   * preview: {
   *   calculate: async (ctx) => ({
   *     customComponent: {
   *       name: 'ExecuteOrPardonSelector',
   *       props: { imprisonedUnrest: getTotalImprisoned(ctx.kingdom) }
   *     }
   *   })
   * }
   * 
   * // Custom component provides resolution data
   * dispatch('resolution', {
   *   isResolved: true,
   *   metadata: { decision: 'execute' },
   *   modifiers: [{ resource: 'unrest', value: -3 }]
   * });
   * 
   * // Pipeline consumes the result in execute()
   * execute: async (ctx) => {
   *   const decision = ctx.resolutionData?.customComponentData?.decision;
   * }
   * ```
   * 
   * ============================================================================
   * COMPONENT REGISTRATION
   * ============================================================================
   * To add a new custom component:
   * 
   * 1. Create component in: src/view/kingdom/components/OutcomeDisplay/components/
   * 2. Register in COMPONENT_REGISTRY below
   * 3. Use in pipeline via customComponent.name
   * 
   * ============================================================================
   * ARCHITECTURE BENEFITS
   * ============================================================================
   * ✅ DRY: ~87 pipelines share the same components
   * ✅ Maintainability: One bug fix improves all actions
   * ✅ Flexibility: Custom components available when needed
   * ✅ Clean separation: Pipelines stay data-focused, no UI concerns
   * 
   * @see src/services/resolution/DiceRollingService.ts - Modifier detection
   * @see src/types/CheckPipeline.ts - Pipeline type definitions
   * @see src/pipelines/actions/executeOrPardonPrisoners.ts - Custom component example
   */
  
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../stores/KingdomStore';
  import { structuresService } from '../../../../services/structures';
  import type { OutcomePreview } from '../../../../models/OutcomePreview';
  import {
    processChoiceSelection,
    detectResourceArrayModifiers,
    computeDisplayStateChanges
  } from './logic/OutcomeDisplayLogic';
  
  // ✨ NEW: Validation context for centralized validation
  import { setValidationContext } from './context/ValidationContext';
  
  // Helper to get settlement name from pending state
  function getSelectedSettlementName(): string | null {
    const settlementId = (globalThis as any).__pendingExecuteOrPardonSettlement;
    if (!settlementId) return null;
    
    const settlement = $kingdomData?.settlements?.find(s => s.id === settlementId);
    return settlement?.name || null;
  }
  
  // Helper to get faction name from pending state (economic aid or infiltration)
  function getSelectedFactionName(): string | null {
    return (globalThis as any).__pendingEconomicAidFactionName || 
           (globalThis as any).__pendingInfiltrationFactionName || 
           null;
  }
  import {
    updateInstanceResolutionState,
    getInstanceResolutionState,
    clearInstanceResolutionState
  } from '../../../../controllers/shared/ResolutionStateHelpers';
  import type { ActiveCheckInstance } from '../../../../models/CheckInstance';
  import { 
    getOutcomeDisplayProps,
    detectDiceModifiers,
    detectStateChangeDice,
    rollDiceFormula
  } from '../../../../services/resolution';
  import { getResourceIcon } from '../../../kingdom/utils/presentation';
  import type { ResourceType } from '../../../../types/events';
  import type { ResolutionData } from '../../../../types/modifiers';
  import { isStaticModifier, isDiceModifier, isChoiceModifier } from '../../../../types/modifiers';
  import { 
    canRerollWithFame, 
    deductFameForReroll, 
    restoreFameAfterFailedReroll 
  } from '../../../../controllers/shared/RerollHelpers';
  
  // Import extracted components
  import OutcomeHeader from './components/OutcomeHeader.svelte';
  import OutcomeMessage from './components/OutcomeMessage.svelte';
  import RollBreakdown from './components/RollBreakdown.svelte';
  import DiceRoller from './components/DiceRoller.svelte';
  import ResourceSelector from './components/ResourceSelector.svelte';
  import ChoiceButtons from './components/ChoiceButtons.svelte';
  import StateChanges from './components/StateChanges.svelte';
  import ShortageWarning from './components/ShortageWarning.svelte';
  import OutcomeActions from './components/OutcomeActions.svelte';
  import DebugResultSelector from './components/DebugResultSelector.svelte';
  import SpecialEffectBadges from './components/SpecialEffectBadges.svelte';
  import type { SpecialEffect } from '../../../../types/special-effects';
  import { parseLegacyEffect } from '../../../../types/special-effects';
  
  // ✨ NEW UNIFIED INTERFACE: Only 2 required props
  export let preview: OutcomePreview;  // Contains ALL outcome data
  export let instance: ActiveCheckInstance | null = null;  // State management
  
  // Derive UI configuration from preview.checkType and environment
  $: isGM = (globalThis as any).game?.user?.isGM || false;
  $: primaryButtonLabel = 'Apply Result';  // Same for all check types
  $: compact = false;  // Can be made a prop if needed
  $: showFameReroll = preview.checkType !== 'action';  // Only events/incidents can reroll with fame
  $: showCancel = true;  // Can be made a prop if needed
  $: debugMode = isGM;  // GMs get debug mode
  $: showIgnoreEvent = preview.checkType === 'event';  // Only events can be ignored
  $: ignoreEventDisabled = false;  // Can be made a prop if needed
  
  // Derive all data from preview
  $: outcome = preview.appliedOutcome?.outcome || 'success';
  $: actorName = preview.appliedOutcome?.actorName || '';
  $: skillName = preview.appliedOutcome?.skillName || '';
  $: effect = preview.appliedOutcome?.effect || '';
  $: stateChanges = preview.appliedOutcome?.stateChanges;
  $: modifiers = preview.appliedOutcome?.modifiers;
  $: manualEffects = preview.appliedOutcome?.manualEffects;
  $: specialEffects = preview.appliedOutcome?.specialEffects;
  $: rollBreakdown = preview.appliedOutcome?.rollBreakdown;
  $: shortfallResources = preview.appliedOutcome?.shortfallResources || [];
  $: applied = preview.appliedOutcome?.effectsApplied || false;
  $: isIgnored = false;  // Not tracked in OutcomePreview yet
  $: choices = preview.appliedOutcome?.choices;
  
  // Debug logging for preview data
  $: {
    console.log('📊 [OutcomeDisplay] Preview data:', {
      checkType: preview.checkType,
      outcome,
      rawOutcome: preview.appliedOutcome?.outcome,
      effectiveOutcome,
      debugOutcome,
      debugMode,
      effect,
      modifiers,
      stateChanges,
      appliedOutcome: preview.appliedOutcome
    });
  }
  
  // Custom component registry - maps component names to actual component classes
  import ResourceChoiceSelector from './components/ResourceChoiceSelector.svelte';
  import SellResourceSelector from './components/SellResourceSelector.svelte';
  import PurchaseResourceSelector from './components/PurchaseResourceSelector.svelte';
  
  const COMPONENT_REGISTRY: Record<string, any> = {
    'ResourceChoiceSelector': ResourceChoiceSelector,
    'SellResourceSelector': SellResourceSelector,
    'PurchaseResourceSelector': PurchaseResourceSelector,
    // Add more injectable components here as needed
  };
  
  // Look up component by name from registry
  $: customComponent = preview.appliedOutcome?.componentName 
    ? COMPONENT_REGISTRY[preview.appliedOutcome.componentName] || null
    : null;
  
  $: customResolutionProps = preview.appliedOutcome?.componentProps || 
                              preview.appliedOutcome?.customResolutionProps || 
                              {};
  
  // Debug logging
  $: if (preview.appliedOutcome?.componentName) {
    console.log('🔍 [OutcomeDisplay] Looking up component:', preview.appliedOutcome.componentName);
    console.log('🔍 [OutcomeDisplay] Found in registry:', !!customComponent);
  }
  
  const dispatch = createEventDispatcher();
  const DICE_PATTERN = /^-?\(?\\d+d\\d+([+-]\\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;
  
  type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  
  // ✨ NEW: Create validation context for sub-components to register with
  const validationContext = setValidationContext();
  
  // ✅ READ state from instance (syncs across all clients)
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedChoice = resolutionState.selectedChoice;
  $: customComponentData = resolutionState.customComponentData;  // Track custom component resolution
  
  // Debug logging
  $: {


  }
  // Convert string keys back to appropriate types for Maps
  $: resolvedDice = new Map(
    Object.entries(resolutionState.resolvedDice || {}).map(([k, v]) => {
      // Keys can be numbers (modifier index) or strings (e.g., "state:food")
      const key = k.startsWith('state:') ? k : (isNaN(Number(k)) ? k : Number(k));
      return [key, v];
    })
  );
  
  $: selectedResources = new Map(
    Object.entries(resolutionState.selectedResources || {}).map(([k, v]) => [Number(k), v])
  );
  
  // Local UI-only state
  let componentResolutionData: { effect: string; stateChanges: Record<string, any> } | null = null;
  let customSelectionData: Record<string, any> | null = null;  // Raw custom selection data
  let debugOutcome: OutcomeType | undefined = undefined;
  
  // Initialize debugOutcome reactively once outcome is available
  $: if (debugOutcome === undefined && outcome) {
    debugOutcome = outcome as OutcomeType;
  }
  
  // Parse special effects into readable messages
  function parseSpecialEffects(effects: string[] | undefined): string[] {
    if (!effects || effects.length === 0) return [];
    
    const messages: string[] = [];
    
    for (const effect of effects as string[]) {
      // Parse structure_damaged:structureId:settlementId
      if (effect.startsWith('structure_damaged:')) {
        const parts = effect.split(':');
        console.log('🔍 [OutcomeDisplay] Parsing structure_damaged effect:', { effect, parts });
        
        const [, structureId, settlementId] = parts;
        console.log('🔍 [OutcomeDisplay] Extracted IDs:', { structureId, settlementId });
        
        const structure = structuresService.getStructure(structureId);
        console.log('🔍 [OutcomeDisplay] Found structure:', structure);
        
        const settlement = $kingdomData?.settlements?.find(s => s.id === settlementId);
        console.log('🔍 [OutcomeDisplay] Found settlement:', settlement);
        
        if (structure && settlement) {
          const message = `${structure.name} in ${settlement.name} has been damaged and provides no bonuses until repaired.`;
          console.log('✅ [OutcomeDisplay] Created message:', message);
          messages.push(message);
        } else {
          console.warn('⚠️ [OutcomeDisplay] Failed to create message - missing structure or settlement', {
            hasStructure: !!structure,
            hasSettlement: !!settlement,
            structureId,
            settlementId,
            availableSettlements: $kingdomData?.settlements?.map(s => ({ id: s.id, name: s.name }))
          });
        }
      }
      
      // Parse structure_destroyed:structureId:settlementId
      else if (effect.startsWith('structure_destroyed:')) {
        const [, structureId, settlementId] = effect.split(':');
        const structure = structuresService.getStructure(structureId);
        const settlement = $kingdomData?.settlements?.find(s => s.id === settlementId);
        
        if (structure && settlement) {
          if (structure.tier === 1) {
            messages.push(`${structure.name} in ${settlement.name} has been completely destroyed and removed.`);
          } else if (structure.upgradeFrom) {
            const previousStructure = structuresService.getStructure(structure.upgradeFrom);
            if (previousStructure) {
              messages.push(`${structure.name} in ${settlement.name} has been destroyed, downgrading to ${previousStructure.name} (damaged).`);
            }
          }
        }
      }
      
      // Parse hex_claimed:count:hexList
      else if (effect.startsWith('hex_claimed:')) {
        const [, count, hexList] = effect.split(':');
        const hexCount = parseInt(count, 10);
        messages.push(`${hexCount} hex${hexCount !== 1 ? 'es' : ''} claimed: ${hexList}`);
      }
      
      // Critical success fame is handled separately in StateChanges
      else if (effect === 'critical_success_fame') {
        // Skip - already displayed by StateChanges
      }
      
      // Shortage penalties are handled separately
      else if (effect.startsWith('shortage_penalty:')) {
        // Skip - already displayed as shortfall warning
      }
      
      // Imprisoned unrest effects
      else if (effect === 'imprisoned_unrest_applied' || effect === 'imprisoned_unrest_allocated') {
        // Skip - already shown in state changes
      }
      else if (effect === 'imprisoned_unrest_overflow') {
        messages.push('Prison capacity exceeded - excess converted to regular unrest');
      }
    }
    
    return messages;
  }
  
  // Get fame from kingdom state
  $: currentFame = $kingdomData?.fame || 0;
  
  // Parse special effects (handles both new structured format and legacy strings)
  $: structuredEffects = specialEffects?.map((effect: any) => {
    if (typeof effect === 'string') {
      // Legacy string format - parse into structured effect
      return parseLegacyEffect(effect);
    } else {
      // Already structured
      return effect;
    }
  }) || [];
  
  // Separate legacy parsed string effects from new badge effects
  $: legacyParsedEffects = parseSpecialEffects(
    specialEffects?.filter(e => typeof e === 'string') as string[] | undefined
  );
  $: effectiveManualEffects = manualEffects || [];  // Manual (requires GM action)
  
  // Debug logging
  $: {
    if (specialEffects && specialEffects.length > 0) {
      console.log('🔍 [OutcomeDisplay] Raw specialEffects:', specialEffects);
      console.log('🔍 [OutcomeDisplay] Structured effects:', structuredEffects);
      console.log('🔍 [OutcomeDisplay] Legacy parsed effects:', legacyParsedEffects);
    }
  }
  
  // Use debug outcome if in debug mode, otherwise use the prop
  // Fallback to outcome if debugOutcome is undefined
  $: effectiveOutcome = debugMode ? (debugOutcome || outcome) : outcome;
  
  // Get outcome display properties
  $: outcomeProps = getOutcomeDisplayProps(effectiveOutcome);
  
  // Detect resource-array modifiers
  $: resourceArrayModifiers = detectResourceArrayModifiers(modifiers);
  $: hasResourceArrays = resourceArrayModifiers.length > 0;
  
  // Convert resource-array modifiers to choices automatically
  // Note: The actual label text is built in ChoiceButtons.getPreviewLabel()
  $: autoGeneratedChoices = resourceArrayModifiers.length > 0 
    ? resourceArrayModifiers.flatMap(modifier => 
        modifier.resources.map((resourceType: string) => ({
          label: '', // Label is built dynamically in ChoiceButtons
          icon: getResourceIcon(resourceType),
          modifiers: [{
            type: modifier.type,
            resource: resourceType,  // Single resource, not array
            value: modifier.value,
            negative: modifier.negative,
            duration: modifier.duration
          }]
        }))
      )
    : [];
  
  // Merge explicit choices with auto-generated choices from resource arrays
  $: effectiveChoices = [...(choices || []), ...autoGeneratedChoices];
  
  // Detect dice formula modifiers that are NOT part of choices
  // Supports BOTH legacy (value as string) and typed (formula field) formats
  $: diceModifiers = modifiers?.map((m: any, originalIdx: number) => ({ ...m, originalIndex: originalIdx }))
    .filter((m: any) => {
      if (Array.isArray(m.resources)) return false; // Not a resource array
      
      // Legacy format: value as string matching dice pattern
      const hasLegacyDice = typeof m.value === 'string' && /^-?\d+d\d+([+-]\d+)?$/.test(m.value);
      
      // Typed format: has formula field
      const hasTypedDice = m.type === 'dice' && m.formula;
      
      return hasLegacyDice || hasTypedDice;
    }) || [];
  
  // FIXED: Show ALL dice modifiers, even when choices exist
  // Choices and dice modifiers can coexist (e.g., choice + 1d4 penalty)
  $: standaloneDiceModifiers = diceModifiers;
  $: hasDiceModifiers = standaloneDiceModifiers.length > 0;
  
  // Detect dice formulas in ORIGINAL stateChanges (not computed displayStateChanges)
  // This prevents circular dependency: displayStateChanges depends on resolvedDice
  $: stateChangeDice = detectStateChangeDice(stateChanges);
  $: hasStateChangeDice = stateChangeDice.length > 0;
  
  // ✨ REMOVED: Specific validation logic (diceResolved, choicesResolved, etc.)
  // ✨ Components now register with ValidationContext and manage their own state
  
  // Determine if custom component requires resolution
  $: hasCustomComponent = customComponent !== null;
  $: customComponentResolved = !hasCustomComponent || (
    // Check if componentResolutionData has data (for modifiers-based custom components)
    (componentResolutionData !== null && 
     componentResolutionData.stateChanges !== undefined && 
     Object.keys(componentResolutionData.stateChanges).length > 0) ||
    // OR check if customComponentData has data (for metadata-only custom components like outfit-army)
    (customComponentData && Object.keys(customComponentData).length > 0) ||
    // OR check local customSelectionData
    (customSelectionData && Object.keys(customSelectionData).length > 0) ||
    // OR check if specialEffects are present (for PreparedCommand pattern like request-military-aid)
    (specialEffects && specialEffects.length > 0)
  );
  
  // Debug logging for custom component resolution
  $: if (hasCustomComponent) {
    console.log('🔍 [OutcomeDisplay] Custom component validation:', {
      hasCustomComponent,
      customComponentResolved,
      componentResolutionData,
      customComponentData,
      customSelectionData,
      componentResolutionDataHasData: componentResolutionData !== null && componentResolutionData.stateChanges !== undefined && Object.keys(componentResolutionData.stateChanges).length > 0,
      customComponentDataHasData: customComponentData && Object.keys(customComponentData).length > 0,
      customSelectionDataHasData: customSelectionData && Object.keys(customSelectionData).length > 0
    });
  }
  
  // Button visibility and state
  $: showCancelButton = showCancel && !applied && !isIgnored;
  // Reroll button should always be visible (but disabled if no fame)
  // User can reroll even after making selections, using the same modifiers
  $: showFameRerollButton = !applied && !isIgnored;
  // Hide the primary button after it's been applied for ALL check types
  // This causes the entire outcome section to revert to initial state
  $: showPrimaryButton = !applied;
  $: effectivePrimaryLabel = primaryButtonLabel;  // Always "Apply Result" (no "✓ Applied" state)
  
  // ✨ NEW: Validation via context (collects from all registered providers)
  $: unresolvedProviders = Array.from($validationContext.values()).filter(
    p => p.needsResolution && !p.isResolved
  );
  
  // ✨ NEW: Simplified validation logic using context-based validation
  let primaryButtonDisabled = false;
  $: {
    // Check if there's any content to apply
    const hasMessage = effect && effect.trim().length > 0;
    const hasManualEffects = manualEffects && manualEffects.length > 0;
    const hasNumericModifiers = modifiers && modifiers.length > 0;
    const hasStateChanges = stateChanges && Object.keys(stateChanges).length > 0;
    const hasCustomData = customComponentData && Object.keys(customComponentData).length > 0;
    const hasChoiceResultData = componentResolutionData && Object.keys(componentResolutionData.stateChanges || {}).length > 0;
    const hasSpecialEffects = specialEffects && specialEffects.length > 0;
    const hasContent = hasMessage || hasManualEffects || hasNumericModifiers || hasStateChanges || hasCustomData || hasChoiceResultData || hasSpecialEffects;
    
    // If there's no content at all, this is a data error
    if (!hasContent && !applied) {
      ui.notifications?.error('Outcome data error: No message or modifiers to display');
    }
    
    // ✨ Context-based validation (all components register themselves)
    const contextValidationFails = unresolvedProviders.length > 0;
    
    primaryButtonDisabled = applied || contextValidationFails || !hasContent;
  }
  
  // Display effective message and state changes
  // When choices are present, don't show choice result in effect (it's in the button)
  // Special handling for imprisoned unrest - inject settlement name
  // Special handling for economic aid - inject faction name
  $: displayEffect = (() => {
    let baseEffect = effectiveChoices.length > 0 ? effect : (componentResolutionData ? componentResolutionData.effect : effect);
    
    // If we have imprisoned unrest modifier, inject settlement name
    if (modifiers?.some((m: any) => (m.resource as string) === 'imprisoned')) {
      const settlementName = getSelectedSettlementName();
      if (settlementName) {
        baseEffect = baseEffect.replace('the settlement', settlementName);
        baseEffect = baseEffect.replace('in the settlement', `in ${settlementName}`);
        baseEffect = baseEffect.replace('from the settlement', `from ${settlementName}`);
      }
    }
    
    // If we have economic aid action, inject faction name
    const factionName = getSelectedFactionName();
    if (factionName) {
      baseEffect = baseEffect.replace('your ally', factionName);
      baseEffect = baseEffect.replace('Your ally', factionName);
    }
    
    return baseEffect;
  })();
  $: displayStateChanges = computeDisplayStateChanges(
    stateChanges,
    componentResolutionData,
    resourceArrayModifiers,
    selectedResources,
    true, // resourceArraysResolved - always true since arrays are now choices
    modifiers,  // CHANGED: Pass full modifiers array so static modifiers are displayed
    resolvedDice,
    stateChangeDice
  );
  
  // Event handlers
  async function handleReroll() {

    // Check if reroll is possible
    const fameCheck = await canRerollWithFame();
    if (!fameCheck.canReroll) {
      ui.notifications?.warn(fameCheck.error || 'Not enough fame to reroll');
      return;
    }
    
    // Deduct fame
    const deductResult = await deductFameForReroll();
    if (!deductResult.success) {
      ui.notifications?.error(deductResult.error || 'Failed to deduct fame');
      return;
    }

    // Extract modifiers to preserve for reroll
    // Preserve BOTH custom modifiers AND kingdom modifiers (unrest, infrastructure, aid)
    // Exclude system-generated modifiers (ability scores, proficiency, level)
    const enabledModifiers: Array<{ label: string; modifier: number }> = [];
    if (rollBreakdown?.modifiers) {
      for (const mod of rollBreakdown.modifiers) {
        if (mod.enabled === true) {
          // Kingdom modifier patterns to preserve:
          const isUnrestPenalty = mod.label === 'Unrest Penalty';
          const isInfrastructureBonus = mod.label.includes(' Infrastructure') || 
                                        (mod.label.includes(' ') && !mod.label.match(/^[A-Z][a-z]+$/)); // Settlement bonuses like "Capital Courthouse"
          const isAidBonus = mod.label.startsWith('Aid from ');
          const isCustomModifier = (mod as any).custom === true;
          
          // System-generated patterns to exclude (these are auto-calculated by PF2e):
          const isSkillBonus = mod.label.match(/^[+-]?\d+\s+[A-Z]/); // e.g., "+15 Diplomacy", "12 Society"
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
          
          if (isKingdomModifier || (isCustomModifier && !isSystemGenerated)) {
            enabledModifiers.push({
              label: mod.label,
              modifier: mod.modifier
            });
          }
        }
      }
    }
    
    // Store modifiers for the next roll (module-scoped state)
    const { storeModifiersForReroll } = await import('../../../../services/pf2e/PF2eSkillService');
    storeModifiersForReroll(enabledModifiers);
    
    // ✅ Clear state in instance via helper (syncs to all clients)
    if (instance) {
      await clearInstanceResolutionState(instance.instanceId);
    }
    
    // Reset local UI state
    componentResolutionData = null;

    // Dispatch reroll request with skill info and previous fame
    // Note: Modifiers are now stored in module-scoped state, not passed as parameters
    dispatch('performReroll', { 
      skill: skillName,
      previousFame: deductResult.previousFame
    });
  }
  
  /**
   * NEW ARCHITECTURE: Compute complete resolution data
   * This is the single source of truth for what gets applied to the kingdom
   */
  function computeResolutionData(): ResolutionData {
    const numericModifiers: Array<{ resource: ResourceType; value: number }> = [];
    
    // Case 1: Choice was made (resource arrays are replaced by choice)
    if (selectedChoice !== null && componentResolutionData?.stateChanges) {

      // Add non-resource-array modifiers (e.g., gold penalty in Trade War)
      if (modifiers) {
        for (let i = 0; i < modifiers.length; i++) {
          const mod = modifiers[i] as any;
          
          // Skip resource arrays (they're replaced by the choice)
          if (Array.isArray(mod.resources)) {

            continue;
          }
          
          // Get rolled value or use static value
          const value = resolvedDice.get(i) ?? mod.value;
          
          if (typeof value === 'number') {
            numericModifiers.push({ resource: mod.resource as ResourceType, value });

          }
        }
      }
      
      // Add choice modifiers (already rolled in ChoiceButtons)
      for (const [resource, value] of Object.entries(componentResolutionData.stateChanges)) {
        numericModifiers.push({ resource: resource as ResourceType, value: value as number });

      }
    }
    // Case 2: Custom component made a selection (e.g., HarvestResourcesAction)
    else if (componentResolutionData?.stateChanges && Object.keys(componentResolutionData.stateChanges).length > 0) {
      // Add modifiers from custom component selection
      for (const [resource, value] of Object.entries(componentResolutionData.stateChanges)) {
        numericModifiers.push({ resource: resource as ResourceType, value: value as number });
      }
    }
    // Case 3: No choices, apply all modifiers
    else {


      if (modifiers) {
        for (let i = 0; i < modifiers.length; i++) {
          const mod = modifiers[i] as any;

          // Handle ChoiceModifiers (type: "choice-dropdown" with resources array)
          if (mod.type === 'choice-dropdown' && Array.isArray(mod.resources)) {
            const selectedResource = selectedResources.get(i);
            if (selectedResource) {
              numericModifiers.push({ 
                resource: selectedResource as ResourceType, 
                value: mod.value as number 
              });
            }
            continue;
          }

          // Skip resource arrays if no choice (shouldn't happen, but safety)
          if (Array.isArray(mod.resources)) {
            continue;
          }
          
          // Get rolled value or use static value
          let value = resolvedDice.get(i) ?? resolvedDice.get(`state:${mod.resource}`) ?? mod.value;

          if (typeof value === 'number') {
            numericModifiers.push({ resource: mod.resource as ResourceType, value });
          }
        }
      }
    }
    
    // Build complete resolution data
    // For custom components: merge persisted selectedResource with local selection data
    const mergedCustomData = customSelectionData ? {
      ...customComponentData,  // selectedResource from instance
      ...customSelectionData  // Contains the full selection (selectedAmount, goldCost, etc.)
    } : customComponentData;
    
    const resolution: ResolutionData = {
      numericModifiers,
      manualEffects: manualEffects || [],
      specialEffects: specialEffects || [],  // Include special effects (PreparedCommand pattern)
      complexActions: [], // Phase 3 will add support for this
      customComponentData: mergedCustomData  // Merged custom component data
    };

    return resolution;
  }
  
  async function handlePrimary() {
    console.log('🟢 [OutcomeDisplay] handlePrimary called');
    console.log('🟢 [OutcomeDisplay] Validation state:', {
      unresolvedProviders: unresolvedProviders.length,
      componentResolutionData,
      customSelectionData
    });

    // ✨ GENERIC VALIDATION: All components register with ValidationContext
    // No need for specific checks - context handles everything
    if (unresolvedProviders.length > 0) {
      console.warn('⚠️ [OutcomeDisplay] Unresolved components:', unresolvedProviders.map(p => p.id));
      return;
    }

    // Compute complete resolution data
    const resolutionData = computeResolutionData();
    console.log('🟢 [OutcomeDisplay] Resolution data:', resolutionData);

    dispatch('primary', resolutionData);
    console.log('🟢 [OutcomeDisplay] Dispatched primary event');
  }
  
  async function handleResourceSelect(event: CustomEvent) {
    const { modifierIndex, resource } = event.detail;
    
    if (!instance) return;
    
    // ✅ Store in instance via helper (syncs to all clients)
    await updateInstanceResolutionState(instance.instanceId, {
      selectedResources: {
        ...resolutionState.selectedResources,
        [modifierIndex]: resource
      }
    });
    
    dispatch('resourceSelected', {
      modifierIndex,
      resourceType: resource,
      allSelections: { ...resolutionState.selectedResources, [modifierIndex]: resource }
    });
  }
  
  async function handleDiceRoll(event: CustomEvent) {
    const { modifierIndex, result } = event.detail;
    
    // ✅ Store in instance via helper (syncs to all clients)
    if (instance) {
      await updateInstanceResolutionState(instance.instanceId, {
        resolvedDice: {
          ...resolutionState.resolvedDice,
          [modifierIndex]: result
        }
      });
    }

    dispatch('diceRolled', event.detail);
  }
  
  async function handleChoiceSelect(event: CustomEvent) {
    const { index, rolledValues } = event.detail;
    
    if (!instance) return;
    
    // Toggle selection
    if (selectedChoice === index) {
      // ✅ Clear choice in instance
      await updateInstanceResolutionState(instance.instanceId, { selectedChoice: null });
      componentResolutionData = null;
      return;
    }
    
    // ✅ Store in instance via helper (syncs to all clients)
    await updateInstanceResolutionState(instance.instanceId, { selectedChoice: index });
    
    const choice = effectiveChoices[index];
    const resourceValues = rolledValues || {};
    
    // Build local UI result (for display)
    componentResolutionData = {
      effect: effect,
      stateChanges: resourceValues
    };
    
    dispatch('choiceSelected', { 
      choiceIndex: index,
      choice: choice,
      result: componentResolutionData
    });
  }
  
  async function handleCancel() {
    // ✅ Clear state in instance via helper (syncs to all clients)
    if (instance) {
      await clearInstanceResolutionState(instance.instanceId);
    }
    
    // Reset local UI state
    componentResolutionData = null;
    
    dispatch('cancel');
  }
  
  // ✅ STANDARD EVENT: Handle 'resolution' from custom components
  async function handleComponentResolution(event: CustomEvent) {
    const { isResolved, modifiers, metadata } = event.detail;

    console.log('✅ [OutcomeDisplay] Received resolution event:', {
      isResolved,
      modifiers,
      metadata
    });

    // Store resolution data locally
    customSelectionData = metadata;
    
    // Convert modifiers to stateChanges (for display in StateChanges component)
    if (modifiers && modifiers.length > 0) {
      const customStateChanges: Record<string, number> = {};
      
      for (const mod of modifiers) {
        if (mod.resource && typeof mod.value === 'number') {
          customStateChanges[mod.resource] = mod.value;
        }
      }
      
      // Store as a "choice result" for display
      componentResolutionData = {
        effect: effect,
        stateChanges: customStateChanges
      };
    }
    
    // Forward to parent
    dispatch('customSelection', event.detail);
  }
  
  async function handleDebugOutcomeChange(event: CustomEvent) {
    const newOutcome = event.detail.outcome as OutcomeType;
    debugOutcome = newOutcome;
    
    // ✅ Clear state in instance via helper (syncs to all clients)
    if (instance) {
      await clearInstanceResolutionState(instance.instanceId);
    }
    
    // Reset local UI state
    componentResolutionData = null;
    
    // Dispatch event to parent so they can update modifiers/effects
    dispatch('debugOutcomeChanged', { outcome: newOutcome });
  }
</script>

<div class="resolution-display {outcomeProps.colorClass} {compact ? 'compact' : ''}">
  {#if debugMode}
    <DebugResultSelector 
      currentOutcome={debugOutcome || outcome} 
      on:outcomeSelected={handleDebugOutcomeChange} 
    />
  {/if}
  
  <OutcomeHeader 
    outcome={effectiveOutcome} 
    {actorName} 
    {skillName}
    showIgnoreButton={showIgnoreEvent}
    ignoreButtonDisabled={ignoreEventDisabled}
    on:ignore
  />
  
  <div class="resolution-details">
    <OutcomeMessage effect={displayEffect} />
    <ShortageWarning {shortfallResources} />
    <SpecialEffectBadges effects={structuredEffects} />
    <ChoiceButtons choices={effectiveChoices} {selectedChoice} on:select={handleChoiceSelect} />
    <ResourceSelector 
      {modifiers}
      {selectedResources}
      on:select={handleResourceSelect}
    />
    <DiceRoller 
      modifiers={standaloneDiceModifiers} 
      on:roll={handleDiceRoll}
      on:resolution={handleComponentResolution}
    />
    <!-- Always show StateChanges (modifiers, costs, effects) -->
    <StateChanges 
      stateChanges={displayStateChanges} 
      {modifiers} 
      {resolvedDice} 
      manualEffects={effectiveManualEffects} 
      automatedEffects={legacyParsedEffects}
      outcome={effectiveOutcome} 
      hideResources={componentResolutionData ? Object.keys(componentResolutionData.stateChanges) : []}
      {customComponentData}
      on:roll={handleDiceRoll} 
    />
    <RollBreakdown {rollBreakdown} />
    
    <!-- Custom resolution UI component (action-specific) - shown in addition to standard display -->
    {#if customComponent}
      <div class="custom-resolution-ui">
        <svelte:component 
          this={customComponent} 
          {instance}
          {outcome}
          {...customResolutionProps}
          on:resolution={handleComponentResolution}
        />
      </div>
    {/if}
  </div>
  
  <OutcomeActions
    {showCancelButton}
    {showFameRerollButton}
    {showPrimaryButton}
    {effectivePrimaryLabel}
    {primaryButtonDisabled}
    {currentFame}
    on:cancel={handleCancel}
    on:reroll={handleReroll}
    on:primary={handlePrimary}
  />
</div>

<style lang="scss">
  .resolution-display {
    margin: px 0;
    padding: 0;
    border-radius: var(--radius-md);
    border: 2px solid var(--border-strong);
    overflow: hidden;
    box-shadow: 0 0.25rem 1rem var(--overlay-low);
    position: relative;
    
    &.compact {
      margin: var(--space-12) 0;
      border-width: 1px;
      box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.15);
      
      .resolution-details {
        padding: var(--space-12);
        gap: var(--space-10);
      }
    }
    
    &.critical-success {
      border-color: var(--border-success-medium);
    }
    
    &.success {
      border-color: var(--border-success-subtle);
    }
    
    &.failure {
      border-color: var(--border-accent-subtle);
    }
    
    &.critical-failure {
      border-color: var(--border-primary-medium);
    }
  }
  
  .resolution-details {
    padding: .5rem var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
</style>
