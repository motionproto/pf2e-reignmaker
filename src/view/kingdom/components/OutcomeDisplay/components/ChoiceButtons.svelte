<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { rollDiceFormula } from '../../../../../services/resolution';
  
  export let choices: any[] | undefined = undefined;
  export let selectedChoice: number | null = null;
  export let choicesResolved: boolean = false;
  
  const dispatch = createEventDispatcher();
  const DICE_PATTERN = /^-?\(?\d+d\d+([+-]\d+)?\)?$|^-?\d+d\d+([+-]\d+)?$/;
  
  // Track rolled dice values per choice
  let rolledDice: Map<number, Map<number, number>> = new Map();
  // Track rolling state per choice
  let rollingStates: Map<number, boolean> = new Map();
  // Force reactivity trigger
  let rolledDiceVersion = 0;
  
  $: hasChoices = choices && choices.length > 0;
  
  // Check if a choice has dice formulas
  function hasDiceFormulas(choice: any): boolean {
    if (!choice.modifiers) return false;
    return choice.modifiers.some((m: any) => 
      typeof m.value === 'string' && DICE_PATTERN.test(m.value)
    );
  }
  
  // Check if all dice for a choice are rolled
  function areAllDiceRolled(choiceIndex: number): boolean {
    const choice = choices![choiceIndex];
    if (!hasDiceFormulas(choice)) return true;
    
    const choiceRolls = rolledDice.get(choiceIndex);
    if (!choiceRolls) return false;
    
    const diceCount = choice.modifiers.filter((m: any) => 
      typeof m.value === 'string' && DICE_PATTERN.test(m.value)
    ).length;
    
    return choiceRolls.size >= diceCount;
  }
  
  // Get preview label with formula or rolled values
  function getPreviewLabel(choice: any, choiceIndex: number): string {
    if (!choice.modifiers || choice.modifiers.length === 0) {
      return choice.label;
    }
    
    const choiceRolls = rolledDice.get(choiceIndex);
    const modifier = choice.modifiers[0]; // Get first modifier
    const resource = modifier.resource;
    const rolledValue = choiceRolls?.get(0);

    // Determine action (Lose/Gain) from explicit negative field
    const action = modifier.negative ? 'Lose' : 'Gain';
    
    // Capitalize resource name
    const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
    
    if (rolledValue !== undefined) {
      // Show rolled value: "Lose 7 Lumber"
      return `${action} ${Math.abs(rolledValue)} ${resourceName}`;
    } else {
      // Show formula: "Lose 2d4+1 Lumber"
      let formula = modifier.value;
      if (typeof formula === 'string') {
        // Remove leading minus sign if present (negative flag handles this)
        if (formula.startsWith('-')) {
          formula = formula.substring(1);
        }
        formula = formula.replace(/^\\((.+)\\)$/, '$1');
      }
      return `${action} ${formula} ${resourceName}`;
    }
  }
  
  async function handleCardClick(choiceIndex: number) {
    // If already selected, deselect
    if (selectedChoice === choiceIndex) {
      dispatch('select', { 
        index: null,
        rolledValues: {} 
      });
      return;
    }
    
    // If disabled (another choice selected), ignore
    if (selectedChoice !== null && selectedChoice !== choiceIndex) {
      return;
    }
    
    const choice = choices![choiceIndex];
    
    // If choice has dice formulas, roll them all first
    if (hasDiceFormulas(choice) && !areAllDiceRolled(choiceIndex)) {
      rollingStates.set(choiceIndex, true);
      rollingStates = rollingStates;
      
      const choiceRolls = new Map();
      
      for (let modIndex = 0; modIndex < choice.modifiers.length; modIndex++) {
        const modifier = choice.modifiers[modIndex];
        const value = modifier.value;
        
        if (typeof value === 'string' && DICE_PATTERN.test(value)) {
          // Add small delay for visual effect
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const result = rollDiceFormula(value);
          choiceRolls.set(modIndex, result);

        }
      }
      
      rolledDice.set(choiceIndex, choiceRolls);
      rolledDice = rolledDice;
      rolledDiceVersion++; // Force reactivity
      
      rollingStates.set(choiceIndex, false);
      rollingStates = rollingStates;
    }
    
    // Build the choice result with rolled values
    const choiceRolls = rolledDice.get(choiceIndex);
    const resourceValues: Record<string, number> = {};
    
    if (choice.modifiers) {
      choice.modifiers.forEach((modifier: any, modIndex: number) => {
        const value = modifier.value;
        let finalValue: number | undefined;
        
        if (typeof value === 'string' && DICE_PATTERN.test(value)) {
          const rolled = choiceRolls?.get(modIndex);
          if (rolled !== undefined) {
            finalValue = rolled;
          }
        } else if (typeof value === 'number') {
          finalValue = value;
        }
        
        // Apply negative sign if needed
        if (finalValue !== undefined) {
          resourceValues[modifier.resource] = modifier.negative ? -Math.abs(finalValue) : Math.abs(finalValue);
        }
      });
    }
    
    dispatch('select', { 
      index: choiceIndex,
      rolledValues: resourceValues 
    });
  }
</script>

{#if hasChoices && choices}
  <div class="choice-buttons">
    <div class="choice-buttons-header">Choose one:</div>
    <div class="choice-cards">
      {#each choices as choice, choiceIndex}
        {@const hasFormulas = hasDiceFormulas(choice)}
        {@const isSelected = selectedChoice === choiceIndex}
        {@const isFaded = choicesResolved && selectedChoice !== choiceIndex}
        {@const isRolling = rollingStates.get(choiceIndex) || false}
        
        <button 
          class="choice-card {isSelected ? 'selected' : ''} {isFaded ? 'faded' : ''} {isRolling ? 'rolling' : ''}"
          on:click={() => handleCardClick(choiceIndex)}
          disabled={choicesResolved || isRolling}
        >
          <div class="choice-header">
            {#if choice.icon}
              <i class="fas {choice.icon} resource-icon"></i>
            {/if}
            <div class="choice-label">{@html ''}{getPreviewLabel(choice, choiceIndex + rolledDiceVersion * 0)}</div>
            {#if isRolling}
              <span class="rolling-indicator">🎲</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .choice-buttons {
    margin-top: 10px;
    
    .choice-buttons-header {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: 12px;
    }
    
    .choice-cards {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    
    .choice-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 2px solid var(--border-medium);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      cursor: pointer;
      text-align: left;
      min-width: 200px;
      width: auto;
      
      &:hover:not(.disabled):not(.rolling) {
        background: rgba(255, 255, 255, 0.06);
        border-color: var(--border-strong);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      &.selected {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--border-strong);
        box-shadow: 0 0 16px rgba(255, 255, 255, 0.15);
        opacity: 1;
      }
      
      &.faded {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }
      
      &.rolling {
        opacity: 0.7;
        cursor: wait;
      }
      
      .choice-header {
        display: flex;
        align-items: center;
        gap: 10px;
        
        .resource-icon {
          font-size: var(--font-lg);
          color: var(--text-primary);
          flex-shrink: 0;
        }
        
        .rolling-indicator {
          color: var(--color-blue);
          font-size: var(--font-lg);
          animation: spin 1s linear infinite;
          margin-left: auto;
        }
      }
      
      .choice-label {
        font-size: var(--font-md);
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
        line-height: 1.4;
        flex: 1;
      }
      
    }
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
