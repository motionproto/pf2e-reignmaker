<script lang="ts">
  /**
   * OutcomeDisplay - Universal outcome renderer for Actions, Events, and Incidents
   * 
   * Automatically infers UI components from modifier types. Shared by ~87 pipelines.
   * Architecture docs: docs/components/OutcomeDisplay.md
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
  
  // Import helper functions
  import {
    getSelectedSettlementName,
    getSelectedFactionName
  } from './utils/OutcomeDisplayHelpers';
  
  // Import resolution builder
  import { buildResolutionData } from './utils/ResolutionDataBuilder';
  
  // Import component registry
  import { COMPONENT_REGISTRY } from './config/ComponentRegistry';
  
  import {
    updateInstanceResolutionState,
    getInstanceResolutionState,
    clearInstanceResolutionState
  } from '../../../../controllers/shared/ResolutionStateHelpers';
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
  import ResourceSelector from './components/ResourceSelector.svelte';
  import ChoiceButtons from './components/ChoiceButtons.svelte';
  import OutcomeBadges from './components/OutcomeBadges.svelte';
  import ShortageWarning from './components/ShortageWarning.svelte';
  import OutcomeActions from './components/OutcomeActions.svelte';
  
  // ✨ NEW UNIFIED INTERFACE: Only 2 required props
  export let preview: OutcomePreview;  // Contains ALL outcome data
  export let instance: OutcomePreview | null = null;  // State management (same as preview, kept for backward compat)
  
  // Derive UI configuration from preview.checkType and environment
  $: isGM = (globalThis as any).game?.user?.isGM || false;
  $: primaryButtonLabel = 'Apply Result';  // Same for all check types
  $: compact = false;  // Can be made a prop if needed
  $: showFameReroll = preview.checkType !== 'action';  // Only events/incidents can reroll with fame
  $: showCancel = true;  // Can be made a prop if needed
  
  // Derive all data from preview
  $: outcome = preview.appliedOutcome?.outcome || 'success';
  $: actorName = preview.appliedOutcome?.actorName || '';
  $: skillName = preview.appliedOutcome?.skillName || '';
  $: effect = preview.appliedOutcome?.effect || '';
  $: stateChanges = preview.appliedOutcome?.stateChanges;
  $: modifiers = preview.appliedOutcome?.modifiers;
  $: manualEffects = preview.appliedOutcome?.manualEffects;
  $: rollBreakdown = preview.appliedOutcome?.rollBreakdown;
  $: shortfallResources = preview.appliedOutcome?.shortfallResources || [];
  $: applied = preview.appliedOutcome?.effectsApplied || false;
  $: isIgnored = preview.appliedOutcome?.isIgnored || false;
  $: choices = preview.appliedOutcome?.choices;
  $: outcomeBadges = preview.appliedOutcome?.outcomeBadges || [];
  
  // Debug logging for preview data
  $: {
    console.log('📊 [OutcomeDisplay] Preview data:', {
      checkType: preview.checkType,
      outcome,
      rawOutcome: preview.appliedOutcome?.outcome,
      effect,
      modifiers,
      stateChanges,
      outcomeBadges,
      hasOutcomeBadges: outcomeBadges.length > 0,
      appliedOutcome: preview.appliedOutcome
    });
  }
  
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
  // Merge instance state with local state (local takes precedence for current session)
  $: resolvedDice = (() => {
    const instanceDice = new Map(
      Object.entries(resolutionState.resolvedDice || {}).map(([k, v]) => {
        // Keys can be numbers (modifier index) or strings (e.g., "state:food")
        const key = k.startsWith('state:') ? k : (isNaN(Number(k)) ? k : Number(k));
        return [key, v] as [number | string, number];
      })
    );
    // Merge with local dice (local takes precedence)
    for (const [k, v] of localResolvedDice) {
      instanceDice.set(k, v);
    }
    return instanceDice;
  })();
  
  $: selectedResources = new Map(
    Object.entries(resolutionState.selectedResources || {}).map(([k, v]) => [Number(k), v])
  );
  
  // Local UI-only state
  let componentResolutionData: { effect: string; stateChanges: Record<string, any> } | null = null;
  let customSelectionData: Record<string, any> | null = null;  // Raw custom selection data
  
  // Get fame from kingdom state
  $: currentFame = $kingdomData?.fame || 0;
  
  $: effectiveManualEffects = manualEffects || [];  // Manual (requires GM action)
  
  // Get outcome display properties
  $: outcomeProps = getOutcomeDisplayProps(outcome);
  
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
  
  // ========================================
  // ✨ NEW: Direct Validation from Data
  // ========================================
  // Detect all interaction requirements directly from outcome data
  // Uses ValidationContext for badge dice (handles deduplication) and direct checks for others

  // 1. DICE ROLL REQUIREMENTS
  // Check for dice in modifiers (badges are checked via ValidationContext)
  $: hasDiceInModifiers = standaloneDiceModifiers.length > 0 || hasStateChangeDice;

  // Check if OutcomeBadges has unresolved dice (via validation context)
  // OutcomeBadges registers as 'outcome-badges' and updates isResolved when all its dice are rolled
  $: badgeDiceProvider = $validationContext.get('outcome-badges');
  $: badgeDiceResolved = !badgeDiceProvider || !badgeDiceProvider.needsResolution || badgeDiceProvider.isResolved;

  $: requiresDiceRoll = hasDiceInModifiers || (badgeDiceProvider?.needsResolution ?? false);

  // Check if all dice are rolled
  $: allDiceRolled = (() => {
    if (!requiresDiceRoll && badgeDiceResolved) return true;

    // Check standalone dice modifiers
    const standaloneDiceResolved = standaloneDiceModifiers.every((m: any) =>
      resolvedDice.has(m.originalIndex)
    );

    // Check state change dice
    const stateChangeDiceResolved = stateChangeDice.every((dice: any) =>
      resolvedDice.has(dice.key)
    );

    // Badge dice are checked via ValidationContext (handles deduplication correctly)
    return standaloneDiceResolved && stateChangeDiceResolved && badgeDiceResolved;
  })();
  
  // 2. CUSTOM COMPONENT REQUIREMENTS
  $: hasCustomComponent = customComponent !== null;
  $: customComponentResolved = !hasCustomComponent || (
    // Check if componentResolutionData has data (for modifiers-based custom components)
    (componentResolutionData !== null && 
     componentResolutionData.stateChanges !== undefined && 
     Object.keys(componentResolutionData.stateChanges).length > 0) ||
    // OR check if customComponentData has data (for metadata-only custom components like outfit-army)
    (customComponentData && Object.keys(customComponentData).length > 0) ||
    // OR check local customSelectionData
    (customSelectionData && Object.keys(customSelectionData).length > 0)
  );
  
  // 3. CHOICE REQUIREMENTS
  $: requiresChoice = effectiveChoices.length > 0;
  $: choiceResolved = !requiresChoice || selectedChoice !== null;
  
  // 4. COMBINE ALL REQUIREMENTS
  $: allInteractionsResolved = allDiceRolled && customComponentResolved && choiceResolved;
  
  // Debug logging for validation state
  $: if (!allInteractionsResolved && !applied) {
    console.log('🔒 [OutcomeDisplay] Interactions not resolved:', {
      requiresDiceRoll,
      allDiceRolled,
      badgeDiceResolved,
      badgeDiceProvider: badgeDiceProvider ? { needsResolution: badgeDiceProvider.needsResolution, isResolved: badgeDiceProvider.isResolved } : null,
      standaloneDiceModifiers: standaloneDiceModifiers.length,
      stateChangeDice: stateChangeDice.length,
      resolvedDiceCount: resolvedDice.size,
      hasCustomComponent,
      customComponentResolved,
      requiresChoice,
      choiceResolved,
      selectedChoice
    });
  }
  
  // Keep old custom component debug logging for reference
  $: if (hasCustomComponent && !customComponentResolved) {
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
  
  // Validation via context - used for OutcomeBadges dice tracking (handles badge deduplication)
  $: unresolvedProviders = Array.from($validationContext.values()).filter(
    p => p.needsResolution && !p.isResolved
  );
  
  // ✨ NEW: Direct validation from data (more reliable than ValidationContext)
  let primaryButtonDisabled = false;
  $: {
    // Check if there's any content to apply
    const hasMessage = effect && effect.trim().length > 0;
    const hasManualEffects = manualEffects && manualEffects.length > 0;
    const hasNumericModifiers = modifiers && modifiers.length > 0;
    const hasStateChanges = stateChanges && Object.keys(stateChanges).length > 0;
    const hasCustomData = customComponentData && Object.keys(customComponentData).length > 0;
    const hasChoiceResultData = componentResolutionData && Object.keys(componentResolutionData.stateChanges || {}).length > 0;
    const hasContent = hasMessage || hasManualEffects || hasNumericModifiers || hasStateChanges || hasCustomData || hasChoiceResultData;
    
    // If there's no content at all, this is a data error
    if (!hasContent && !applied) {
      ui.notifications?.error('Outcome data error: No message or modifiers to display');
    }
    
    // ✨ Use direct data validation instead of ValidationContext
    // This is more reliable as it computes from data synchronously
    const interactionsNotResolved = !allInteractionsResolved;
    
    primaryButtonDisabled = applied || interactionsNotResolved || !hasContent;
    
    // Enhanced debug logging when button is disabled
    if (primaryButtonDisabled && !applied) {
      console.log('🔒 [OutcomeDisplay] Apply button disabled:', {
        applied,
        interactionsNotResolved,
        hasContent,
        breakdown: {
          requiresDiceRoll,
          allDiceRolled,
          requiresCustomComponent: hasCustomComponent,
          customComponentResolved,
          requiresChoice,
          choiceResolved
        }
      });
    }
  }
  
  // Display effective message and state changes
  // When choices are present, don't show choice result in effect (it's in the button)
  // Special handling for imprisoned unrest - inject settlement name
  // Special handling for economic aid - inject faction name
  $: displayEffect = (() => {
    let baseEffect = effectiveChoices.length > 0 ? effect : (componentResolutionData ? componentResolutionData.effect : effect);
    
    // If we have imprisoned unrest modifier, inject settlement name
    // Uses preview.metadata (stored in kingdom actor) for proper multi-client sync
    if (modifiers?.some((m: any) => (m.resource as string) === 'imprisoned')) {
      const settlementName = getSelectedSettlementName($kingdomData, preview);
      if (settlementName) {
        baseEffect = baseEffect.replace('the settlement', settlementName);
        baseEffect = baseEffect.replace('in the settlement', `in ${settlementName}`);
        baseEffect = baseEffect.replace('from the settlement', `from ${settlementName}`);
      }
    }
    
    // If we have economic aid action, inject faction name
    // Uses preview.metadata (stored in kingdom actor) for proper multi-client sync
    const factionName = getSelectedFactionName(preview);
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

    // ✅ ARCHITECTURE: Call PipelineCoordinator directly instead of dispatching to phases
    // This eliminates duplicate reroll handlers in ActionsPhase, EventsPhase, UnrestPhase
    if (!instance) {
      console.error('[OutcomeDisplay] No instance found for reroll');
      return;
    }
    
    const instanceId = instance.previewId;
    console.log(`🔄 [OutcomeDisplay] Rerolling from Step 3 (same pipeline): ${instanceId}`);
    
    try {
      // Import and call PipelineCoordinator.rerollFromStep3() directly
      const { getPipelineCoordinator } = await import('../../../../services/PipelineCoordinator');
      const pipelineCoordinator = await getPipelineCoordinator();
      
      if (!pipelineCoordinator) {
        throw new Error('PipelineCoordinator not initialized');
      }
      
      // Rewind to Step 3 and re-execute with SAME context
      // This preserves metadata, modifiers, and all pipeline state
      await pipelineCoordinator.rerollFromStep3(instanceId);
      
      console.log(`✅ [OutcomeDisplay] Reroll complete for instance ${instanceId}`);
      
    } catch (error) {
      console.error(`❌ [OutcomeDisplay] Reroll failed for instance ${instanceId}:`, error);
      
      // Restore fame if the roll failed
      const { restoreFameAfterFailedReroll } = await import('../../../../controllers/shared/RerollHelpers');
      if (deductResult.previousFame !== undefined) {
        await restoreFameAfterFailedReroll(deductResult.previousFame);
      }
      
      ui.notifications?.error('Failed to reroll. Fame has been restored.');
    }
  }
  
  /**
   * Compute complete resolution data using extracted builder
   */
  function computeResolutionData(): ResolutionData {
    return buildResolutionData({
      selectedChoice,
      componentResolutionData,
      modifiers,
      resolvedDice,
      selectedResources,
      customComponentData,
      customSelectionData,
      manualEffects,
      outcomeBadges,
      kingdomResources: $kingdomData?.resources  // ✨ Pass current resources for shortfall detection
    });
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
    await updateInstanceResolutionState(instance.previewId, {
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
  
  // Local dice roll storage - ALWAYS used for immediate reactivity
  // Instance state is async and doesn't trigger Svelte reactivity immediately
  let localResolvedDice = new Map<number | string, number>();
  
  async function handleDiceRoll(event: CustomEvent) {
    const { modifierIndex, result } = event.detail;
    
    // ✅ ALWAYS store locally first for immediate reactivity
    // This ensures resolvedDice is up-to-date when Apply Result is clicked
    localResolvedDice = new Map(localResolvedDice).set(modifierIndex, result);
    
    // Also store in instance for persistence/sync across clients (if available)
    if (instance) {
      await updateInstanceResolutionState(instance.previewId, {
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
      await updateInstanceResolutionState(instance.previewId, { selectedChoice: null });
      componentResolutionData = null;
      return;
    }
    
    // ✅ Store in instance via helper (syncs to all clients)
    await updateInstanceResolutionState(instance.previewId, { selectedChoice: index });
    
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
      await clearInstanceResolutionState(instance.previewId);
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

    // Get component ID from props (stored by PipelineCoordinator)
    const componentId = customResolutionProps?.componentId;
    
    // Store resolution data with component ID as key (if available)
    let dataToStore;
    if (componentId && metadata) {
      dataToStore = {
        [componentId]: metadata
      };
      customSelectionData = dataToStore;
    } else {
      // Fallback: store directly (for backwards compatibility)
      dataToStore = metadata;
      customSelectionData = metadata;
    }
    
    // ✅ CRITICAL: Update the instance with the selection data
    // This ensures it's available when Apply Result is clicked
    if (instance && dataToStore) {
      await updateInstanceResolutionState(instance.previewId, {
        customComponentData: dataToStore
      });
    }
    
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
</script>

<div class="resolution-display {outcomeProps.colorClass} {compact ? 'compact' : ''}">
  <OutcomeHeader 
    outcome={outcome} 
    {actorName} 
    {skillName}
  />
  
  <div class="resolution-details">
    <OutcomeMessage effect={displayEffect} />
    <ShortageWarning {shortfallResources} />
    <ChoiceButtons choices={effectiveChoices} {selectedChoice} on:select={handleChoiceSelect} />
    <ResourceSelector 
      {modifiers}
      {selectedResources}
      on:select={handleResourceSelect}
    />
    <!-- Always show OutcomeBadges (modifiers, costs, effects) -->
    <!-- Note: OutcomeBadges now auto-converts dice modifiers to badges -->
    <OutcomeBadges 
      manualEffects={effectiveManualEffects}
      {outcome} 
      {customComponentData}
      {outcomeBadges}
      on:roll={handleDiceRoll}
      on:badgeRoll={handleDiceRoll}
    />
    
    <!-- Custom resolution UI component (action-specific) - shown above roll breakdown -->
    {#if customComponent}
      <div class="custom-resolution-ui">
        <svelte:component 
          this={customComponent} 
          {instance}
          {outcome}
          config={customResolutionProps}
          on:resolution={handleComponentResolution}
        />
      </div>
    {/if}
    
    <RollBreakdown {rollBreakdown} />
  </div>
  
  <OutcomeActions
    {showCancelButton}
    {showFameRerollButton}
    {showPrimaryButton}
    {effectivePrimaryLabel}
    {primaryButtonDisabled}
    {currentFame}
    {applied}
    on:cancel={handleCancel}
    on:reroll={handleReroll}
    on:primary={handlePrimary}
  />
</div>

<style lang="scss">
  .resolution-display {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    
    &.compact {
      .resolution-details {
        padding: var(--space-12);
        gap: var(--space-10);
      }
    }
  }
  
  .resolution-details {
    padding: var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    flex: 1;
  }
</style>
