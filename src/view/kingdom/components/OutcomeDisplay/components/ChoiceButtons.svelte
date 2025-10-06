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
  
  // Get preview label with rolled values
  function getPreviewLabel(choice: any, choiceIndex: number): string {
    let label = choice.label;
    const choiceRolls = rolledDice.get(choiceIndex);
    
    if (choice.modifiers && choiceRolls) {
      choice.modifiers.forEach((modifier: any, modIndex: number) => {
        const rolledValue = choiceRolls.get(modIndex);
        if (rolledValue !== undefined) {
          const placeholder = `{${modifier.resource}}`;
          label = label.replace(new RegExp(placeholder, 'g'), String(Math.abs(rolledValue)));
        }
      });
    }
    
    return label;
  }
  
  function handleRoll(choiceIndex: number, modifierIndex: number, formula: string) {
    const result = rollDiceFormula(formula);
    
    // Update rolled dice map
    const choiceRolls = rolledDice.get(choiceIndex) || new Map();
    choiceRolls.set(modifierIndex, result);
    rolledDice.set(choiceIndex, choiceRolls);
    rolledDice = rolledDice; // Trigger reactivity
    
    console.log(`🎲 [ChoiceButtons] Rolled ${formula} = ${result} for choice ${choiceIndex}, modifier ${modifierIndex}`);
  }
  
  function handleChoiceSelect(index: number) {
    if (!areAllDiceRolled(index)) return;
    
    // Build the choice result with rolled values
    const choice = choices![index];
    const choiceRolls = rolledDice.get(index);
    const resourceValues: Record<string, number> = {};
    
    if (choice.modifiers && choiceRolls) {
      choice.modifiers.forEach((modifier: any, modIndex: number) => {
        const value = modifier.value;
        
        if (typeof value === 'string' && DICE_PATTERN.test(value)) {
          const rolled = choiceRolls.get(modIndex);
          if (rolled !== undefined) {
            resourceValues[modifier.resource] = rolled;
          }
        } else if (typeof value === 'number') {
          resourceValues[modifier.resource] = value;
        }
      });
    }
    
    dispatch('select', { 
      index,
      rolledValues: resourceValues 
    });
  }
</script>

{#if hasChoices && !choicesResolved && choices}
  <div class="choice-buttons">
    <div class="choice-buttons-header">Choose one:</div>
    <div class="choice-cards">
      {#each choices as choice, choiceIndex}
        {@const hasFormulas = hasDiceFormulas(choice)}
        {@const allRolled = areAllDiceRolled(choiceIndex)}
        {@const isSelected = selectedChoice === choiceIndex}
        {@const isDisabled = selectedChoice !== null && selectedChoice !== choiceIndex}
        
        <div class="choice-card {isSelected ? 'selected' : ''} {isDisabled ? 'disabled' : ''}">
          <div class="choice-label">{getPreviewLabel(choice, choiceIndex)}</div>
          
          {#if hasFormulas}
            <div class="dice-section">
              {#each choice.modifiers as modifier, modIndex}
                {#if typeof modifier.value === 'string' && DICE_PATTERN.test(modifier.value)}
                  {@const rolled = rolledDice.get(choiceIndex)?.get(modIndex)}
                  <div class="dice-roller">
                    <span class="dice-formula">{modifier.value}</span>
                    {#if rolled !== undefined}
                      <span class="dice-result">= {Math.abs(rolled)}</span>
                    {:else if !isDisabled}
                      <button 
                        class="roll-button"
                        on:click={() => handleRoll(choiceIndex, modIndex, modifier.value)}
                        disabled={isDisabled}
                      >
                        Roll
                      </button>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
          
          <button
            class="select-button"
            on:click={() => handleChoiceSelect(choiceIndex)}
            disabled={!allRolled || isDisabled}
          >
            {isSelected ? '✓ Selected' : 'Select This Choice'}
          </button>
        </div>
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
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
      
      &:hover:not(.disabled) {
        background: rgba(255, 255, 255, 0.06);
        border-color: var(--border-strong);
      }
      
      &.selected {
        background: rgba(59, 130, 246, 0.15);
        border-color: var(--color-blue);
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
      }
      
      &.disabled {
        opacity: 0.4;
        pointer-events: none;
      }
      
      .choice-label {
        font-size: var(--font-md);
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
        line-height: 1.4;
      }
      
      .dice-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: var(--radius-sm);
        
        .dice-roller {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--font-sm);
          
          .dice-formula {
            color: var(--text-secondary);
            font-family: monospace;
          }
          
          .dice-result {
            color: var(--color-green);
            font-weight: var(--font-weight-semibold);
            font-size: var(--font-md);
          }
          
          .roll-button {
            padding: 4px 10px;
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid var(--color-blue);
            border-radius: var(--radius-sm);
            color: var(--color-blue);
            font-size: var(--font-sm);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            transition: all var(--transition-fast);
            
            &:hover:not(:disabled) {
              background: rgba(59, 130, 246, 0.3);
              transform: translateY(-1px);
            }
            
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }
      
      .select-button {
        padding: 8px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid var(--border-medium);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: var(--font-md);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: all var(--transition-fast);
        
        &:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--border-strong);
          transform: translateY(-1px);
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
      
      &.selected .select-button {
        background: rgba(34, 197, 94, 0.2);
        border-color: var(--color-green);
        color: var(--color-green);
      }
    }
  }
</style>
