<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { detectDiceModifiers, rollDiceFormula, formatStateChangeLabel } from '../../../../../services/resolution';
  
  export let modifiers: any[] | undefined;
  export let resolvedDice: Map<number | string, number>;
  
  const dispatch = createEventDispatcher();
  
  $: diceModifiers = detectDiceModifiers(modifiers);
  $: hasDiceModifiers = diceModifiers.length > 0;
  $: allResolved = hasDiceModifiers && diceModifiers.every(m => resolvedDice.has(m.originalIndex));
  
  function handleRoll(modifier: any) {
    // Extract formula from either typed format (formula field) or legacy format (value field)
    const formula = modifier.formula || modifier.value;
    
    // Roll the dice
    const rolled = rollDiceFormula(formula);
    
    // Apply negative flag if present (typed format)
    const finalResult = modifier.negative ? -rolled : rolled;
    
    dispatch('roll', {
      modifierIndex: modifier.originalIndex,
      formula: formula,
      result: finalResult,
      resource: modifier.resource
    });
  }
  
  // Get display formula (for showing in UI)
  function getDisplayFormula(modifier: any): string {
    const formula = modifier.formula || modifier.value;
    return modifier.negative ? `-${formula}` : formula;
  }
</script>

{#if hasDiceModifiers && !allResolved}
  <div class="dice-rollers">
    <div class="dice-rollers-header">
      <i class="fas fa-dice-d20"></i>
      <span>Roll for Random Outcomes</span>
    </div>
    {#each diceModifiers as modifier}
      {#if !resolvedDice.has(modifier.originalIndex)}
        <button class="dice-roller-button" on:click={() => handleRoll(modifier)}>
          <i class="fas fa-dice-d20"></i>
          <span class="dice-formula">{getDisplayFormula(modifier)}</span>
          <span class="dice-resource">for {formatStateChangeLabel(modifier.resource)}</span>
          <i class="fas fa-arrow-right"></i>
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style lang="scss">
  .dice-rollers {
    margin-top: var(--space-10);
    padding: var(--space-12) var(--space-16);
    background: linear-gradient(135deg, 
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.03));
    border: 2px solid var(--border-medium);
    border-radius: var(--radius-sm);
    
    .dice-rollers-header {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-10);
      
      i {
        font-size: var(--font-lg);
      }
    }
  }
  
  .dice-roller-button {
    width: 100%;
    padding: var(--space-12) var(--space-16);
    margin-bottom: var(--space-8);
    background: var(--hover-low);
    border: 2px solid var(--border-faint);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    gap: var(--space-12);
    
    &:last-child {
      margin-bottom: 0;
    }
    
    &:hover {
      background: var(--hover);
      border-color: var(--border-subtle);
      transform: translateY(-0.125rem);
      box-shadow: 0 0.25rem 0.75rem var(--overlay);
    }
    
    &:active {
      transform: translateY(0);
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
      padding: var(--space-2) var(--space-8);
      background: var(--hover);
      border-radius: var(--radius-xs);
    }
    
    .dice-resource {
      flex: 1;
      text-align: left;
      color: var(--text-secondary);
    }
    
    i.fa-arrow-right {
      color: var(--text-secondary);
      font-size: var(--font-sm);
    }
  }
</style>
