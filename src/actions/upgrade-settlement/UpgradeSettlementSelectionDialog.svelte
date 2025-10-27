<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { SettlementTier } from '../../models/Settlement';
  import { getKingdomActor } from '../../stores/KingdomStore';
  
  // Props for pre-roll dialog
  export let show: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // UI State
  let selectedSettlementId: string | null = null;
  let eligibleSettlements: any[] = [];
  let availableGold: number = 0;
  
  // Load eligible settlements when dialog is shown
  $: if (show) {
    loadEligibleSettlements();
  }
  
  interface SettlementUpgradeInfo {
    settlement: any;
    currentLevel: number;
    newLevel: number;
    currentTier: SettlementTier;
    newTier: SettlementTier;
    cost: number;
    canAfford: boolean;
    tierWillChange: boolean;
    structureCount: number;
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
   * Check if a settlement can be upgraded (structure requirements only)
   */
  function canUpgradeSettlement(settlement: any, gold: number): SettlementUpgradeInfo | null {
    const currentLevel = settlement.level;
    const structureCount = settlement.structureIds?.length || 0;
    const newLevel = currentLevel + 1;
    const cost = newLevel;
    
    // Max level check
    if (currentLevel >= 20) {
      return null;
    }
    
    // Structure requirement check at tier boundaries
    if (currentLevel === 1 && structureCount < 2) return null;
    if (currentLevel === 4 && structureCount < 4) return null;
    if (currentLevel === 7 && structureCount < 8) return null;
    
    // Gold availability check
    const canAfford = gold >= cost;
    
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
      cost,
      canAfford,
      tierWillChange,
      structureCount
    };
  }
  
  async function loadEligibleSettlements() {
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('❌ [UpgradeSettlementSelectionDialog] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('❌ [UpgradeSettlementSelectionDialog] No kingdom data available');
      return;
    }
    
    availableGold = kingdom.resources?.gold || 0;
    
    // Filter settlements that can be upgraded (meet structure requirements)
    eligibleSettlements = kingdom.settlements
      .map(s => canUpgradeSettlement(s, availableGold))
      .filter((info): info is SettlementUpgradeInfo => info !== null);

  }
  
  function selectSettlement(info: SettlementUpgradeInfo) {
    if (!info.canAfford) {
      // @ts-ignore
      ui?.notifications?.warn(`Insufficient gold to upgrade ${info.settlement.name} (need ${info.cost}, have ${availableGold})`);
      return;
    }
    
    selectedSettlementId = info.settlement.id;
  }
  
  function handleConfirm() {
    if (!selectedSettlementId) {
      // @ts-ignore
      ui?.notifications?.warn('Please select a settlement to upgrade');
      return;
    }

    // Dispatch confirmation event
    dispatch('confirm', {
      settlementId: selectedSettlementId
    });
    
    // Reset and close
    selectedSettlementId = null;
    show = false;
  }
  
  function handleCancel() {
    selectedSettlementId = null;
    show = false;
    dispatch('cancel');
  }
</script>

{#if show}
<div class="dialog-overlay" on:click={handleCancel}>
  <div class="dialog-content" on:click|stopPropagation>
    <div class="dialog-header">
      <h2>Select Settlement</h2>
      <button class="close-button" on:click={handleCancel}>
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="dialog-body">
      <div class="info-header">
        <div class="gold-display">
          <i class="fas fa-coins"></i>
          <span>Available: {availableGold} gold</span>
        </div>
      </div>
      
      {#if eligibleSettlements.length === 0}
        <div class="no-settlements">
          <i class="fas fa-exclamation-circle"></i>
          <p>No settlements available to upgrade.</p>
          <p class="hint">Settlements must meet structure requirements for the next tier.</p>
        </div>
      {:else}
        <div class="settlement-table">
          <div class="table-header">
            <div class="col-name">Settlement</div>
            <div class="col-level">Level</div>
            <div class="col-cost">Cost</div>
          </div>
          
          <div class="table-body">
            {#each eligibleSettlements as info (info.settlement.id)}
              <div
                class="table-row"
                class:selected={selectedSettlementId === info.settlement.id}
                class:cannot-afford={!info.canAfford}
                on:click={() => selectSettlement(info)}
              >
                <div class="col-name">
                  {info.settlement.name}
                  {#if !info.canAfford}
                    <div class="insufficient-gold-label">Requires {info.cost} gold</div>
                  {/if}
                </div>
                <div class="col-level">
                  {info.currentLevel} → <strong>{info.newLevel}</strong>
                </div>
                <div class="col-cost">
                  <i class="fas fa-coins"></i>
                  <span class="cost-value">{info.cost}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    
    <div class="dialog-footer">
      <button class="cancel-button" on:click={handleCancel}>
        Cancel
      </button>
      <button 
        class="confirm-button" 
        disabled={!selectedSettlementId}
        on:click={handleConfirm}
      >
        <i class="fas fa-check"></i>
        Upgrade settlement
      </button>
    </div>
  </div>
</div>
{/if}

<style lang="scss">
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .dialog-content {
    background: var(--bg-elevated);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-medium);
    
    h2 {
      margin: 0;
      font-size: var(--font-2xl);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
    }
    
    .close-button {
      background: none;
      border: none;
      color: var(--text-tertiary);
      font-size: var(--font-lg);
      cursor: pointer;
      padding: 4px 8px;
      transition: color 0.2s ease;
      
      &:hover {
        color: var(--text-primary);
      }
    }
  }
  
  .dialog-body {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--border-medium);
    
    button {
      padding: 10px 20px;
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    .cancel-button {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      
      &:hover:not(:disabled) {
        background: var(--bg-overlay);
        color: var(--text-primary);
      }
    }
    
    .confirm-button {
      background: var(--color-primary);
      border: none;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;
      
      &:hover:not(:disabled) {
        background: var(--color-primary-dark);
        transform: translateY(-1px);
      }
    }
  }
  
  .info-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 12px;
    gap: 16px;
    
    
    .gold-display {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid rgba(234, 179, 8, 0.3);
      border-radius: var(--radius-sm);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      white-space: nowrap;
      
      i {
        color: rgb(234, 179, 8);
        font-size: var(--font-md);
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
        font-size: var(--font-md);
        color: var(--text-tertiary);
      }
    }
  }
  
  .settlement-table {
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .table-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(100, 116, 139, 0.15);
    border-bottom: 1px solid var(--border-medium);
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .table-body {
    display: flex;
    flex-direction: column;
  }
  
  .table-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--border-medium);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-lg);
    align-items: center;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover:not(.cannot-afford) {
      background: rgba(100, 116, 139, 0.15);
    }
    
    &.selected {
      background: rgba(59, 130, 246, 0.15);
      border-left: 3px solid var(--color-primary);
      padding-left: 13px;
    }
    
    &.cannot-afford {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .col-name {
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      
      .insufficient-gold-label {
        margin-top: 4px;
        font-size: var(--font-xs);
        font-weight: normal;
        color: rgb(239, 68, 68);
      }
    }
    
    .col-level {
      color: var(--text-secondary);
      
      strong {
        color: var(--text-primary);
      }
    }
    
    .col-cost {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      
      i {
        color: rgb(234, 179, 8);
        font-size: var(--font-sm);
      }
      
      .cost-value {
        font-weight: var(--font-weight-semibold);
      }
    }
  }
</style>
