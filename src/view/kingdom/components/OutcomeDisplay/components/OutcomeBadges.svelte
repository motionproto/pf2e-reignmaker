<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatStateChangeLabel, formatStateChangeValue, getChangeClass, rollDiceFormula } from '../../../../../services/resolution';
  import { getResourceIcon } from '../../../../kingdom/utils/presentation';
  import type { SpecialEffect } from '../../../../../types/special-effects';
  import type { UnifiedOutcomeBadge, LegacyOutcomeBadge, TemplateSegment } from '../../../../../types/OutcomeBadge';
  import { isLegacyBadge, isUnifiedBadge, convertLegacyBadge, renderBadgeTemplate, renderBadgeToString } from '../../../../../types/OutcomeBadge';
  
  export let stateChanges: Record<string, any> | undefined = undefined;
  export let modifiers: any[] | undefined = undefined;
  export let resolvedDice: Map<number | string, number> = new Map();
  export let manualEffects: string[] | undefined = undefined;
  export let automatedEffects: string[] | undefined = undefined;
  export let outcome: string | undefined = undefined;
  export let hideResources: string[] = [];
  export let customComponentData: any = undefined;
  export let outcomeBadges: Array<UnifiedOutcomeBadge | LegacyOutcomeBadge> = [];
  export let specialEffects: SpecialEffect[] = [];
  
  const dispatch = createEventDispatcher();
  
  // Auto-convert typed dice modifiers to unified badge format
  // Only supports typed format: { type: 'dice', formula: '1d4', resource: '...' }
  $: diceModifierBadges = (modifiers || [])
    .map((mod: any, index: number) => ({ ...mod, originalIndex: index }))
    .filter((mod: any) => mod.type === 'dice' && mod.formula)
    .map((mod: any): UnifiedOutcomeBadge => {
      const formula = mod.formula || mod.value;
      const resource = mod.resource;
      const isNegative = mod.negative || (typeof mod.value === 'string' && mod.value.startsWith('-'));
      
      const rolled = resolvedDice.get(mod.originalIndex);
      
      if (resource === 'imprisonedUnrest') {
        return {
          icon: 'fa-gavel',
          template: 'Remove {{value}} imprisoned unrest',
          value: rolled !== undefined 
            ? { type: 'static', amount: Math.abs(rolled) }
            : { type: 'dice', formula: formula.replace(/^-/, '') },
          variant: 'positive',
          _modifierIndex: mod.originalIndex
        } as any;
      }
      
      const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
      const action = isNegative ? 'Lose' : 'Gain';
      
      return {
        icon: getResourceIcon(resource),
        template: `${action} {{value}} ${resourceName}`,
        value: rolled !== undefined 
          ? { type: 'static', amount: Math.abs(rolled) }
          : { type: 'dice', formula: formula.replace(/^-/, '') },
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
  
  $: unifiedBadges = outcomeBadges.map(badge => 
    isLegacyBadge(badge) ? convertLegacyBadge(badge) : badge
  );
  
  $: allBadges = [...unifiedBadges, ...diceModifierBadges];
  $: hasAllBadges = allBadges.length > 0;
  
  let rolledBadges = new Map<number, number>();
  
  $: diceModifiersToShow = [];
  $: hasDiceModifiers = false;
  
  $: hasAnyContent = hasStateChanges || hasManualEffects || hasAutomatedEffects || showCriticalSuccessFame || hasDiceModifiers || hasCustomCost || hasOutcomeBadges || hasSpecialEffects;
  
  function getResolvedValue(key: string): number | null {
    if (modifiers) {
      const modifierIndex = modifiers.findIndex(m => 
        m.resource === key && m.type === 'dice' && m.formula
      );
      
      if (modifierIndex !== -1) {
        const resolved = resolvedDice.get(modifierIndex);
        if (resolved !== undefined) return resolved;
      }
    }
    
    const stateResolved = resolvedDice.get(`state:${key}`);
    return stateResolved ?? null;
  }
  
  function handleBadgeDiceRoll(badgeIndex: number, formula: string, badge: any) {
    const result = rollDiceFormula(formula);
    rolledBadges.set(badgeIndex, result);
    rolledBadges = rolledBadges;
    
    if (badge._modifierIndex !== undefined) {
      dispatch('roll', {
        modifierIndex: badge._modifierIndex,
        formula,
        result,
        resource: badge.suffix?.toLowerCase() || 'unknown'
      });
    } else {
      dispatch('badgeRoll', {
        badgeIndex,
        formula,
        result
      });
    }
  }
  
  function handleDiceRoll(key: string, formula: string) {
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
    
    const result = rollDiceFormula(formula);
    
    dispatch('roll', {
      modifierIndex: `state:${key}`,
      formula,
      result,
      resource: key
    });
  }
  
  function getModifierLabel(resource: string | undefined, value: any, resolved?: number): string {
    if (!resource) {
      console.warn('[StateChanges] getModifierLabel called with undefined resource:', { resource, value, resolved });
      return `Unknown modifier: ${value}`;
    }
    
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
  
  function getSpecialEffectIcon(effect: SpecialEffect): string {
    if (effect.icon) return effect.icon;
    
    switch (effect.type) {
      case 'attitude':
        return 'fa-handshake';
      case 'resource': {
        const match = effect.message.match(/(?:gained|lost|received)\s+\d+\s+(\w+)/i);
        const resourceType = match ? match[1].toLowerCase() : null;
        if (resourceType) {
          return getResourceIcon(resourceType);
        }
        return 'fa-coins';
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
  
  function getSpecialEffectVariant(effect: SpecialEffect): string {
    if (effect.variant === 'positive') return 'variant-positive';
    if (effect.variant === 'negative') return 'variant-negative';
    return 'variant-info';
  }
  
  function getBadgeVariant(badge: UnifiedOutcomeBadge): string {
    if (badge.variant === 'positive') return 'variant-positive';
    if (badge.variant === 'negative') return 'variant-negative';
    return 'variant-info';
  }
  
  function isBadgeRolled(badgeIndex: number, badge: UnifiedOutcomeBadge): boolean {
    if (!badge.value) return true;
    if (badge.value.type === 'static') return true;
    return badge.value.result !== undefined || rolledBadges.has(badgeIndex);
  }
  
  function renderBadgeSegments(badgeIndex: number, badge: UnifiedOutcomeBadge): TemplateSegment[] {
    const segments = renderBadgeTemplate(badge);
    const localResult = rolledBadges.get(badgeIndex);
    if (localResult !== undefined && badge.value?.type === 'dice') {
      return segments.map(seg => 
        seg.type === 'value' 
          ? { type: 'value', value: { type: 'static', amount: localResult } } as TemplateSegment
          : seg
      );
    }
    
    return segments;
  }
  
  function getValueDisplay(value: { type: string; amount?: number; formula?: string; result?: number }): string {
    if (value.type === 'static') return String(value.amount ?? 0);
    if (value.result !== undefined) return String(value.result);
    return value.formula ?? '';
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
    
    {#if hasSpecialEffects}
      <div class="dice-rollers-section">
        <div class="dice-rollers-header">Special Effects:</div>
        <div class="outcome-badges">
          {#each specialEffects as effect}
            <div class="outcome-badge static {getSpecialEffectVariant(effect)}">
              <div class="content">
                <i class="fas {getSpecialEffectIcon(effect)} resource-icon"></i>
                <div class="text">{effect.message}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    {@const hiddenResources = new Set(hideResources)}
    {@const nonDiceStateChanges = hasStateChanges && stateChanges 
      ? Object.entries(stateChanges).filter(([key]) => !hiddenResources.has(key))
      : []}
    {@const hasOutcomeContent = hasAllBadges || nonDiceStateChanges.length > 0}
    
    {#if hasOutcomeContent}
      <div class="dice-rollers-section">
        <div class="dice-rollers-header">Outcome:</div>
        <div class="outcome-badges">
          {#if hasAllBadges}
            {#each allBadges as badge, index}
              {@const isRolled = isBadgeRolled(index, badge)}
              {@const isDice = badge.value?.type === 'dice'}
              {@const segments = renderBadgeSegments(index, badge)}
              
              <button 
                class="outcome-badge" 
                class:static={isRolled}
                class:rolled={isRolled && isDice}
                class:clickable={!isRolled && isDice}
                class:variant-positive={badge.variant === 'positive'}
                class:variant-negative={badge.variant === 'negative'}
                class:variant-info={!badge.variant}
                disabled={isRolled || !isDice}
                on:click={() => !isRolled && isDice && badge.value?.type === 'dice' ? handleBadgeDiceRoll(index, badge.value.formula, badge) : null}
              >
                <div class="content">
                  <i class="fas {badge.icon} resource-icon"></i>
                  <div class="text">
                    {#each segments as segment}
                      {#if segment.type === 'text'}
                        {segment.content}
                      {:else if segment.type === 'value'}
                        {#if isDice && !isRolled && segment.value.type === 'dice'}
                          <span class="dice-button">{segment.value.formula}</span>
                        {:else}
                          <span class="value">{getValueDisplay(segment.value)}</span>
                        {/if}
                      {/if}
                    {/each}
                  </div>
                </div>
              </button>
            {/each}
          {/if}
          
          {#if nonDiceStateChanges.length > 0}
            {#each nonDiceStateChanges as [key, change]}
              {@const icon = getResourceIcon(key)}
              <div class="outcome-badge static">
                <div class="content">
                  {#if icon}
                    <i class="fas {icon} resource-icon"></i>
                  {/if}
                  <div class="text">
                    {getModifierLabel(key, change, change)}
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
    
    {#if hasCustomCost && customComponentData.cost}
      <div class="dice-rollers-section">
        <div class="dice-rollers-header">Cost:</div>
        <div class="outcome-badges">
          <div class="outcome-badge static cost-badge">
            <div class="content">
              <i class="fas fa-coins resource-icon"></i>
              <div class="text">
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
  
  .outcome-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
  }
  
  .outcome-badge {
    display: flex;
    flex-direction: column;
    padding: var(--space-8);
    background: var(--surface-low);
    border: 2px solid var(--border-medium);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    min-width: 12.5rem;
    width: auto;
    text-align: left;
    min-height: 2.25rem;
    
    &.clickable {
      cursor: pointer;
      background: var(--surface-higher);
      border-color: var(--border-strong);
      
      &:hover {
        background: var(--surface-highest);
        border-color: var(--border-strong);
        transform: translateY(-0.125rem);
        box-shadow: 0 0.25rem 0.75rem var(--overlay-low);
      }
    }
    
    &.rolled {
      background: var(--surface-higher);
      border-color: var(--border-strong);
      box-shadow: 0 0 1rem var(--hover-high);
      opacity: 1;
      cursor: default;
    }
    
    &.static {
      cursor: default;
    }
    
    &.cost-badge {
      background: var(--surface-accent-low);
      border-color: var(--border-accent-medium);
      
      .resource-icon {
        color: var(--color-amber);
      }
    }
    
    &.variant-positive {
      background: var(--surface-success-lower);
      border-color: var(--border-success);
      
      .resource-icon {
        color: var(--color-green);
      }
      
      &.clickable {
        background: var(--surface-success);
        
        &:hover {
          background: var(--surface-success-high);
          border-color: var(--border-success-strong);
        }
      }
    }
    
    &.variant-negative {
      background: var(--surface-danger-lower);
      border-color: var(--border-danger);
      
      .resource-icon {
        color: var(--color-red);
      }
      
      &.clickable {
        background: var(--surface-danger);
        
        &:hover {
          background: var(--surface-danger-high);
          border-color: var(--border-danger-strong);
        }
      }
    }
    
    &.variant-info {
      background: var(--surface-info-lower);
      border-color: var(--border-info);
      
      .resource-icon {
        color: var(--color-blue);
      }
      
      &.clickable {
        background: var(--surface-info);
        
        &:hover {
          background: var(--surface-info-high);
          border-color: var(--border-info-strong);
        }
      }
    }
    
    &.no-effect {
      background: var(--surface-low);
      border-color: var(--border-default);
      
      .resource-icon {
        color: var(--text-muted);
      }
      
      .text {
        color: var(--text-muted);
        font-style: italic;
      }
    }
    
    .content {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      
      .resource-icon {
        font-size: var(--font-lg);
        color: var(--text-primary);
        flex-shrink: 0;
      }
      
    }
    
    .text {
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      color: var(--text-primary);
      line-height: 1.4;
      flex: 1;
      
      .dice-button {
        display: inline-block;
        padding: 0.125rem 0.375rem;
        background: var(--overlay-low);
        border-radius: var(--radius-sm);
        font-family: var(--font-code, monospace);
        font-weight: var(--font-weight-bold);
        color: var(--text-primary);
      }
      
      .value {
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
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
