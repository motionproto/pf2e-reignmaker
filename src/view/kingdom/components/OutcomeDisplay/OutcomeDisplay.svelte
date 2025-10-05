<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../../stores/KingdomStore';
  import {
    processChoiceSelection,
    detectResourceArrayModifiers,
    computeDisplayStateChanges
  } from './logic/OutcomeDisplayLogic';
  import { 
    getOutcomeDisplayProps,
    detectDiceModifiers,
    detectStateChangeDice,
    rollDiceFormula
  } from '../../../../services/resolution';
  import { createOutcomeResolutionService } from '../../../../services/resolution';
  
  // Import extracted components
  import OutcomeHeader from './components/OutcomeHeader.svelte';
  import OutcomeMessage from './components/OutcomeMessage.svelte';
  import RollBreakdown from './components/RollBreakdown.svelte';
  import DiceRoller from './components/DiceRoller.svelte';
  import ResourceSelector from './components/ResourceSelector.svelte';
  import ChoiceButtons from './components/ChoiceButtons.svelte';
  import StateChanges from './components/StateChanges.svelte';
  import OutcomeActions from './components/OutcomeActions.svelte';
  import DebugResultSelector from './components/DebugResultSelector.svelte';
  
  // Props
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
  
  const dispatch = createEventDispatcher();
  const DICE_PATTERN = /^-?\\d+d\\d+([+-]\\d+)?$/;
  
  type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  
  // State
  let selectedChoice: number | null = null;
  let choiceResult: { effect: string; stateChanges: Record<string, any> } | null = null;
  let selectedResources: Map<number, string> = new Map();
  let resolvedDice: Map<number | string, number> = new Map();
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
  $: resourceArraysResolved = hasResourceArrays && resourceArrayModifiers.every((_, idx) => selectedResources.has(idx));
  
  // Detect dice formula modifiers
  $: diceModifiers = detectDiceModifiers(modifiers);
  $: hasDiceModifiers = diceModifiers.length > 0;
  $: diceResolved = hasDiceModifiers && diceModifiers.every(m => resolvedDice.has(m.originalIndex));
  
  // Detect dice formulas in stateChanges
  $: stateChangeDice = detectStateChangeDice(stateChanges);
  $: hasStateChangeDice = stateChangeDice.length > 0;
  $: stateChangeDiceResolved = hasStateChangeDice && stateChangeDice.every(d => resolvedDice.has(`state:${d.key}`));
  
  // Determine if choices are present
  $: hasChoices = choices && choices.length > 0;
  $: choicesResolved = hasChoices && selectedChoice !== null;
  
  // Button visibility
  $: showCancelButton = showCancel && !applied;
  $: showFameRerollButton = showFameReroll && !applied && !hasChoices && !hasResourceArrays && !hasDiceModifiers;
  $: effectivePrimaryLabel = applied ? '' : primaryButtonLabel;
  $: primaryButtonDisabled = (hasChoices && !choicesResolved) || (hasResourceArrays && !resourceArraysResolved) || (hasDiceModifiers && !diceResolved) || (hasStateChangeDice && !stateChangeDiceResolved);
  
  // Display effective message and state changes
  $: displayEffect = choiceResult ? choiceResult.effect : effect;
  $: displayStateChanges = computeDisplayStateChanges(
    stateChanges,
    choiceResult,
    resourceArrayModifiers,
    selectedResources,
    resourceArraysResolved,
    diceModifiers,
    resolvedDice
  );
  
  // Event handlers
  function handleReroll() {
    dispatch('reroll');
  }
  
  async function handlePrimary() {
    if ((hasChoices && !choicesResolved) || (hasResourceArrays && !resourceArraysResolved) || (hasDiceModifiers && !diceResolved)) {
      return;
    }
    
    // Build standardized resolution data using the service
    const resolutionService = await createOutcomeResolutionService();
    const resolutionData = resolutionService.buildResolutionData({
      resolvedDice,
      selectedResources,
      selectedChoice,
      choices,
      choiceResult
    });
    
    // Convert to plain object for event dispatch
    const eventDetail = resolutionService.toEventDetail(resolutionData);
    
    dispatch('primary', eventDetail);
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
  
  function handleDiceRoll(event: CustomEvent) {
    const { modifierIndex, result } = event.detail;
    const newResolved = new Map(resolvedDice);
    newResolved.set(modifierIndex, result);
    resolvedDice = newResolved;
    
    console.log(`🎲 [OutcomeDisplay] Rolled dice: ${result} for modifier ${modifierIndex}`);
    dispatch('diceRolled', event.detail);
  }
  
  function handleChoiceSelect(event: CustomEvent) {
    const { index } = event.detail;
    
    if (selectedChoice === index) {
      selectedChoice = null;
      choiceResult = null;
      return;
    }
    
    selectedChoice = index;
    const choice = choices![index];
    const resourceValues: Record<string, number> = {};
    
    if (choice.modifiers) {
      for (const modifier of choice.modifiers) {
        const value = modifier.value;
        
        if (typeof value === 'string' && DICE_PATTERN.test(value)) {
          const rolled = rollDiceFormula(value);
          resourceValues[modifier.resource] = rolled;
        } else if (typeof value === 'number') {
          resourceValues[modifier.resource] = value;
        }
      }
    }
    
    let resultLabel = choice.label;
    for (const [resource, value] of Object.entries(resourceValues)) {
      resultLabel = resultLabel.replace(new RegExp(`\\{${resource}\\}`, 'g'), String(Math.abs(value)));
    }
    
    choiceResult = {
      effect: resultLabel,
      stateChanges: resourceValues
    };
    
    dispatch('choiceSelected', { 
      choiceIndex: index,
      choice: choice,
      result: choiceResult
    });
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  function handleDebugOutcomeChange(event: CustomEvent) {
    const newOutcome = event.detail.outcome as OutcomeType;
    debugOutcome = newOutcome;
    
    // Reset state when outcome changes
    selectedChoice = null;
    choiceResult = null;
    selectedResources = new Map();
    resolvedDice = new Map();
    
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
  
  <OutcomeHeader outcome={effectiveOutcome} {actorName} {skillName} />
  
  <div class="resolution-details">
    <OutcomeMessage effect={displayEffect} />
    <RollBreakdown {rollBreakdown} />
    <ResourceSelector {modifiers} {selectedResources} on:select={handleResourceSelect} />
    <ChoiceButtons {choices} {selectedChoice} {choicesResolved} on:select={handleChoiceSelect} />
    <StateChanges stateChanges={displayStateChanges} {modifiers} {resolvedDice} {manualEffects} on:roll={handleDiceRoll} />
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
