<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../stores/KingdomStore';
  import { structuresService } from '../../../../services/structures';
  import {
    processChoiceSelection,
    detectResourceArrayModifiers,
    computeDisplayStateChanges
  } from './logic/OutcomeDisplayLogic';
  
  // Helper to get settlement name from pending state
  function getSelectedSettlementName(): string | null {
    const settlementId = (globalThis as any).__pendingExecuteOrPardonSettlement;
    if (!settlementId) return null;
    
    const settlement = $kingdomData?.settlements?.find(s => s.id === settlementId);
    return settlement?.name || null;
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
  
  // Props
  export let instance: ActiveCheckInstance | null = null;  // NEW: Full instance object for state access
  export let outcome: string;
  export let actorName: string;
  export let skillName: string | undefined = undefined;
  export let effect: string;
  export let stateChanges: Record<string, any> | undefined = undefined;
  export let modifiers: any[] | undefined = undefined;
  export let manualEffects: string[] | undefined = undefined;
  export let specialEffects: string[] | undefined = undefined;  // Special effects to parse (structure damage, etc.)
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
  export let customResolutionProps: Record<string, any> = {};  // Props to pass to custom component
  
  const dispatch = createEventDispatcher();
  const DICE_PATTERN = /^-?\(?\d+d\d+([+-]\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;
  
  type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  
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
  let choiceResult: { effect: string; stateChanges: Record<string, any> } | null = null;
  let customSelectionData: Record<string, any> | null = null;  // Raw custom selection data
  let debugOutcome: OutcomeType = outcome as OutcomeType;
  
  // Parse special effects into readable messages
  function parseSpecialEffects(effects: string[] | undefined): string[] {
    if (!effects || effects.length === 0) return [];
    
    const messages: string[] = [];
    
    for (const effect of effects) {
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
  
  // Separate automated effects (specialEffects) from manual effects
  $: parsedSpecialEffects = parseSpecialEffects(specialEffects);
  $: automatedEffects = parsedSpecialEffects;  // Automated (already applied)
  $: effectiveManualEffects = manualEffects || [];  // Manual (requires GM action)
  
  // Debug logging
  $: {
    if (specialEffects && specialEffects.length > 0) {
      console.log('🔍 [OutcomeDisplay] Raw specialEffects:', specialEffects);
      console.log('🔍 [OutcomeDisplay] Parsed specialEffects:', parsedSpecialEffects);
      console.log('🔍 [OutcomeDisplay] Effective manual effects:', effectiveManualEffects);
    }
  }
  
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
  $: diceModifiers = modifiers?.map((m, originalIdx) => ({ ...m, originalIndex: originalIdx }))
    .filter(m => {
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
  $: diceResolved = hasDiceModifiers && standaloneDiceModifiers.every(m => resolvedDice.has(m.originalIndex));
  
  // Detect dice formulas in ORIGINAL stateChanges (not computed displayStateChanges)
  // This prevents circular dependency: displayStateChanges depends on resolvedDice
  $: stateChangeDice = detectStateChangeDice(stateChanges);
  $: hasStateChangeDice = stateChangeDice.length > 0;
  $: stateChangeDiceResolved = hasStateChangeDice && stateChangeDice.every(d => resolvedDice.has(`state:${d.key}`));
  
  // Determine if choices are present
  $: hasChoices = effectiveChoices && effectiveChoices.length > 0;
  $: choicesResolved = hasChoices && selectedChoice !== null;
  
  // Detect choice modifiers (type: "choice-dropdown") that need resource selection
  // BREAKING CHANGE (2025-11-08): Only recognizes explicit type: "choice-dropdown"
  $: choiceModifiers = (modifiers || [])
    .map((m, idx) => ({ ...m, originalIndex: idx }))
    .filter(m => m.type === 'choice-dropdown' && Array.isArray(m.resources));
  $: hasChoiceModifiers = choiceModifiers.length > 0;
  $: choiceModifiersResolved = hasChoiceModifiers && choiceModifiers.every(m => selectedResources.has(m.originalIndex));
  
  // Determine if custom component requires resolution
  $: hasCustomComponent = customComponent !== null;
  $: customComponentResolved = !hasCustomComponent || (
    choiceResult !== null && 
    choiceResult.stateChanges !== undefined && 
    Object.keys(choiceResult.stateChanges).length > 0
  );
  
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

    // If there's no content at all, this is a data error
    if (!hasContent && !applied) {
      ui.notifications?.error('Outcome data error: No message or modifiers to display');
    }
    
    // FIXED: Check ALL resolution requirements independently
    // Choices, dice, state changes, choice modifiers, and custom components can all coexist
    const choicesNeedResolution = hasChoices && !choicesResolved;
    const diceNeedResolution = hasDiceModifiers && !diceResolved;
    const stateChangeDiceNeedResolution = hasStateChangeDice && !stateChangeDiceResolved;
    const choiceModifiersNeedResolution = hasChoiceModifiers && !choiceModifiersResolved;
    const customComponentNeedsResolution = hasCustomComponent && !customComponentResolved;
    
    primaryButtonDisabled = applied || 
      choicesNeedResolution ||
      diceNeedResolution ||
      stateChangeDiceNeedResolution ||
      choiceModifiersNeedResolution ||
      customComponentNeedsResolution ||
      !hasContent;
  }
  
  // Display effective message and state changes
  // When choices are present, don't show choice result in effect (it's in the button)
  // Special handling for imprisoned unrest - inject settlement name
  $: displayEffect = (() => {
    let baseEffect = hasChoices ? effect : (choiceResult ? choiceResult.effect : effect);
    
    // If we have imprisoned unrest modifier, inject settlement name
    if (modifiers?.some(m => (m.resource as string) === 'imprisoned')) {
      const settlementName = getSelectedSettlementName();
      if (settlementName) {
        baseEffect = baseEffect.replace('the settlement', settlementName);
        baseEffect = baseEffect.replace('in the settlement', `in ${settlementName}`);
        baseEffect = baseEffect.replace('from the settlement', `from ${settlementName}`);
      }
    }
    
    return baseEffect;
  })();
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

    // Extract enabled modifiers from rollBreakdown and store for next roll
    // FILTER: Only preserve kingdom modifiers and custom modifiers, exclude system-generated ones
    const enabledModifiers: Array<{ label: string; modifier: number }> = [];
    if (rollBreakdown?.modifiers) {
      for (const mod of rollBreakdown.modifiers) {
        if (mod.enabled === true) {
          // Kingdom modifier patterns to preserve:
          const isUnrestPenalty = mod.label === 'Unrest Penalty';
          const isInfrastructureBonus = mod.label.includes(' Infrastructure');
          const isAidBonus = mod.label.startsWith('Aid from ');
          
          // System-generated patterns to exclude (these are added automatically by PF2e):
          const isSkillBonus = mod.label.match(/^\\+?\\d+\\s+[A-Z]/); // e.g., "+15 Diplomacy", "12 Society"
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
    
    // Store modifiers for the next roll (module-scoped state)
    const { storeModifiersForReroll } = await import('../../../../services/pf2e/PF2eSkillService');
    storeModifiersForReroll(enabledModifiers);
    
    // ✅ Clear state in instance via helper (syncs to all clients)
    if (instance) {
      await clearInstanceResolutionState(instance.instanceId);
    }
    
    // Reset local UI state
    choiceResult = null;

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
    if (selectedChoice !== null && choiceResult?.stateChanges) {

      // Add non-resource-array modifiers (e.g., gold penalty in Trade War)
      if (modifiers) {
        for (let i = 0; i < modifiers.length; i++) {
          const mod = modifiers[i];
          
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
      for (const [resource, value] of Object.entries(choiceResult.stateChanges)) {
        numericModifiers.push({ resource: resource as ResourceType, value: value as number });

      }
    }
    // Case 2: Custom component made a selection (e.g., HarvestResourcesAction)
    else if (choiceResult?.stateChanges && Object.keys(choiceResult.stateChanges).length > 0) {
      // Add modifiers from custom component selection
      for (const [resource, value] of Object.entries(choiceResult.stateChanges)) {
        numericModifiers.push({ resource: resource as ResourceType, value: value as number });
      }
    }
    // Case 3: No choices, apply all modifiers
    else {


      if (modifiers) {
        for (let i = 0; i < modifiers.length; i++) {
          const mod = modifiers[i];

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
      complexActions: [], // Phase 3 will add support for this
      customComponentData: mergedCustomData  // Merged custom component data
    };

    return resolution;
  }
  
  async function handlePrimary() {

    // FIXED: Validate ALL interactive elements independently
    if (hasChoices && !choicesResolved) {

      return;
    }
    
    if (hasDiceModifiers && !diceResolved) {

      return;
    }
    
    if (hasStateChangeDice && !stateChangeDiceResolved) {

      return;
    }

    // NEW ARCHITECTURE: Compute complete resolution data
    const resolutionData = computeResolutionData();

    dispatch('primary', resolutionData);
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
    const { modifiers, ...metadata } = event.detail;

    // Store raw custom selection data (e.g., selectedResource, selectedAmount, goldCost)
    customSelectionData = metadata;

    // Convert modifiers to stateChanges (like choices do)
    if (modifiers && modifiers.length > 0) {
      const customStateChanges: Record<string, number> = {};
      
      for (const mod of modifiers) {
        if (mod.resource && typeof mod.value === 'number') {
          customStateChanges[mod.resource] = mod.value;
        }
      }
      
      // Store as a "choice result" in LOCAL STATE ONLY (no persistence until Apply)
      choiceResult = {
        effect: effect,
        stateChanges: customStateChanges
      };

    }
    
    // Forward to parent (no instance state update)
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
    <ShortageWarning {shortfallResources} />
    <ChoiceButtons choices={effectiveChoices} {selectedChoice} {choicesResolved} on:select={handleChoiceSelect} />
    <ResourceSelector 
      {modifiers}
      {selectedResources}
      on:select={handleResourceSelect}
    />
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
      manualEffects={effectiveManualEffects} 
      automatedEffects={automatedEffects}
      outcome={effectiveOutcome} 
      hideResources={choiceResult ? Object.keys(choiceResult.stateChanges) : []}
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
    margin: px 0;
    padding: 0;
    border-radius: var(--radius-md);
    border: 2px solid var(--border-strong);
    background: linear-gradient(135deg, 
      rgba(0, 0, 0, 0.4),
      rgba(0, 0, 0, 0.2));
    overflow: hidden;
    box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.2);
    position: relative;
    
    &.compact {
      margin: var(--space-12) 0;
      border-width: 0.0625rem;
      box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.15);
      
      .resolution-details {
        padding: var(--space-12);
        gap: var(--space-10);
      }
    }
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 0.25rem;
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
    padding: .5rem var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
</style>
