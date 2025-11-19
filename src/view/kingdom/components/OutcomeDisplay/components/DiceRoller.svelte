<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { detectDiceModifiers, rollDiceFormula, formatStateChangeLabel } from '../../../../../services/resolution';
  import { getValidationContext } from '../context/ValidationContext';
  import { getResourceIcon } from '../../../utils/presentation';
  
  export let modifiers: any[] | undefined;
  
  const dispatch = createEventDispatcher();
  
  // ✅ LOCAL STATE: Component manages its own rolled values
  let rolledValues = new Map<number, number>();
  
  // ✨ Register with validation context
  const validationContext = getValidationContext();
  const providerId = 'dice-roller';
  
  $: diceModifiers = detectDiceModifiers(modifiers);
  $: hasDiceModifiers = diceModifiers.length > 0;
  // ✅ Validation based on local state
  $: allResolved = hasDiceModifiers && diceModifiers.every(m => rolledValues.has(m.originalIndex));
  
  // Register validation on mount
  onMount(() => {
    if (validationContext) {
      validationContext.register(providerId, {
        id: providerId,
        needsResolution: hasDiceModifiers,
        isResolved: allResolved
      });
    }
  });
  
  // Update validation state when dice/resolution changes
  $: if (validationContext) {
    validationContext.update(providerId, {
      needsResolution: hasDiceModifiers,
      isResolved: allResolved
    });
  }
  
  // ✨ Notify parent when all dice are resolved (reactive)
  $: if (allResolved && hasDiceModifiers && rolledValues.size > 0) {
    notifyResolutionComplete();
  }
  
  // Unregister on destroy
  onDestroy(() => {
    if (validationContext) {
      validationContext.unregister(providerId);
    }
  });
  
  function handleRoll(modifier: any) {
    // Extract formula from either typed format (formula field) or legacy format (value field)
    const formula = modifier.formula || modifier.value;
    
    // Roll the dice
    const rolled = rollDiceFormula(formula);
    
    // Apply negative flag if present (typed format)
    const finalResult = modifier.negative ? -rolled : rolled;
    
    // ✅ Store in local state (instant UI update)
    rolledValues.set(modifier.originalIndex, finalResult);
    rolledValues = rolledValues;  // Trigger Svelte reactivity
    
    // Still dispatch 'roll' event for backward compatibility
    dispatch('roll', {
      modifierIndex: modifier.originalIndex,
      result: finalResult,
      resource: modifier.resource
    });
    
    // Note: Resolution notification happens reactively via the $: statement
  }
  
  // ✨ STANDARD INTERFACE: Dispatch 'resolution' event per ComponentResolutionData
  function notifyResolutionComplete() {
    // Build modifiers array from rolled values
    const resolvedModifiers = diceModifiers.map(mod => {
      const rolledValue = rolledValues.get(mod.originalIndex) ?? 0;
      return {
        type: 'static',
        resource: mod.resource,
        value: rolledValue,
        duration: 'immediate'
      };
    });
    
    dispatch('resolution', {
      isResolved: true,
      modifiers: resolvedModifiers,
      metadata: {
        rolledValues: Object.fromEntries(rolledValues)
      }
    });
  }
  
  // Get display formula (for showing in UI)
  function getDisplayFormula(modifier: any): string {
    const formula = modifier.formula || modifier.value;
    return modifier.negative ? `-${formula}` : formula;
  }
</script>

{#if hasDiceModifiers}
  <div class="dice-rollers">
    <div class="dice-rollers-header">
      <span>Roll for Random Outcomes</span>
    </div>
    <div class="dice-rollers-grid">
      {#each diceModifiers as modifier}
        {@const isResolved = rolledValues.has(modifier.originalIndex)}
        {@const resolvedValue = rolledValues.get(modifier.originalIndex) ?? 0}
        <button 
          class="dice-roller-button" 
          class:resolved={isResolved}
          on:click={() => handleRoll(modifier)}
          disabled={isResolved}
        >
          {#if isResolved}
            <span class="dice-result">{resolvedValue}</span>
            <i class="fas {getResourceIcon(modifier.resource)}"></i>
            <span class="dice-resource">{formatStateChangeLabel(modifier.resource)}</span>
          {:else}
            <i class="fas fa-dice-d20"></i>
            <span class="dice-formula">{getDisplayFormula(modifier)}</span>
            <span class="dice-resource">for {formatStateChangeLabel(modifier.resource)}</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .dice-rollers {
    margin-top: var(--space-8);
    padding: var(--space-10) 0;
    
    .dice-rollers-header {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-8);
    }
    
    .dice-rollers-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-8);
    }
  }
  
  .dice-roller-button {
    padding: var(--space-12) var(--space-16);
    background: var(--hover-low);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
    white-space: nowrap;
    
    &:hover:not(:disabled) {
      background: var(--hover);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-0.125rem);
      box-shadow: 0 0.25rem 0.75rem var(--overlay);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0);
    }
    
    &.resolved {
      background: var(--surface-lowest);
      border-color: rgba(255, 255, 255, 0.5);
      cursor: default;
      opacity: 0.9;
    }
    
    i.fa-dice-d20 {
      color: var(--text-primary);
      font-size: var(--font-xl);
    }
    
    .dice-formula {
      font-family: var(--font-code, monospace);
      font-size: var(--font-lg);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
    }
    
    .dice-result {
      font-family: var(--font-code, monospace);
      font-size: var(--font-md);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
    }
    
    .dice-resource {
      color: var(--text-primary);
    }
    
    i {
      color: var(--text-primary);
    }
  }
</style>
