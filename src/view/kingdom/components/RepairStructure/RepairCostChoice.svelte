<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { updateInstanceResolutionState } from '../../../../controllers/shared/ResolutionStateHelpers';
  import type { OutcomePreview } from '../../../../models/OutcomePreview';
  import type { ResourceCost } from '../../../../models/Structure';
  import { getResourceIcon, getResourceColor } from '../../utils/presentation';
  import { logger } from '../../../../utils/Logger';
  
  // Props passed from OutcomeDisplay
  export let instance: OutcomePreview | null = null;
  export let outcome: string;
  
  // Read structureId/settlementId from instance metadata
  $: structureId = instance?.metadata?.structureId || '';
  $: settlementId = instance?.metadata?.settlementId || '';
  
  const dispatch = createEventDispatcher();
  
  // UI State only
  let diceRollResult: number | null = null;
  let isRolling: boolean = false;
  let halfCost: ResourceCost = {};
  let halfCostLoaded: boolean = false;
  let structureTier: number = 1;
  let selectedCostType: string | null = null;
  
  // Load half cost and tier from service (presentation data)
  $: if (structureId && !halfCostLoaded) {
    loadHalfCost();
  }
  
  async function loadHalfCost() {
    if (!structureId) return;
    
    const { structuresService } = await import('../../../../services/structures');
    const structure = structuresService.getStructure(structureId);
    
    if (structure) {
      halfCost = structuresService.calculateHalfBuildCost(structure);
      structureTier = structure.tier;
      halfCostLoaded = true;
    }
  }
  
  async function selectDiceOption() {
    // Prevent changing selection once made
    if (selectedCostType) return;
    
    isRolling = true;
    
    // Roll tier × d4 (e.g., tier 3 = 3d4)
    let total = 0;
    for (let i = 0; i < structureTier; i++) {
      total += Math.floor(Math.random() * 4) + 1;
    }
    diceRollResult = total;
    isRolling = false;
    
    // Mark as selected
    selectedCostType = 'dice';
    
    // Create cost as plain object (not Map) for proper serialization
    const costObj = { gold: total };

    // Data to store (includes structure IDs from dialog + cost from user choice)
    const metadata = {
      repairCost: {  // Wrap in repairCost key so execute can find it
        costType: 'dice',
        cost: costObj,
        structureId,
        settlementId
      }
    };

    // Store selection in instance (like choice buttons do)
    if (instance) {
      await updateInstanceResolutionState(instance.instanceId, {
        customComponentData: metadata
      });
    } else {
      logger.error('❌ [RepairCostChoice] No instance available to store cost');
    }
    
    // Dispatch resolution event to OutcomeDisplay (standard pattern)
    dispatch('resolution', {
      isResolved: true,
      modifiers: [],
      metadata
    });
  }
  
  async function selectHalfOption() {
    // Prevent changing selection once made
    if (selectedCostType) return;
    
    // Mark as selected
    selectedCostType = 'half';
    
    // Data to store (includes structure IDs from dialog + cost from user choice)
    const metadata = {
      repairCost: {  // Wrap in repairCost key so execute can find it
        costType: 'half',
        cost: halfCost,
        structureId,
        settlementId
      }
    };

    // Store selection in instance
    if (instance) {
      await updateInstanceResolutionState(instance.instanceId, {
        customComponentData: metadata
      });
    } else {
      logger.error('❌ [RepairCostChoice] No instance available to store cost');
    }
    
    // Dispatch resolution event to OutcomeDisplay (standard pattern)
    dispatch('resolution', {
      isResolved: true,
      modifiers: [],
      metadata
    });
  }
</script>

<div class="repair-cost-choice">
  <div class="cost-options">
    <!-- Dice Roll Option -->
    <button
      class="choice-button"
      class:selected={selectedCostType === 'dice'}
      disabled={isRolling || selectedCostType !== null}
      on:click={selectDiceOption}
    >
      {#if isRolling}
        <div class="rolling-display">
          <div class="spinner"></div>
          <span>Rolling...</span>
        </div>
      {:else if diceRollResult !== null}
        <div class="cost-display">
          <div class="cost-value">{diceRollResult} Gold</div>
          <div class="cost-label">{structureTier}d4 rolled</div>
        </div>
      {:else}
        <div class="cost-display">
          <div class="cost-value">{structureTier}d4 Gold</div>
          <div class="cost-label">Click to roll</div>
        </div>
      {/if}
    </button>
    
    <!-- Half Cost Option -->
    <button
      class="choice-button"
      class:selected={selectedCostType === 'half'}
      disabled={selectedCostType !== null}
      on:click={selectHalfOption}
    >
      <div class="cost-display">
        <div class="cost-value">
          {#if Object.keys(halfCost).length === 0}
            <span class="no-cost">No cost</span>
          {:else}
            <div class="cost-resources">
              {#each Object.entries(halfCost) as [resource, amount]}
                {@const iconClass = getResourceIcon(resource)}
                {@const iconColor = getResourceColor(resource)}
                {#if iconClass}
                  <span class="resource-item">
                    <i class="fas {iconClass} resource-icon" style="color: {iconColor}"></i>
                    <span class="resource-amount">{amount}</span>
                  </span>
                {:else}
                  <span class="resource-item">
                    <span class="resource-name">{resource}:</span>
                    <span class="resource-amount">{amount}</span>
                  </span>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
        <div class="cost-label">Half build cost</div>
      </div>
    </button>
  </div>
</div>

<style lang="scss">
  .repair-cost-choice {
    margin: 14px 0;
  }
  
  .cost-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .choice-button {
    flex: 1;
    min-width: 140px;
    min-height: 80px;
    padding: var(--space-16) var(--space-18);
    
    // Background (design system pattern)
    background: var(--hover-low);
    
    // Border (visible on all states)
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    
    // Outline overlay (doesn't affect size)
    outline: 2px solid transparent;
    outline-offset: -1px;
    
    // Typography
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    font-family: inherit;
    
    // Layout
    display: flex;
    align-items: center;
    justify-content: center;
    
    // Interaction
    cursor: pointer;
    transition: all 0.2s;
    
    // Hover state (not selected)
    &:hover:not(:disabled):not(.selected) {
      background: var(--hover);
      transform: translateY(-0.0625rem);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }
    
    // Selected state (choice-buttons pattern)
    &.selected {
      background: var(--surface-success-high);
      outline-color: var(--border-success);
    }
    
    // Disabled state
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
  
  .rolling-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(147, 197, 253, 0.3);
      border-top-color: rgb(147, 197, 253);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    span {
      font-size: var(--font-sm);
      color: var(--text-secondary);
    }
  }
  
  .cost-display {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .cost-value {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      line-height: 1.2;
    }
    
    .cost-resources {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .resource-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .resource-icon {
      font-size: var(--font-md);
      opacity: 0.9;
    }
    
    .resource-amount {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
    }
    
    .cost-label {
      font-size: var(--font-sm);
      color: var(--text-tertiary);
      line-height: 1;
    }
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
