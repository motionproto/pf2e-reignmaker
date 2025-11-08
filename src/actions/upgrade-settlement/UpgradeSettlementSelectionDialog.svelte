<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { SettlementTier } from '../../models/Settlement';
  import { getKingdomActor } from '../../stores/KingdomStore';
  import Dialog from '../../view/kingdom/components/baseComponents/Dialog.svelte';
  
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
    canUpgrade: boolean; // Can meet all requirements
    tierWillChange: boolean;
    structureCount: number;
    ineligibilityReason?: string; // Why settlement can't be upgraded
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
   * Get upgrade info for a settlement (always returns info, even if ineligible)
   */
  function getSettlementUpgradeInfo(settlement: any, gold: number): SettlementUpgradeInfo {
    const currentLevel = settlement.level;
    const structureCount = settlement.structureIds?.length || 0;
    const newLevel = currentLevel + 1;
    const cost = newLevel;
    
    let canUpgrade = true;
    let ineligibilityReason: string | undefined;
    
    // Max level check
    if (currentLevel >= 20) {
      canUpgrade = false;
      ineligibilityReason = 'Already at maximum level (20)';
    }
    
    // Structure requirement check at tier boundaries
    if (canUpgrade && currentLevel === 1 && structureCount < 2) {
      canUpgrade = false;
      ineligibilityReason = 'Requires 2+ structures to upgrade from village';
    }
    if (canUpgrade && currentLevel === 4 && structureCount < 4) {
      canUpgrade = false;
      ineligibilityReason = 'Requires 4+ structures to upgrade from town';
    }
    if (canUpgrade && currentLevel === 7 && structureCount < 8) {
      canUpgrade = false;
      ineligibilityReason = 'Requires 8+ structures to upgrade from city';
    }
    
    // Gold availability check
    const canAfford = gold >= cost;
    if (canUpgrade && !canAfford) {
      canUpgrade = false;
      ineligibilityReason = 'Insufficient Funds';
    }
    
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
      canUpgrade,
      tierWillChange,
      structureCount,
      ineligibilityReason
    };
  }
  
  async function loadEligibleSettlements() {
    const actor = getKingdomActor();
    if (!actor) {
      console.error('❌ [UpgradeSettlementSelectionDialog] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      console.error('❌ [UpgradeSettlementSelectionDialog] No kingdom data available');
      return;
    }
    
    availableGold = kingdom.resources?.gold || 0;
    
    // Get upgrade info for ALL settlements (including ineligible ones)
    eligibleSettlements = kingdom.settlements
      .map((s: any) => getSettlementUpgradeInfo(s, availableGold))
      .sort((a: any, b: any) => {
        // Sort: eligible first, then by name
        if (a.canUpgrade !== b.canUpgrade) {
          return a.canUpgrade ? -1 : 1;
        }
        return a.settlement.name.localeCompare(b.settlement.name);
      });
  }
  
  function selectSettlement(info: SettlementUpgradeInfo) {
    if (!info.canUpgrade) {
      // @ts-ignore
      ui?.notifications?.warn(info.ineligibilityReason || `Cannot upgrade ${info.settlement.name}`);
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

<Dialog 
  bind:show
  title="Select Settlement"
  confirmLabel="Upgrade settlement"
  confirmDisabled={!selectedSettlementId}
  width="600px"
  on:confirm={handleConfirm}
  on:cancel={handleCancel}
>
  <div slot="footer-left" class="gold-display">
    <i class="fas fa-coins"></i>
    <span>Available: {availableGold} gold</span>
  </div>
  
  {#if eligibleSettlements.length === 0}
    <div class="no-settlements">
      <i class="fas fa-exclamation-circle"></i>
      <p>No settlements available to upgrade.</p>
      <p class="hint">Settlements must meet structure requirements for the next tier.</p>
    </div>
  {:else}
    <div class="tier-thresholds">
      <div class="threshold-title">Tier Level Requirements:</div>
      <div class="threshold-list">
        <div class="threshold-item">
          <strong>Village:</strong> 0
        </div>
        <div class="threshold-item">
          <strong>Town:</strong> 2
        </div>
        <div class="threshold-item">
          <strong>City:</strong> 5
        </div>
        <div class="threshold-item">
          <strong>Metropolis:</strong> 8
        </div>
      </div>
    </div>
    
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
            class:ineligible={!info.canUpgrade}
            on:click={() => selectSettlement(info)}
            title={info.ineligibilityReason || ''}
          >
            <div class="col-name">
              {info.settlement.name}
              {#if info.ineligibilityReason}
                <div class="ineligibility-label">{info.ineligibilityReason}</div>
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
</Dialog>

<style lang="scss">
  .gold-display {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0.5rem 1rem;
    background: rgba(234, 179, 8, 0.15);
    border: 1px solid rgba(234, 179, 8, 0.3);
    border-radius: var(--radius-md);
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    line-height: 1;
    white-space: nowrap;
    
    i {
      color: rgb(234, 179, 8);
      font-size: var(--font-sm);
      line-height: 1;
    }
  }
  
  .tier-thresholds {
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(100, 116, 139, 0.1);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    
    .threshold-title {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .threshold-list {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .threshold-item {
      font-size: var(--font-sm);
      color: var(--text-secondary);
      
      strong {
        color: var(--text-primary);
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
    
    &.ineligible {
      opacity: 0.5;
      cursor: not-allowed;
      background: rgba(100, 100, 100, 0.05);
      
      &:hover {
        background: rgba(100, 100, 100, 0.1);
      }
    }
    
    .col-name {
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      
      .ineligibility-label {
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
