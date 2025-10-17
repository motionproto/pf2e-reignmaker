<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kingdomData } from '../../../stores/KingdomStore';
  import { createRepairStructureController } from '../../../controllers/RepairStructureController';
  import { updateInstanceResolutionState } from '../../../controllers/shared/ResolutionStateHelpers';
  import type { ActiveCheckInstance } from '../../../models/CheckInstance';
  
  // Props passed from OutcomeDisplay
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;
  
  // Read structureId/settlementId from instance metadata
  $: structureId = instance?.metadata?.structureId || '';
  $: settlementId = instance?.metadata?.settlementId || '';
  
  const dispatch = createEventDispatcher();
  
  // UI State
  let diceRollResult: number | null = null;
  let isRolling: boolean = false;
  let halfCost: Map<string, number> = new Map();
  let controller: any = null;
  
  // Load controller and calculate costs
  $: if (structureId && !controller) {
    loadController();
  }
  
  async function loadController() {
    controller = await createRepairStructureController();
    
    // Get half cost for this structure
    if (controller && structureId && settlementId) {
      const structure = await controller.getStructureById(structureId);
      if (structure) {
        // Import structures service to calculate half cost
        const { structuresService } = await import('../../../services/structures');
        const costObj = structuresService.calculateHalfBuildCost(structure);
        
        // Convert object to Map
        halfCost = new Map(Object.entries(costObj));
        console.log('🔧 [RepairCostChoice] Half cost calculated:', costObj, 'Map:', halfCost);
        
        // Debug icon rendering
        for (const [resource, amount] of halfCost) {
          const iconClass = getResourceIcon(resource);
          console.log(`🎨 [RepairCostChoice] Resource: ${resource}, Amount: ${amount}, Icon: ${iconClass}`);
        }
      }
    }
  }
  
  async function selectDiceOption() {
    isRolling = true;
    
    // Roll dice
    const rolled = Math.floor(Math.random() * 4) + 1; // 1d4
    diceRollResult = rolled;
    isRolling = false;
    
    // Create cost as plain object (not Map) for proper serialization
    const costObj = { gold: rolled };
    
    console.log('💰 [RepairCostChoice] Dice rolled cost:', costObj);
    
    // Store selection in instance (like choice buttons do)
    if (instance) {
      await updateInstanceResolutionState(instance.instanceId, {
        customComponentData: {
          costType: 'dice',
          cost: costObj,
          structureId,
          settlementId
        }
      });
    }
    
    // Dispatch selection event
    dispatch('selection', {
      costType: 'dice',
      cost: costObj,
      structureId,
      settlementId
    });
  }
  
  async function selectHalfOption() {
    // Convert Map to plain object for storage
    const costObj: Record<string, number> = {};
    for (const [resource, amount] of halfCost) {
      costObj[resource] = amount;
    }
    
    console.log('💰 [RepairCostChoice] Converted halfCost Map to object:', costObj);
    
    // Store selection in instance
    if (instance) {
      await updateInstanceResolutionState(instance.instanceId, {
        customComponentData: {
          costType: 'half',
          cost: costObj,
          structureId,
          settlementId
        }
      });
    }
    
    // Dispatch selection event
    dispatch('selection', {
      costType: 'half',
      cost: costObj,
      structureId,
      settlementId
    });
  }
  
  // Import resource icon helper
  import { getResourceIcon, getResourceColor } from '../utils/presentation';
  
  // Check if player can afford the cost
  function canAfford(cost: Map<string, number>): boolean {
    if (!cost || cost.size === 0) return true;
    
    for (const [resource, amount] of cost) {
      const available = ($kingdomData.resources as any)?.[resource] || 0;
      if (available < amount) {
        return false;
      }
    }
    
    return true;
  }
  
  // Get selected option from instance
  $: selectedCostType = instance?.resolutionState?.customComponentData?.costType;
  $: diceAffordable = diceRollResult !== null ? canAfford(new Map([['gold', diceRollResult]])) : true;
  $: halfAffordable = canAfford(halfCost);
</script>

<div class="repair-cost-choice">
  <div class="cost-options">
    <!-- Dice Roll Option -->
    <button
      class="choice-button"
      class:selected={selectedCostType === 'dice'}
      class:unaffordable={!diceAffordable && diceRollResult !== null}
      disabled={isRolling || (!diceAffordable && diceRollResult !== null)}
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
          <div class="cost-label">1d4 rolled</div>
        </div>
      {:else}
        <div class="cost-display">
          <div class="cost-value">1d4 Gold</div>
          <div class="cost-label">Click to roll</div>
        </div>
      {/if}
    </button>
    
    <!-- Half Cost Option -->
    <button
      class="choice-button"
      class:selected={selectedCostType === 'half'}
      class:unaffordable={!halfAffordable}
      disabled={!halfAffordable}
      on:click={selectHalfOption}
    >
      <div class="cost-display">
        <div class="cost-value">
          {#if halfCost.size === 0}
            Free
          {:else}
            <div class="cost-resources">
              {#each Array.from(halfCost.entries()) as [resource, amount]}
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
    padding: 16px 18px;
    background: rgba(100, 116, 139, 0.1);
    border: 2px solid rgba(100, 116, 139, 0.3);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover:not(:disabled) {
      background: rgba(100, 116, 139, 0.2);
      border-color: rgba(100, 116, 139, 0.5);
      transform: translateY(-1px);
    }
    
    &.selected {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--border-strong);
      box-shadow: 0 0 16px rgba(255, 255, 255, 0.15);
      opacity: 1;
    }
    
    &.unaffordable {
      opacity: 0.5;
      border-color: rgba(239, 68, 68, 0.4);
      cursor: not-allowed;
    }
    
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
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
