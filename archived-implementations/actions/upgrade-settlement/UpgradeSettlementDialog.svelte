<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { updateInstanceResolutionState } from '../../../controllers/shared/ResolutionStateHelpers';
  import type { ActiveCheckInstance } from '../../../models/CheckInstance';
  import { SettlementTier } from '../../../models/Settlement';
  import { getKingdomActor } from '../../../stores/KingdomStore';
  
  // Props passed from OutcomeDisplay
  export let instance: ActiveCheckInstance | null = null;
  export let outcome: string;
  
  const dispatch = createEventDispatcher();
  
  // UI State
  let selectedSettlementId: string | null = null;
  let eligibleSettlements: any[] = [];
  let availableGold: number = 0;
  let isCriticalSuccess: boolean = false;
  
  // Load eligible settlements
  $: if (instance) {
    loadEligibleSettlements();
    isCriticalSuccess = outcome === 'criticalSuccess';
  }
  
  interface SettlementUpgradeInfo {
    settlement: any;
    currentLevel: number;
    newLevel: number;
    currentTier: SettlementTier;
    newTier: SettlementTier;
    fullCost: number;
    actualCost: number;
    canAfford: boolean;
    tierWillChange: boolean;
  }
  
  /**
   * Determine what tier a settlement should be at a given level with structure count
   */
  function getTierForLevel(level: number, structureCount: number): SettlementTier {
    if (level >= 8 && structureCount >= 8) return SettlementTier.METROPOLIS;
    if (level >= 5 && structureCount >= 4) return SettlementTier.CITY;
    if (level >= 2 && structureCount >= 2) return SettlementTier.TOWN;
    return SettlementTier.VILLAGE;
  }
  
  /**
   * Check if a settlement can be upgraded
   */
  function canUpgradeSettlement(settlement: any, gold: number): SettlementUpgradeInfo | null {
    const currentLevel = settlement.level;
    const structureCount = settlement.structureIds?.length || 0;
    const newLevel = currentLevel + 1;
    const fullCost = newLevel;
    const actualCost = isCriticalSuccess ? Math.ceil(fullCost / 2) : fullCost;
    
    // Max level check
    if (currentLevel >= 20) {
      return null;
    }
    
    // Structure requirement check at tier boundaries
    if (currentLevel === 1 && structureCount < 2) return null;
    if (currentLevel === 4 && structureCount < 4) return null;
    if (currentLevel === 7 && structureCount < 8) return null;
    
    // Gold availability check
    const canAfford = gold >= actualCost;
    
    // Determine tiers
    const currentTier = settlement.tier;
    const newTier = getTierForLevel(newLevel, structureCount);
    const tierWillChange = newTier !== currentTier;
    
    return {
      settlement,
      currentLevel,
      newLevel,
      currentTier,
      newTier,
      fullCost,
      actualCost,
      canAfford,
      tierWillChange
    };
  }
  
  async function loadEligibleSettlements() {
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('❌ [UpgradeSettlementDialog] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('❌ [UpgradeSettlementDialog] No kingdom data available');
      return;
    }
    
    availableGold = kingdom.resources?.gold || 0;
    
    // Filter settlements that can be upgraded
    eligibleSettlements = kingdom.settlements
      .map(s => canUpgradeSettlement(s, availableGold))
      .filter((info): info is SettlementUpgradeInfo => info !== null);

  }
  
  async function selectSettlement(info: SettlementUpgradeInfo) {
    if (!info.canAfford) {
      // @ts-ignore
      ui?.notifications?.warn(`Insufficient gold to upgrade ${info.settlement.name} (need ${info.actualCost}, have ${availableGold})`);
      return;
    }
    
    selectedSettlementId = info.settlement.id;

    // Store settlement metadata
    if (instance) {
      const metadata = {
        settlementId: info.settlement.id,
        settlementName: info.settlement.name,
        currentLevel: info.currentLevel,
        newLevel: info.newLevel
      };
      
      await updateInstanceResolutionState(instance.instanceId, {
        customComponentData: metadata
      });

    }
    
    // Dispatch selection event with modifiers (gold cost)
    // This makes the cost flow through the normal modifier system
    const selectionData = {
      settlementId: info.settlement.id,
      settlementName: info.settlement.name,
      modifiers: [
        {
          resource: 'gold',
          value: -info.actualCost,
          type: 'static'
        }
      ]
    };

    dispatch('selection', selectionData);
  }
  
  // Get selected option from instance (UI state)
  $: selectedSettlementId = instance?.resolutionState?.customComponentData?.settlementId || null;
</script>

<div class="upgrade-settlement-dialog">
  <div class="info-header">
    <p class="help-text">
      Select a settlement to upgrade. Cost is {isCriticalSuccess ? 'half (rounded up)' : 'full'} of the new level.
    </p>
    <div class="gold-display">
      <i class="fas fa-coins"></i>
      <span>Available: {availableGold} gold</span>
    </div>
  </div>
  
  {#if eligibleSettlements.length === 0}
    <div class="no-settlements">
      <i class="fas fa-exclamation-circle"></i>
      <p>No settlements available to upgrade.</p>
      <p class="hint">Settlements may be at max level, lack required structures, or you may not have enough gold.</p>
    </div>
  {:else}
    <div class="settlement-list">
      {#each eligibleSettlements as info (info.settlement.id)}
        <button
          class="settlement-button"
          class:selected={selectedSettlementId === info.settlement.id}
          class:cannot-afford={!info.canAfford}
          disabled={!info.canAfford}
          on:click={() => selectSettlement(info)}
        >
          <div class="settlement-header">
            <div class="settlement-name">{info.settlement.name}</div>
            <div class="settlement-cost">
              <i class="fas fa-coins"></i>
              <span class="cost-value">{info.actualCost}</span>
              {#if isCriticalSuccess && info.actualCost < info.fullCost}
                <span class="cost-discount">(was {info.fullCost})</span>
              {/if}
            </div>
          </div>
          
          <div class="settlement-details">
            <div class="detail-row">
              <span class="detail-label">Level:</span>
              <span class="detail-value">
                {info.currentLevel} → <strong>{info.newLevel}</strong>
              </span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Tier:</span>
              <span class="detail-value" class:tier-change={info.tierWillChange}>
                {info.currentTier}
                {#if info.tierWillChange}
                  → <strong>{info.newTier}</strong>
                  <i class="fas fa-arrow-up tier-change-icon"></i>
                {/if}
              </span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Structures:</span>
              <span class="detail-value">{info.settlement.structureIds?.length || 0}</span>
            </div>
          </div>
          
          {#if !info.canAfford}
            <div class="cannot-afford-label">
              <i class="fas fa-exclamation-triangle"></i>
              Insufficient gold
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .upgrade-settlement-dialog {
    margin: 14px 0;
  }
  
  .info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 16px;
    
    .help-text {
      margin: 0;
      font-size: var(--font-sm);
      color: var(--text-secondary);
      line-height: 1.4;
    }
    
    .gold-display {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid var(--border-accent-subtle);
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      white-space: nowrap;
      
      i {
        color: rgb(234, 179, 8);
        font-size: var(--font-xs);
      }
    }
  }
  
  .no-settlements {
    padding: 32px 24px;
    text-align: center;
    color: var(--text-tertiary);
    
    i {
      font-size: 32px;
      margin-bottom: 12px;
      opacity: 0.5;
    }
    
    p {
      margin: 8px 0;
      
      &.hint {
        font-size: var(--font-sm);
        color: var(--text-tertiary);
      }
    }
  }
  
  .settlement-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .settlement-button {
    width: 100%;
    padding: 14px 16px;
    background: rgba(100, 116, 139, 0.1);
    border: 2px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    text-align: left;
    
    &:hover:not(:disabled) {
      background: rgba(100, 116, 139, 0.2);
      border-color: var(--border-medium);
      transform: translateX(2px);
    }
    
    &.selected {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--border-strong);
      box-shadow: 0 0 16px var(--hover-high);
    }
    
    &.cannot-afford {
      opacity: 0.5;
      cursor: not-allowed;
      
      &:hover {
        transform: none;
      }
    }
    
    &:disabled {
      cursor: not-allowed;
    }
  }
  
  .settlement-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    
    .settlement-name {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-accent);
    }
    
    .settlement-cost {
      display: flex;
      align-items: center;
      gap: 6px;
      
      i {
        color: rgb(234, 179, 8);
        font-size: var(--font-sm);
      }
      
      .cost-value {
        font-size: var(--font-lg);
        font-weight: var(--font-weight-bold);
      }
      
      .cost-discount {
        font-size: var(--font-sm);
        color: var(--text-tertiary);
        text-decoration: line-through;
      }
    }
  }
  
  .settlement-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-sm);
    
    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .detail-label {
        color: var(--text-tertiary);
        min-width: 70px;
      }
      
      .detail-value {
        color: var(--text-secondary);
        
        strong {
          color: var(--text-primary);
          font-weight: var(--font-weight-semibold);
        }
        
        &.tier-change {
          color: var(--color-success);
          font-weight: var(--font-weight-medium);
          
          .tier-change-icon {
            margin-left: 4px;
            font-size: var(--font-xs);
          }
        }
      }
    }
  }
  
  .cannot-afford-label {
    margin-top: 8px;
    padding: 6px 10px;
    background: var(--surface-primary);
    border: 1px solid var(--border-primary-subtle);
    border-radius: var(--radius-sm);
    color: rgb(239, 68, 68);
    font-size: var(--font-xs);
    font-weight: var(--font-weight-medium);
    display: flex;
    align-items: center;
    gap: 6px;
    
    i {
      font-size: var(--font-xs);
    }
  }
</style>
