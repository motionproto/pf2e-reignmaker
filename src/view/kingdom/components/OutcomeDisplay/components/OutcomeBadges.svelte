<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatStateChangeLabel, formatStateChangeValue, getChangeClass, rollDiceFormula } from '../../../../../services/resolution';
  import { getResourceIcon } from '../../../../kingdom/utils/presentation';
  import type { SpecialEffect } from '../../../../../types/special-effects';
  import type { UnifiedOutcomeBadge, LegacyOutcomeBadge } from '../../../../../types/OutcomeBadge';
  import { isLegacyBadge, isUnifiedBadge, convertLegacyBadge } from '../../../../../types/OutcomeBadge';
  
  export let stateChanges: Record<string, any> | undefined = undefined;
  export let modifiers: any[] | undefined = undefined;
  export let resolvedDice: Map<number | string, number> = new Map();
  export let manualEffects: string[] | undefined = undefined;
  export let automatedEffects: string[] | undefined = undefined;  // Automated effects (already applied)
  export let outcome: string | undefined = undefined;
  export let hideResources: string[] = []; // Resources to hide (handled elsewhere, e.g., in choice buttons)
  export let customComponentData: any = undefined; // For custom component data (e.g., upgrade cost)
  export let outcomeBadges: Array<UnifiedOutcomeBadge | LegacyOutcomeBadge> = []; // Custom outcome badges (NEW: unified format)
  export let specialEffects: SpecialEffect[] = []; // Special effects (narrative/qualitative effects)
  
  const dispatch = createEventDispatcher();
  const DICE_PATTERN = /^-?\d+d\d+([+-]\d+)?$/;
  
  // ✅ AUTO-CONVERT dice modifiers to badges
  // This makes ALL actions with dice modifiers automatically use the unified badge system
  $: diceModifierBadges = (modifiers || [])
    .map((mod: any, index: number) => ({ ...mod, originalIndex: index }))
    .filter((mod: any) => {
      // Detect dice modifiers (both legacy and typed formats)
      const hasLegacyDice = typeof mod.value === 'string' && DICE_PATTERN.test(mod.value);
      const hasTypedDice = mod.type === 'dice' && mod.formula;
      return hasLegacyDice || hasTypedDice;
    })
    .map((mod: any): UnifiedOutcomeBadge => {
      const formula = mod.formula || mod.value;
      const resource = mod.resource;
      const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
      const isNegative = mod.negative || (typeof mod.value === 'string' && mod.value.startsWith('-'));
      const action = isNegative ? 'Lose' : 'Gain';
      
      // Check if already rolled
      const rolled = resolvedDice.get(mod.originalIndex);
      
      return {
        icon: getResourceIcon(resource),
        prefix: action,
        value: rolled !== undefined 
          ? { type: 'static', amount: Math.abs(rolled) }
          : { type: 'dice', formula: formula.replace(/^-/, '') },
        suffix: resourceName,
        variant: isNegative ? 'negative' : 'positive',
        _modifierIndex: mod.originalIndex
      } as any;
    });
  
  $: hasStateChanges = stateChanges && Object.keys(stateChanges).length > 0;
  $: hasManualEffects = manualEffects && manualEffects.length > 0;
  $: hasAutomatedEffects = automatedEffects && automatedEffects.length > 0;
  $: showCriticalSuccessFame = outcome === 'criticalSuccess';
  $: hasCustomCost = customComponentData && typeof customComponentData.cost === 'number';
  $: hasOutcomeBadges = outcomeBadges && outcomeBadges.length > 0;
  $: hasSpecialEffects = specialEffects && specialEffects.length > 0;
  
  // Convert all badges to unified format (for consistent rendering)
  $: unifiedBadges = outcomeBadges.map(badge => 
    isLegacyBadge(badge) ? convertLegacyBadge(badge) : badge
  );
  
  // Combine explicit badges with auto-converted modifier badges
  $: allBadges = [...unifiedBadges, ...diceModifierBadges];
  $: hasAllBadges = allBadges.length > 0;
  
  // Track rolled dice badges locally (badge index -> result)
  let rolledBadges = new Map<number, number>();
  
  // StateChanges does NOT render dice rollers - that's DiceRoller.svelte's job
  // This component only shows RESOLVED dice results and static modifiers
  $: diceModifiersToShow = [];
  $: hasDiceModifiers = false;
  
  $: hasAnyContent = hasStateChanges || hasManualEffects || hasAutomatedEffects || showCriticalSuccessFame || hasDiceModifiers || hasCustomCost || hasOutcomeBadges || hasSpecialEffects;
  
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
  
  // Handle dice roll for unified badges
  function handleBadgeDiceRoll(badgeIndex: number, formula: string, badge: any) {
    const result = rollDiceFormula(formula);
    
    // Store locally for UI update
    rolledBadges.set(badgeIndex, result);
    rolledBadges = rolledBadges; // Trigger reactivity
    
    // Check if this is a modifier-based badge (auto-converted)
    // If so, dispatch with modifier index for proper tracking
    if (badge._modifierIndex !== undefined) {
      dispatch('roll', {
        modifierIndex: badge._modifierIndex,
        formula,
        result,
        resource: badge.suffix?.toLowerCase() || 'unknown'
      });
    } else {
      // Explicit badge - use badge index
      dispatch('badgeRoll', {
        badgeIndex,
        formula,
        result
      });
    }
  }
  
  // Handle dice roll for state changes (legacy)
  function handleDiceRoll(key: string, formula: string) {
    // Check if this dice is from modifiers
    if (modifiers) {
      const modifierIndex = modifiers.findIndex(m => 
        m.resource === key && (m.value === formula || m.formula === formula)
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
  function getModifierLabel(resource: string | undefined, value: any, resolved?: number): string {
    // Handle undefined or empty resource (should not happen after filtering)
    if (!resource) {
      console.warn('[StateChanges] getModifierLabel called with undefined resource:', { resource, value, resolved });
      return `Unknown modifier: ${value}`;
    }
    
    // Special handling for "imprisoned" pseudo-resource (UI-only)
    if (resource === 'imprisoned') {
      if (resolved !== undefined) {
        return `Remove ${resolved} imprisoned unrest`;
      } else {
        let displayValue = value;
        if (typeof displayValue === 'string') {
          displayValue = displayValue.replace(/^-/, '').replace(/^\((.+)\)$/, '$1');
        }
        return `Remove ${displayValue} imprisoned unrest`;
      }
    }
    
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
  
  // Get icon for special effect type if not explicitly provided
  function getSpecialEffectIcon(effect: SpecialEffect): string {
    if (effect.icon) return effect.icon;
    
    switch (effect.type) {
      case 'attitude':
        return 'fa-handshake';
      case 'resource': {
        // Try to extract resource type from message for specific icon
        const match = effect.message.match(/(?:gained|lost|received)\s+\d+\s+(\w+)/i);
        const resourceType = match ? match[1].toLowerCase() : null;
        if (resourceType) {
          return getResourceIcon(resourceType);
        }
        return 'fa-coins'; // Fallback to generic coins icon
      }
      case 'status':
        return 'fa-flag';
      case 'damage':
        return 'fa-hammer';
      case 'hex':
        return 'fa-map';
      case 'info':
      default:
        return 'fa-info-circle';
    }
  }
  
  // Get variant class for special effect styling
  function getSpecialEffectVariant(effect: SpecialEffect): string {
    switch (effect.variant) {
      case 'positive':
        return 'variant-positive';
      case 'negative':
        return 'variant-negative';
      case 'neutral':
      default:
        return 'variant-neutral';
    }
  }
  
  // Get variant class for unified badge
  function getBadgeVariant(badge: UnifiedOutcomeBadge): string {
    if (badge.variant === 'positive') return 'variant-positive';
    if (badge.variant === 'negative') return 'variant-negative';
    return 'variant-neutral';
  }
  
  // Check if a badge has been rolled
  function isBadgeRolled(badgeIndex: number, badge: UnifiedOutcomeBadge): boolean {
    if (badge.value.type === 'static') return true; // Static badges are always "rolled"
    return badge.value.result !== undefined || rolledBadges.has(badgeIndex);
  }
  
  // Get badge display value (static or rolled dice)
  function getBadgeValue(badgeIndex: number, badge: UnifiedOutcomeBadge): string | number {
    if (badge.value.type === 'static') {
      return badge.value.amount;
    }
    
    // Dice badge
    if (badge.value.result !== undefined) {
      return badge.value.result; // Already resolved in data
    }
    
    const localResult = rolledBadges.get(badgeIndex);
    if (localResult !== undefined) {
      return localResult; // Resolved locally
    }
    
    return badge.value.formula; // Unrolled
  }
</script>

<div class="state-changes">
  {#if hasAnyContent}
    {#if showCriticalSuccessFame}
      <div class="critical-success-fame">
        <i class="fas fa-star"></i>
        <span>Fame increased by 1</span>
      </div>
    {/if}
    
    {#if hasAutomatedEffects && automatedEffects}
      <div class="automated-effects">
        {#each automatedEffects as effect}
          <p class="effect-message">{effect}</p>
        {/each}
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
    
    <!-- Show special effects (narrative/qualitative effects) -->
    {#if hasSpecialEffects}
      <div class="dice-rollers-section">
        <div class="dice-rollers-header">Special Effects:</div>
        <div class="outcome-cards">
          {#each specialEffects as effect}
            <div class="outcome-card static {getSpecialEffectVariant(effect)}">
              <div class="card-header">
                <i class="fas {getSpecialEffectIcon(effect)} resource-icon"></i>
                <div class="card-label">{effect.message}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- UNIFIED: Show custom outcome badges AND state changes under ONE "Outcome:" header -->
    {@const hiddenResources = new Set(hideResources)}
    {@const nonDiceStateChanges = hasStateChanges && stateChanges 
      ? Object.entries(stateChanges).filter(([key]) => !hiddenResources.has(key))
      : []}
    {@const hasOutcomeContent = hasAllBadges || nonDiceStateChanges.length > 0}
    
    {#if hasOutcomeContent}
      <div class="dice-rollers-section">
        <div class="dice-rollers-header">Outcome:</div>
        <div class="outcome-cards">
          <!-- Show unified outcome badges (static + dice) + auto-converted modifiers -->
          {#if hasAllBadges}
            {#each allBadges as badge, index}
              {@const isRolled = isBadgeRolled(index, badge)}
              {@const displayValue = getBadgeValue(index, badge)}
              {@const isDice = badge.value.type === 'dice'}
              
              <button 
                class="outcome-card" 
                class:static={isRolled}
                class:rolled={isRolled && isDice}
                class:clickable={!isRolled}
                class:variant-positive={badge.variant === 'positive'}
                class:variant-negative={badge.variant === 'negative'}
                class:variant-neutral={!badge.variant || badge.variant === 'neutral'}
                disabled={isRolled}
                on:click={() => !isRolled && isDice && badge.value.type === 'dice' ? handleBadgeDiceRoll(index, badge.value.formula, badge) : null}
              >
                <div class="card-header">
                  <i class="fas {badge.icon} resource-icon"></i>
                  <div class="card-label">
                    {#if badge.prefix}{badge.prefix}{/if}
                    {#if isDice && !isRolled}
                      <span class="dice-button">🎲 {displayValue}</span>
                    {:else}
                      <span class="value">{displayValue}</span>
                    {/if}
                    {#if badge.suffix}{badge.suffix}{/if}
                  </div>
                </div>
              </button>
            {/each}
          {/if}
          
          <!-- Then show numeric state changes (legacy) -->
          {#if nonDiceStateChanges.length > 0}
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
          {/if}
        </div>
      </div>
    {/if}
    
    <!-- Show custom cost (e.g., from upgrade settlement) -->
    {#if hasCustomCost && customComponentData.cost}
      <div class="dice-rollers-section">
        <div class="dice-rollers-header">Cost:</div>
        <div class="outcome-cards">
          <div class="outcome-card static cost-card">
            <div class="card-header">
              <i class="fas fa-coins resource-icon"></i>
              <div class="card-label">
                {#if customComponentData.settlementName}
                  Lose {customComponentData.cost} Gold (upgrade {customComponentData.settlementName} {customComponentData.currentLevel} → {customComponentData.newLevel})
                {:else}
                  Lose {customComponentData.cost} Gold
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .state-changes {
    margin-top: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .dice-rollers-section {
    .dice-rollers-header {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin-bottom: var(--space-12);
    }
  }
  
  .outcome-cards {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
  }
  
  .outcome-card {
    display: flex;
    flex-direction: column;
    padding: var(--space-8);
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid var(--border-medium);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    min-width: 12.5rem;
    width: auto;
    text-align: left;
    min-height: 2.25rem;
    
    &.clickable {
      cursor: pointer;
      
      &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: var(--border-strong);
        transform: translateY(-0.125rem);
        box-shadow: 0 0.25rem 0.75rem var(--overlay-low);
      }
    }
    
    &.rolled {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--border-strong);
      box-shadow: 0 0 1rem var(--hover-high);
      opacity: 1;
      cursor: default;
    }
    
    &.static {
      cursor: default;
    }
    
    &.cost-card {
      background: rgba(234, 179, 8, 0.1);
      border-color: rgba(234, 179, 8, 0.4);
      
      .resource-icon {
        color: rgb(234, 179, 8);
      }
    }
    
    &.variant-positive {
      background: rgba(34, 197, 94, 0.1);
      border-color: var(--border-success-medium);
      
      .resource-icon {
        color: var(--color-green);
      }
    }
    
    &.variant-negative {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--border-primary-medium);
      
      .resource-icon {
        color: var(--color-red);
      }
    }
    
    &.variant-neutral {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.4);
      
      .resource-icon {
        color: rgb(59, 130, 246);
      }
    }
    
    &.no-effect {
      background: rgba(128, 128, 128, 0.05);
      border-color: var(--border-default);
      
      .resource-icon {
        color: rgba(255, 255, 255, 0.5);
      }
      
      .card-label {
        color: rgba(255, 255, 255, 0.6);
        font-style: italic;
      }
    }
    
    .card-header {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      
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
      
      .dice-button {
        display: inline-block;
        padding: 0.125rem 0.375rem;
        background: rgba(59, 130, 246, 0.2);
        border-radius: var(--radius-sm);
        font-family: var(--font-code, monospace);
        font-weight: var(--font-weight-bold);
        color: rgb(59, 130, 246);
      }
      
      .value {
        font-weight: var(--font-weight-semibold);
      }
    }
  }
  
  .critical-success-fame {
    padding: var(--space-12) var(--space-16);
    background: linear-gradient(135deg, 
      var(--surface-success-high),
      var(--surface-success-low));
    border: 2px solid var(--border-success-medium);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: var(--space-10);
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-green);
    
    i {
      font-size: var(--font-xl);
      color: #fbbf24;
      text-shadow: 0 0 0.5rem rgba(251, 191, 36, 0.6);
    }
    
    span {
      flex: 1;
    }
  }
  
  .automated-effects {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    
    .effect-message {
      margin: 0;
      padding: var(--space-8) 0;
      color: var(--text-primary);
      font-size: var(--font-md);
      line-height: 1.6;
    }
  }
  
  .manual-effects {
    padding: var(--space-12) var(--space-16);
    background: linear-gradient(135deg, 
      rgba(251, 146, 60, 0.15),
      rgba(251, 146, 60, 0.05));
    border: 2px solid var(--border-accent);
    border-radius: var(--radius-sm);
    
    .manual-effects-header {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: rgba(251, 146, 60, 1);
      margin-bottom: var(--space-10);
      
      i {
        font-size: var(--font-lg);
      }
    }
    
    .manual-effects-list {
      margin: 0;
      padding-left: var(--space-24);
      list-style-type: disc;
      
      li {
        color: var(--text-primary);
        font-size: var(--font-md);
        line-height: 1.6;
        margin-bottom: var(--space-6);
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
</style>
