<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../stores/KingdomStore';
  import {
    processChoiceSelection,
    detectResourceArrayModifiers,
    computeDisplayStateChanges
  } from './logic/OutcomeDisplayLogic';
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
  import ChoiceButtons from './components/ChoiceButtons.svelte';
  import StateChanges from './components/StateChanges.svelte';
  import ShortageWarning from './components/ShortageWarning.svelte';
  import OutcomeActions from './components/OutcomeActions.svelte';
  import DebugResultSelector from './components/DebugResultSelector.svelte';
  
  // Props
  export let instance: ActiveCheckInstance | null = null;  // NEW: Full instance object for state access
  export let outcome: string;
  export let actorName: string;
  export let skillName: string | undefined = undefined;
  export let effect: string;
  export let stateChanges: Record<string, any> | undefined = undefined;
  export let modifiers: any[] | undefined = undefined;
  export let manualEffects: string[] | undefined = undefined;
  export const rerollEnabled: boolean = false;
  export const rerollLabel: string = "Reroll";
  export const rerollCount: number | undefined = undefined;
  export let primaryButtonLabel: string = "OK";
  export let compact: boolean = false;
  export let showFameReroll: boolean = true;
  export let showCancel: boolean = true;
  export let applied: boolean = false;
  export let choices: any[] | undefined = undefined;
  export let rollBreakdown: any = null;
  export let debugMode: boolean = false;
  export let shortfallResources: string[] = [];
  export let showIgnoreEvent: boolean = false;
  export let ignoreEventDisabled: boolean = false;
  export let isIgnored: boolean = false;  // Flag to hide reroll button for ignored events
  export let customComponent: any = null;  // Custom resolution UI component (Svelte constructor)
  
  const dispatch = createEventDispatcher();
  const DICE_PATTERN = /^-?\(?\d+d\d+([+-]\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;
  
  type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  
  // ✅ READ state from instance (syncs across all clients)
  $: resolutionState = getInstanceResolutionState(instance);
  $: selectedChoice = resolutionState.selectedChoice;
  $: customComponentData = resolutionState.customComponentData;  // Track custom component resolution
  
  // Debug logging
  $: {
    console.log('🔍 [OutcomeDisplay] customComponent:', customComponent);
    console.log('🔍 [OutcomeDisplay] customComponentData:', customComponentData);
    console.log('🔍 [OutcomeDisplay] instance:', instance?.instanceId);
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
  let choiceResult: { effect: string; stateChanges: Record<string, any> } | null = null;
  let debugOutcome: OutcomeType = outcome as OutcomeType;
  
  // Get fame from kingdom state
  $: currentFame = $kingdomData?.fame || 0;
  
  // Use debug outcome if in debug mode, otherwise use the prop
  $: effectiveOutcome = debugMode ? debugOutcome : outcome;
  
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
            ...modifier,
            resource: resourceType
          }]
        }))
      )
    : [];
  
  // Merge explicit choices with auto-generated choices from resource arrays
  $: effectiveChoices = [...(choices || []), ...autoGeneratedChoices];
  
  // Detect dice formula modifiers that are NOT part of choices
  // Supports BOTH legacy (value as string) and typed (formula field) formats
  $: diceModifiers = modifiers?.filter(m => {
    if (Array.isArray(m.resources)) return false; // Not a resource array
    
    // Legacy format: value as string matching dice pattern
    const hasLegacyDice = typeof m.value === 'string' && /^-?\\d+d\\d+([+-]\\d+)?$/.test(m.value);
    
    // Typed format: has formula field
    const hasTypedDice = m.type === 'dice' && m.formula;
    
    return hasLegacyDice || hasTypedDice;
  }).map((m, idx) => ({ ...m, originalIndex: idx })) || [];
  
  // FIXED: Show ALL dice modifiers, even when choices exist
  // Choices and dice modifiers can coexist (e.g., choice + 1d4 penalty)
  $: standaloneDiceModifiers = diceModifiers;
  $: hasDiceModifiers = standaloneDiceModifiers.length > 0;
  $: diceResolved = hasDiceModifiers && standaloneDiceModifiers.every(m => resolvedDice.has(m.originalIndex));
  
  // Detect dice formulas in ORIGINAL stateChanges (not computed displayStateChanges)
  // This prevents circular dependency: displayStateChanges depends on resolvedDice
  $: stateChangeDice = detectStateChangeDice(stateChanges);
  $: hasStateChangeDice = stateChangeDice.length > 0;
  $: stateChangeDiceResolved = hasStateChangeDice && stateChangeDice.every(d => resolvedDice.has(`state:${d.key}`));
  
  // Determine if choices are present
  $: hasChoices = effectiveChoices && effectiveChoices.length > 0;
  $: choicesResolved = hasChoices && selectedChoice !== null;
  
  // Determine if custom component requires resolution
  $: hasCustomComponent = customComponent !== null;
  $: customComponentResolved = !hasCustomComponent || (customComponentData !== undefined && customComponentData !== null);
  
  // Button visibility and state
  $: showCancelButton = showCancel && !applied && !isIgnored;
  // Hide reroll button once user starts resolving (makes choices/rolls dice)
  // They can reroll the base outcome, but not after committing to resolutions
  $: hasAnyResolutionState = selectedChoice !== null || resolvedDice.size > 0 || selectedResources.size > 0;
  $: showFameRerollButton = showFameReroll && !applied && !isIgnored && !hasAnyResolutionState;
  $: effectivePrimaryLabel = applied ? '✓ Applied' : primaryButtonLabel;
  
  // Validation logic with debug logging
  // FIXED: Check ALL interactive elements (choices, dice, state changes) independently
  let primaryButtonDisabled = false;
  $: {
    // Check if there's any content to apply
    // A message alone counts as content (e.g., "Surge slows" with empty modifiers)
    const hasMessage = effect && effect.trim().length > 0;
    const hasManualEffects = manualEffects && manualEffects.length > 0;
    const hasNumericModifiers = modifiers && modifiers.length > 0;
    const hasStateChanges = stateChanges && Object.keys(stateChanges).length > 0;
    const hasCustomData = customComponentData && Object.keys(customComponentData).length > 0;
    const hasChoiceResultData = choiceResult && Object.keys(choiceResult.stateChanges || {}).length > 0;
    const hasContent = hasMessage || hasManualEffects || hasNumericModifiers || hasStateChanges || hasCustomData || hasChoiceResultData;
    
    const validationState = {
      applied,
      hasChoices,
      choicesResolved,
      hasDiceModifiers,
      diceResolved,
      hasStateChangeDice,
      stateChangeDiceResolved,
      hasMessage,
      hasManualEffects,
      hasContent,
      resolvedDiceKeys: Array.from(resolvedDice.keys()),
      stateChangeDiceKeys: stateChangeDice.map(d => `state:${d.key}`)
    };
    
    console.log('🔍 [OutcomeDisplay] Validation state:', validationState);
    
    // If there's no content at all, this is a data error
    if (!hasContent && !applied) {
      console.error('❌ [OutcomeDisplay] Invalid outcome - no message or modifiers');
      ui.notifications?.error('Outcome data error: No message or modifiers to display');
    }
    
    // FIXED: Check ALL resolution requirements independently
    // Choices, dice, state changes, and custom components can all coexist
    const choicesNeedResolution = hasChoices && !choicesResolved;
    const diceNeedResolution = hasDiceModifiers && !diceResolved;
    const stateChangeDiceNeedResolution = hasStateChangeDice && !stateChangeDiceResolved;
    const customComponentNeedsResolution = hasCustomComponent && !customComponentResolved;
    
    primaryButtonDisabled = applied || 
      choicesNeedResolution ||
      diceNeedResolution ||
      stateChangeDiceNeedResolution ||
      customComponentNeedsResolution ||
      !hasContent;
  }
  
  // Display effective message and state changes
  // When choices are present, don't show choice result in effect (it's in the button)
  $: displayEffect = hasChoices ? effect : (choiceResult ? choiceResult.effect : effect);
  $: displayStateChanges = computeDisplayStateChanges(
    stateChanges,
    choiceResult,
    resourceArrayModifiers,
    selectedResources,
    true, // resourceArraysResolved - always true since arrays are now choices
    modifiers,  // CHANGED: Pass full modifiers array so static modifiers are displayed
    resolvedDice,
    stateChangeDice
  );
  
  // Event handlers
  async function handleReroll() {
    console.log('🔁 [OutcomeDisplay] Reroll with Fame initiated');
    
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
    
    console.log(`💎 [OutcomeDisplay] Fame deducted (${fameCheck.currentFame} → ${fameCheck.currentFame - 1})`);
    
    // Extract enabled modifiers from rollBreakdown and store for next roll
    const enabledModifiers: Array<{ label: string; modifier: number }> = [];
    if (rollBreakdown?.modifiers) {
      for (const mod of rollBreakdown.modifiers) {
        if (mod.enabled === true) {
          enabledModifiers.push({
            label: mod.label,
            modifier: mod.modifier
          });
        }
      }
      console.log('📋 [OutcomeDisplay] Extracted enabled modifiers:', enabledModifiers);
    }
    
    // Store modifiers for the next roll (module-scoped state)
    const { storeModifiersForReroll } = await import('../../../../services/pf2e/PF2eSkillService');
    storeModifiersForReroll(enabledModifiers);
    
    // ✅ Clear state in instance via helper (syncs to all clients)
    if (instance) {
      await clearInstanceResolutionState(instance.instanceId);
    }
    
    // Reset local UI state
    choiceResult = null;
    
    console.log('🔄 [OutcomeDisplay] UI state reset for reroll');
    
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
    console.log('🔍 [computeResolutionData] Starting with modifiers:', modifiers);
    const numericModifiers: Array<{ resource: ResourceType; value: number }> = [];
    
    // Case 1: Choice was made (resource arrays are replaced by choice)
    if (selectedChoice !== null && choiceResult?.stateChanges) {
      console.log('🔍 [computeResolutionData] Processing choice-based resolution');
      
      // Add non-resource-array modifiers (e.g., gold penalty in Trade War)
      if (modifiers) {
        for (let i = 0; i < modifiers.length; i++) {
          const mod = modifiers[i];
          
          // Skip resource arrays (they're replaced by the choice)
          if (Array.isArray(mod.resources)) {
            console.log(`⏭️ [computeResolutionData] Skipping resource array modifier [${i}]`);
            continue;
          }
          
          // Get rolled value or use static value
          const value = resolvedDice.get(i) ?? mod.value;
          
          if (typeof value === 'number') {
            numericModifiers.push({ resource: mod.resource as ResourceType, value });
            console.log(`✅ [computeResolutionData] Added modifier [${i}]: ${mod.resource} = ${value}`);
          }
        }
      }
      
      // Add choice modifiers (already rolled in ChoiceButtons)
      for (const [resource, value] of Object.entries(choiceResult.stateChanges)) {
        numericModifiers.push({ resource: resource as ResourceType, value: value as number });
        console.log(`✅ [computeResolutionData] Added choice modifier: ${resource} = ${value}`);
      }
    }
    // Case 2: No choices, apply all modifiers
    else {
      console.log('🔍 [computeResolutionData] Processing standard resolution (no choices)');
      console.log('🔍 [computeResolutionData] Modifiers array:', modifiers);
      console.log('🔍 [computeResolutionData] Modifiers count:', modifiers?.length || 0);
      
      if (modifiers) {
        for (let i = 0; i < modifiers.length; i++) {
          const mod = modifiers[i];
          console.log(`🔍 [computeResolutionData] Processing modifier [${i}]:`, mod);
          
          // Skip resource arrays if no choice (shouldn't happen, but safety)
          if (Array.isArray(mod.resources)) {
            console.warn(`⚠️ [computeResolutionData] Resource array without choice: [${i}]`);
            continue;
          }
          
          // Get rolled value or use static value
          let value = resolvedDice.get(i) ?? resolvedDice.get(`state:${mod.resource}`) ?? mod.value;
          console.log(`🔍 [computeResolutionData] Resolved value for [${i}]:`, value, '(type:', typeof value, ')');
          
          if (typeof value === 'number') {
            numericModifiers.push({ resource: mod.resource as ResourceType, value });
            console.log(`✅ [computeResolutionData] Added modifier [${i}]: ${mod.resource} = ${value}`);
          } else {
            console.warn(`⚠️ [computeResolutionData] Skipped modifier [${i}] - value is not a number:`, value);
          }
        }
      } else {
        console.warn('⚠️ [computeResolutionData] No modifiers array provided!');
      }
    }
    
    // Build complete resolution data
    const resolution: ResolutionData = {
      numericModifiers,
      manualEffects: manualEffects || [],
      complexActions: [], // Phase 3 will add support for this
      customComponentData  // Include custom component data (e.g., arrest-dissidents allocations)
    };
    
    console.log('📋 [computeResolutionData] Final resolution:', resolution);
    return resolution;
  }
  
  async function handlePrimary() {
    console.log('🔵 [handlePrimary] Called', { hasChoices, choicesResolved, hasDiceModifiers, diceResolved, applied, primaryButtonDisabled });
    
    // FIXED: Validate ALL interactive elements independently
    if (hasChoices && !choicesResolved) {
      console.log('❌ [handlePrimary] Blocked: choices not resolved');
      return;
    }
    
    if (hasDiceModifiers && !diceResolved) {
      console.log('❌ [handlePrimary] Blocked: dice not resolved');
      return;
    }
    
    if (hasStateChangeDice && !stateChangeDiceResolved) {
      console.log('❌ [handlePrimary] Blocked: state change dice not resolved');
      return;
    }
    
    console.log('✅ [handlePrimary] Computing resolution data...');
    
    // NEW ARCHITECTURE: Compute complete resolution data
    const resolutionData = computeResolutionData();
    
    console.log('📤 [handlePrimary] Dispatching primary event with resolution data');
    dispatch('primary', resolutionData);
  }
  
  function handleResourceSelect(event: CustomEvent) {
    const { modifierIndex, resourceType } = event.detail;
    const newSelections = new Map(selectedResources);
    newSelections.set(modifierIndex, resourceType);
    selectedResources = newSelections;
    
    dispatch('resourceSelected', {
      modifierIndex,
      resourceType,
      allSelections: Object.fromEntries(selectedResources)
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
    
    console.log(`🎲 [OutcomeDisplay] Rolled dice: ${result} for modifier ${modifierIndex} (instance: ${instance?.instanceId})`);
    dispatch('diceRolled', event.detail);
  }
  
  async function handleChoiceSelect(event: CustomEvent) {
    const { index, rolledValues } = event.detail;
    
    if (!instance) return;
    
    // Toggle selection
    if (selectedChoice === index) {
      // ✅ Clear choice in instance
      await updateInstanceResolutionState(instance.instanceId, { selectedChoice: null });
      choiceResult = null;
      return;
    }
    
    // ✅ Store in instance via helper (syncs to all clients)
    await updateInstanceResolutionState(instance.instanceId, { selectedChoice: index });
    
    const choice = effectiveChoices[index];
    const resourceValues = rolledValues || {};
    
    // Build local UI result (for display)
    choiceResult = {
      effect: effect,
      stateChanges: resourceValues
    };
    
    dispatch('choiceSelected', { 
      choiceIndex: index,
      choice: choice,
      result: choiceResult
    });
  }
  
  async function handleCancel() {
    // ✅ Clear state in instance via helper (syncs to all clients)
    if (instance) {
      await clearInstanceResolutionState(instance.instanceId);
    }
    
    // Reset local UI state
    choiceResult = null;
    
    dispatch('cancel');
  }
  
  async function handleCustomSelection(event: CustomEvent) {
    if (!instance) return;
    
    const { modifiers, ...metadata } = event.detail;
    
    console.log('🎨 [OutcomeDisplay] Custom component selection:', { modifiers, metadata });
    
    // Store metadata (for UI display, like settlement name/level)
    if (metadata && Object.keys(metadata).length > 0) {
      await updateInstanceResolutionState(instance.instanceId, {
        customComponentData: metadata
      });
    }
    
    // Convert modifiers to stateChanges (like choices do)
    if (modifiers && modifiers.length > 0) {
      const customStateChanges: Record<string, number> = {};
      
      for (const mod of modifiers) {
        if (mod.resource && typeof mod.value === 'number') {
          customStateChanges[mod.resource] = mod.value;
        }
      }
      
      // Store as a "choice result" so StateChanges displays it
      choiceResult = {
        effect: effect,
        stateChanges: customStateChanges
      };
      
      console.log('✅ [OutcomeDisplay] Custom modifiers converted to stateChanges:', customStateChanges);
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
    choiceResult = null;
    
    // Dispatch event to parent so they can update modifiers/effects
    dispatch('debugOutcomeChanged', { outcome: newOutcome });
  }
</script>

<div class="resolution-display {outcomeProps.colorClass} {compact ? 'compact' : ''}">
  {#if debugMode}
    <DebugResultSelector 
      currentOutcome={debugOutcome} 
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
    <RollBreakdown {rollBreakdown} />
    <ShortageWarning {shortfallResources} />
    <ChoiceButtons choices={effectiveChoices} {selectedChoice} {choicesResolved} on:select={handleChoiceSelect} />
    <DiceRoller 
      modifiers={standaloneDiceModifiers} 
      {resolvedDice} 
      on:roll={handleDiceRoll} 
    />
    <!-- Always show StateChanges (modifiers, costs, effects) -->
    <StateChanges 
      stateChanges={displayStateChanges} 
      {modifiers} 
      {resolvedDice} 
      {manualEffects} 
      outcome={effectiveOutcome} 
      hideResources={choiceResult ? Object.keys(choiceResult.stateChanges) : []}
      {customComponentData}
      on:roll={handleDiceRoll} 
    />
    
    <!-- Custom resolution UI component (action-specific) - shown in addition to standard display -->
    {#if customComponent}
      <div class="custom-resolution-ui">
        <svelte:component 
          this={customComponent} 
          {instance}
          {outcome}
          {modifiers}
          {stateChanges}
          on:selection={handleCustomSelection}
        />
      </div>
    {/if}
  </div>
  
  <OutcomeActions
    {showCancelButton}
    {showFameRerollButton}
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
    margin: 20px 0;
    padding: 0;
    border-radius: var(--radius-md);
    border: 2px solid var(--border-strong);
    background: linear-gradient(135deg, 
      rgba(0, 0, 0, 0.4),
      rgba(0, 0, 0, 0.2));
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    position: relative;
    
    &.compact {
      margin: 12px 0;
      border-width: 1px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      
      .resolution-details {
        padding: 12px;
        gap: 10px;
      }
    }
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, 
        transparent,
        currentColor,
        transparent);
      opacity: 0.6;
    }
    
    &.critical-success {
      background: linear-gradient(135deg,
        rgba(34, 197, 94, 0.15),
        rgba(34, 197, 94, 0.05));
      border-color: rgba(34, 197, 94, 0.5);
      
      &::before {
        color: var(--color-green);
      }
    }
    
    &.success {
      background: linear-gradient(135deg,
        rgba(34, 197, 94, 0.1),
        rgba(34, 197, 94, 0.02));
      border-color: rgba(34, 197, 94, 0.35);
      
      &::before {
        color: var(--color-green-light);
      }
    }
    
    &.failure {
      background: linear-gradient(135deg,
        rgba(249, 115, 22, 0.1),
        rgba(249, 115, 22, 0.02));
      border-color: rgba(249, 115, 22, 0.35);
      
      &::before {
        color: var(--color-orange);
      }
    }
    
    &.critical-failure {
      background: linear-gradient(135deg,
        rgba(239, 68, 68, 0.15),
        rgba(239, 68, 68, 0.05));
      border-color: rgba(239, 68, 68, 0.5);
      
      &::before {
        color: var(--color-red);
      }
    }
  }
  
  .resolution-details {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
</style>
