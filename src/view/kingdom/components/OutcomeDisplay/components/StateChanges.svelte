<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatStateChangeLabel, formatStateChangeValue, getChangeClass, rollDiceFormula } from '../../../../../services/resolution';
  import { getResourceIcon } from '../../../../kingdom/utils/presentation';
  
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
  
  // Get label for a modifier (e.g., "Lose 2d4 Food")
  function getModifierLabel(resource: string, value: any, resolved?: number): string {
    const isNegative = (typeof value === 'string' && value.startsWith('-')) || 
                      (typeof value === 'number' && value < 0) ||
                      (resolved !== undefined && resolved < 0);
    const action = isNegative ? 'Lose' : 'Gain';
    const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
    
    if (resolved !== undefined) {
      return `${action} ${Math.abs(resolved)} ${resourceName}`;
    } else {
      let displayValue = value;
      if (typeof displayValue === 'string') {
        displayValue = displayValue.replace(/^-/, '').replace(/^\((.+)\)$/, '$1');
      }
      return `${action} ${displayValue} ${resourceName}`;
    }
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
      <!-- Show dice rollers from modifiers array - card style like choices -->
      <div class="dice-rollers-section">
        <div class="dice-rollers-header">Roll the outcome:</div>
        <div class="outcome-cards">
        {#each diceModifiersToShow as modifier, index}
          {@const modifierIndex = modifiers?.indexOf(modifier) ?? index}
          {@const resolvedValue = resolvedDice.get(modifierIndex)}
          {@const icon = getResourceIcon(modifier.resource)}
          
          <button 
            class="outcome-card {resolvedValue !== undefined ? 'rolled' : ''}"
            on:click={() => handleDiceRoll(modifier.resource, modifier.value)}
            disabled={resolvedValue !== undefined}
          >
            <div class="card-header">
              {#if icon}
                <i class="fas {icon} resource-icon"></i>
              {/if}
              <div class="card-label">
                {getModifierLabel(modifier.resource, modifier.value, resolvedValue)}
              </div>
              {#if resolvedValue === undefined}
                <span class="dice-indicator">🎲</span>
              {/if}
            </div>
          </button>
        {/each}
        </div>
      </div>
    {/if}
    
    {#if hasStateChanges && stateChanges}
      <!-- Show numeric state changes (non-dice) - card style -->
      <!-- Filter out resources that are already shown in dice section -->
      {@const diceResources = new Set(diceModifiersToShow.map(m => m.resource))}
      {@const hiddenResources = new Set(hideResources)}
      {@const nonDiceStateChanges = Object.entries(stateChanges).filter(([key]) => !diceResources.has(key) && !hiddenResources.has(key))}
      
      {#if nonDiceStateChanges.length > 0}
        <div class="dice-rollers-section">
          <div class="dice-rollers-header">Outcome:</div>
          <div class="outcome-cards">
          {#each nonDiceStateChanges as [key, change]}
            {@const icon = getResourceIcon(key)}
            <div class="outcome-card static">
              <div class="card-header">
                {#if icon}
                  <i class="fas {icon} resource-icon"></i>
                {/if}
                <div class="card-label">
                  {getModifierLabel(key, change, change)}
                </div>
              </div>
            </div>
          {/each}
          </div>
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
  
  .outcome-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .outcome-card {
    display: flex;
    flex-direction: column;
    padding: 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid var(--border-medium);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    min-width: 200px;
    width: auto;
    text-align: left;
    min-height: 54px; /* Ensure consistent height */
    
    &:not(.static):not(.rolled):not(:disabled) {
      cursor: pointer;
      
      &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: var(--border-strong);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    }
    
    &.rolled {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--border-strong);
      box-shadow: 0 0 16px rgba(255, 255, 255, 0.15);
      opacity: 1;
      cursor: default;
    }
    
    &.static {
      cursor: default;
    }
    
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      
      .resource-icon {
        font-size: var(--font-lg);
        color: var(--text-primary);
        flex-shrink: 0;
      }
      
      .dice-indicator {
        color: var(--color-blue);
        font-size: var(--font-lg);
        margin-left: auto;
      }
    }
    
    .card-label {
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      color: var(--text-primary);
      line-height: 1.4;
      flex: 1;
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
</style>
