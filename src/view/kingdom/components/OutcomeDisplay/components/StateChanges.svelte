<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatStateChangeLabel, formatStateChangeValue, getChangeClass, rollDiceFormula } from '../../../../../services/resolution';
  
  export let stateChanges: Record<string, any> | undefined = undefined;
  export let modifiers: any[] | undefined = undefined;
  export let resolvedDice: Map<number | string, number> = new Map();
  export let manualEffects: string[] | undefined = undefined;
  export let outcome: string | undefined = undefined;
  export let hideResources: string[] = []; // Resources to hide (handled elsewhere, e.g., in choice buttons)
  
  const dispatch = createEventDispatcher();
  const DICE_PATTERN = /^-?\d+d\d+([+-]\d+)?$/;
  
  $: hasStateChanges = stateChanges && Object.keys(stateChanges).length > 0;
  $: hasManualEffects = manualEffects && manualEffects.length > 0;
  $: showCriticalSuccessFame = outcome === 'criticalSuccess';
  
  // Extract dice modifiers that should be shown as rollers
  // These are modifiers with dice formulas that are NOT part of resource arrays
  $: diceModifiersToShow = modifiers?.filter(m => 
    !Array.isArray(m.resource) && 
    typeof m.value === 'string' && 
    DICE_PATTERN.test(m.value)
  ) || [];
  $: hasDiceModifiers = diceModifiersToShow.length > 0;
  
  $: hasAnyContent = hasStateChanges || hasManualEffects || showCriticalSuccessFame || hasDiceModifiers;
  
  // Detect if a value is a dice formula
  function isDiceFormula(value: any): boolean {
    return typeof value === 'string' && DICE_PATTERN.test(value);
  }
  
  // Get the resolved value for a dice formula (from modifiers or stateChanges)
  function getResolvedValue(key: string): number | null {
    // First check if it's resolved via modifier index
    if (modifiers) {
      const modifierIndex = modifiers.findIndex(m => 
        m.resource === key && typeof m.value === 'string' && DICE_PATTERN.test(m.value)
      );
      
      if (modifierIndex !== -1) {
        const resolved = resolvedDice.get(modifierIndex);
        if (resolved !== undefined) return resolved;
      }
    }
    
    // Check if it's resolved via stateChange key (prefixed with "state:")
    const stateResolved = resolvedDice.get(`state:${key}`);
    return stateResolved ?? null;
  }
  
  // Handle dice roll
  function handleDiceRoll(key: string, formula: string) {
    // Check if this dice is from modifiers
    if (modifiers) {
      const modifierIndex = modifiers.findIndex(m => 
        m.resource === key && m.value === formula
      );
      
      if (modifierIndex !== -1) {
        const result = rollDiceFormula(formula);
        
        dispatch('roll', {
          modifierIndex,
          formula,
          result,
          resource: key
        });
        return;
      }
    }
    
    // Otherwise it's from stateChanges - use string key with "state:" prefix
    const result = rollDiceFormula(formula);
    
    dispatch('roll', {
      modifierIndex: `state:${key}`,
      formula,
      result,
      resource: key
    });
  }
</script>

{#if hasAnyContent}
  <div class="state-changes">
    {#if showCriticalSuccessFame}
      <div class="critical-success-fame">
        <i class="fas fa-star"></i>
        <span>Fame increased by 1</span>
      </div>
    {/if}
    
    {#if hasManualEffects && manualEffects}
      <div class="manual-effects">
        <div class="manual-effects-header">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Manual Effects - Apply Yourself</span>
        </div>
        <ul class="manual-effects-list">
          {#each manualEffects as effect}
            <li>{effect}</li>
          {/each}
        </ul>
      </div>
    {/if}
    
    {#if hasDiceModifiers}
      <!-- Show dice rollers from modifiers array -->
      <div class="dice-rollers-section">
        <div class="dice-rollers-header">Roll the outcome:</div>
        <div class="state-changes-list">
        {#each diceModifiersToShow as modifier, index}
          {@const modifierIndex = modifiers?.indexOf(modifier) ?? index}
          {@const resolvedValue = resolvedDice.get(modifierIndex)}
          
          <div class="state-change-item">
            <span class="change-label">{formatStateChangeLabel(modifier.resource)}:</span>
            
            {#if resolvedValue === undefined}
              <!-- Unrolled dice - show button -->
              <button 
                class="dice-button"
                on:click={() => handleDiceRoll(modifier.resource, modifier.value)}
              >
                <i class="fas fa-dice-d20"></i>
                {modifier.value}
              </button>
            {:else}
              <!-- Rolled dice - show result -->
              <span class="change-value {getChangeClass(resolvedValue, modifier.resource)}">
                {formatStateChangeValue(resolvedValue)}
              </span>
            {/if}
          </div>
        {/each}
        </div>
      </div>
    {/if}
    
    {#if hasStateChanges && stateChanges}
      <!-- Show numeric state changes (non-dice) -->
      <!-- Filter out resources that are already shown in dice section -->
      {@const diceResources = new Set(diceModifiersToShow.map(m => m.resource))}
      {@const hiddenResources = new Set(hideResources)}
      {@const nonDiceStateChanges = Object.entries(stateChanges).filter(([key]) => !diceResources.has(key) && !hiddenResources.has(key))}
      
      {#if nonDiceStateChanges.length > 0}
        <div class="state-changes-list">
        {#each nonDiceStateChanges as [key, change]}
          <div class="state-change-item">
            <span class="change-label">{formatStateChangeLabel(key)}:</span>
            <span class="change-value {getChangeClass(change, key)}">
              {formatStateChangeValue(change)}
            </span>
          </div>
        {/each}
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style lang="scss">
  .state-changes {
    margin-top: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .dice-rollers-section {
    .dice-rollers-header {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: 12px;
    }
  }
  
  .critical-success-fame {
    padding: 12px 16px;
    background: linear-gradient(135deg, 
      rgba(34, 197, 94, 0.2),
      rgba(34, 197, 94, 0.1));
    border: 2px solid rgba(34, 197, 94, 0.5);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-green);
    
    i {
      font-size: 20px;
      color: #fbbf24;
      text-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
    }
    
    span {
      flex: 1;
    }
  }
  
  .manual-effects {
    padding: 14px 16px;
    background: linear-gradient(135deg, 
      rgba(251, 146, 60, 0.15),
      rgba(251, 146, 60, 0.05));
    border: 2px solid rgba(251, 146, 60, 0.4);
    border-radius: var(--radius-sm);
    
    .manual-effects-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: rgba(251, 146, 60, 1);
      margin-bottom: 10px;
      
      i {
        font-size: 18px;
      }
    }
    
    .manual-effects-list {
      margin: 0;
      padding-left: 24px;
      list-style-type: disc;
      
      li {
        color: var(--text-primary);
        font-size: var(--font-md);
        line-height: 1.6;
        margin-bottom: 6px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
  
  .state-changes-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .state-change-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    font-size: var(--font-md);
    width: auto;
    min-width: 180px;
    
    .change-label {
      color: var(--text-secondary);
      font-weight: var(--font-weight-medium);
      font-size: calc(var(--font-md) * 0.95);
    }
    
    .change-value {
      font-weight: var(--font-weight-bold);
      font-family: var(--font-code, monospace);
      font-size: calc(var(--font-md) * 1.1);
      padding: 2px 6px;
      border-radius: 3px;
      
      &.positive {
        color: var(--color-green);
        background: rgba(34, 197, 94, 0.1);
        border: 1px solid rgba(34, 197, 94, 0.2);
      }
      
      &.negative {
        color: var(--color-red);
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
      }
      
      &.neutral {
        color: var(--text-primary);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-subtle);
      }
    }
    
    .dice-button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-family: var(--font-code, monospace);
      font-size: calc(var(--font-md) * 1.05);
      font-weight: var(--font-weight-bold);
      cursor: pointer;
      transition: all var(--transition-fast);
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--border-default);
        transform: translateY(-1px);
      }
      
      &:active {
        transform: translateY(0);
      }
      
      i {
        font-size: 14px;
        color: var(--text-primary);
      }
    }
  }
</style>
