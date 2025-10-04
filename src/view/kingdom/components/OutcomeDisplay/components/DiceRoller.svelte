<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { detectDiceModifiers, rollDiceFormula, formatStateChangeLabel } from '../logic/OutcomeDisplayLogic';
  
  export let modifiers: any[] | undefined;
  export let resolvedDice: Map<number, number>;
  
  const dispatch = createEventDispatcher();
  
  $: diceModifiers = detectDiceModifiers(modifiers);
  $: hasDiceModifiers = diceModifiers.length > 0;
  $: allResolved = hasDiceModifiers && diceModifiers.every(m => resolvedDice.has(m.originalIndex));
  
  function handleRoll(modifier: any) {
    const rolled = rollDiceFormula(modifier.value);
    dispatch('roll', {
      modifierIndex: modifier.originalIndex,
      formula: modifier.value,
      result: rolled,
      resource: modifier.resource
    });
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
          <span class="dice-formula">{modifier.value}</span>
          <span class="dice-resource">for {formatStateChangeLabel(modifier.resource)}</span>
          <i class="fas fa-arrow-right"></i>
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style lang="scss">
  .dice-rollers {
    margin-top: 10px;
    padding: 14px 16px;
    background: linear-gradient(135deg, 
      rgba(168, 85, 247, 0.15),
      rgba(168, 85, 247, 0.05));
    border: 2px solid rgba(168, 85, 247, 0.4);
    border-radius: var(--radius-sm);
    
    .dice-rollers-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: rgba(168, 85, 247, 1);
      margin-bottom: 10px;
      
      i {
        font-size: 18px;
      }
    }
  }
  
  .dice-roller-button {
    width: 100%;
    padding: 12px 16px;
    margin-bottom: 8px;
    background: rgba(168, 85, 247, 0.1);
    border: 2px solid rgba(168, 85, 247, 0.3);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    gap: 12px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    &:hover {
      background: rgba(168, 85, 247, 0.2);
      border-color: rgba(168, 85, 247, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    i.fa-dice-d20 {
      color: rgba(168, 85, 247, 1);
      font-size: 20px;
    }
    
    .dice-formula {
      font-family: var(--font-code, monospace);
      font-size: var(--font-lg);
      font-weight: var(--font-weight-bold);
      color: rgba(168, 85, 247, 1);
      padding: 2px 8px;
      background: rgba(168, 85, 247, 0.15);
      border-radius: var(--radius-xs);
    }
    
    .dice-resource {
      flex: 1;
      text-align: left;
      color: var(--text-secondary);
    }
    
    i.fa-arrow-right {
      color: var(--text-secondary);
      font-size: 14px;
    }
  }
</style>
