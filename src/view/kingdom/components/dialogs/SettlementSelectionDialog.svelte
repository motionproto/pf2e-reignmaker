<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getKingdomActor } from '../../../../stores/KingdomStore';
  import Dialog from '../baseComponents/Dialog.svelte';
  import { getTierIcon, getTierColor } from '../../tabs/settlements/settlements.utils';
  
  export let show: boolean = false;
  export let title: string = "Select Settlement";
  export let filter: ((settlement: any, kingdom?: any) => boolean | { eligible: boolean; reason?: string }) | null = null;
  export let getSupplementaryInfo: ((settlement: any) => string) | null = null;
  export let kingdom: any = null;
  
  const dispatch = createEventDispatcher();
  
  let selectedSettlementId: string | null = null;
  let settlementInfo: Array<{
    settlement: any;
    eligible: boolean;
    reason?: string;
    supplementaryInfo?: string;
  }> = [];
  
  // Load settlements when dialog is shown
  $: if (show) {
    loadSettlements();
  }
  
  function loadSettlements() {
    // Get kingdom data if not provided
    let kingdomData = kingdom;
    if (!kingdomData) {
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [SettlementSelectionDialog] No kingdom actor available');
        return;
      }
      kingdomData = actor.getKingdomData();
      if (!kingdomData) {
        console.error('❌ [SettlementSelectionDialog] No kingdom data available');
        return;
      }
    }
    
    // Map settlements with eligibility info
    settlementInfo = (kingdomData.settlements || []).map((s: any) => {
      const info: any = { settlement: s };
      
      // Apply filter if provided
      if (!filter) {
        // No filter - all settlements eligible
        info.eligible = true;
      } else {
        const result = filter(s, kingdomData);
        
        // Handle both boolean and object returns
        if (typeof result === 'boolean') {
          info.eligible = result;
        } else {
          info.eligible = result.eligible;
          info.reason = result.reason;
        }
      }
      
      // Get supplementary info if function provided
      if (getSupplementaryInfo) {
        info.supplementaryInfo = getSupplementaryInfo(s);
      }
      
      return info;
    });
    
    // Sort: eligible first, then by name
    settlementInfo.sort((a, b) => {
      if (a.eligible !== b.eligible) {
        return a.eligible ? -1 : 1;
      }
      return a.settlement.name.localeCompare(b.settlement.name);
    });
  }
  
  function selectSettlement(info: { settlement: any; eligible: boolean; reason?: string }) {
    if (!info.eligible) {
      // Show warning if settlement is ineligible
      const game = (globalThis as any).game;
      if (game?.ui?.notifications) {
        game.ui.notifications.warn(info.reason || `Cannot select ${info.settlement.name}`);
      }
      return;
    }
    
    selectedSettlementId = info.settlement.id;
  }
  
  function handleConfirm() {
    if (!selectedSettlementId) {
      const game = (globalThis as any).game;
      if (game?.ui?.notifications) {
        game.ui.notifications.warn('Please select a settlement');
      }
      return;
    }
    
    // Find selected settlement for returning name + id
    const selected = settlementInfo.find(info => info.settlement.id === selectedSettlementId);
    
    dispatch('confirm', {
      settlementId: selectedSettlementId,
      settlementName: selected?.settlement.name || 'Unknown'
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
  {title}
  confirmLabel="Select"
  confirmDisabled={!selectedSettlementId}
  width="500px"
  on:confirm={handleConfirm}
  on:cancel={handleCancel}
>
  {#if settlementInfo.length === 0}
    <div class="no-settlements">
      <i class="fas fa-exclamation-circle"></i>
      <p>No settlements available.</p>
    </div>
  {:else}
    <div class="settlement-list">
      {#each settlementInfo as info (info.settlement.id)}
        <button
          class="settlement-item"
          class:selected={selectedSettlementId === info.settlement.id}
          class:ineligible={!info.eligible}
          disabled={!info.eligible}
          on:click={() => selectSettlement(info)}
          title={info.reason || ''}
        >
          <div class="settlement-main">
            <div class="settlement-left">
              <i class="fas {getTierIcon(info.settlement.tier || 'Village')} tier-icon"></i>
              <div class="settlement-text">
                <span class="settlement-name">{info.settlement.name}</span>
                {#if info.supplementaryInfo}
                  <span class="supplementary-info">{info.supplementaryInfo}</span>
                {/if}
              </div>
            </div>
            <div class="settlement-right">
              <span class="tier-badge">{info.settlement.tier || 'Village'}</span>
              <span class="level-number">{info.settlement.level}</span>
            </div>
          </div>
          {#if !info.eligible && info.reason}
            <div class="ineligibility-reason">{info.reason}</div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</Dialog>

<style lang="scss">
  @use '../../tabs/settlements/settlements-shared.scss';
  
  .no-settlements {
    padding: var(--space-32) var(--space-24);
    text-align: center;
    color: var(--text-tertiary);
    
    i {
      font-size: var(--font-4xl);
      margin-bottom: var(--space-12);
      opacity: var(--opacity-muted);
    }
    
    p {
      margin: var(--space-8) 0;
    }
  }
  
  .settlement-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    max-height: 400px;
    overflow-y: auto;
    /* ✅ FIX: Add padding on all sides to prevent outline clipping */
    padding: var(--space-4) var(--space-4) var(--space-4) var(--space-4);
  }
  
  .settlement-item {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: var(--space-4);
    padding: var(--space-12) var(--space-16);
    background: linear-gradient(135deg,
      rgba(24, 24, 27, 0.6),
      rgba(31, 31, 35, 0.4));
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    min-height: fit-content;
    height: auto;
    /* ✅ FIX: Use outline-offset to prevent clipping */
    outline: 2px solid transparent;
    outline-offset: -2px;
    
    &:hover:not(:disabled) {
      border-color: var(--border-strong);
      box-shadow: 0 0.125rem 0.5rem var(--overlay-low);
    }
    
    &.selected {
      outline: 2px solid var(--color-accent);
      background: linear-gradient(135deg,
        rgba(20, 20, 23, 0.7),
        rgba(15, 15, 17, 0.5));
      box-shadow: 0 4px 12px rgba(var(--color-primary), 0.1);
      
      &:hover {
        box-shadow: 0 6px 16px rgba(var(--color-primary), 0.15);
      }
    }
    
    &.ineligible {
      opacity: var(--opacity-disabled);
      cursor: not-allowed;
      background: var(--overlay-lowest);
      
      &:hover {
        background: var(--overlay-lowest);
        border-color: var(--border-medium);
        transform: none;
        box-shadow: none;
      }
    }
    
    &:disabled {
      cursor: not-allowed;
    }
  }
  
  .settlement-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
  }
  
  .settlement-left {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    flex: 1;
    min-width: 0;
    
    .tier-icon {
      font-size: var(--font-xl);
      color: var(--text-secondary);
      flex-shrink: 0;
    }
    
    .settlement-text {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      flex: 1;
      min-width: 0;
    }
    
    .settlement-name {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      line-height: 1.4;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .supplementary-info {
      font-size: var(--font-sm);
      color: var(--text-tertiary);
      line-height: 1.4;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  .settlement-right {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    flex-shrink: 0;
    
    .tier-badge {
      font-size: var(--font-sm);
      color: var(--text-secondary);
      padding: var(--space-2) var(--space-6);
      background: var(--overlay-lowest);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-sm);
      line-height: 1;
      white-space: nowrap;
    }
    
    .level-number {
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      line-height: 1;
    }
  }
  
  .ineligibility-reason {
    font-size: var(--font-sm);
    color: var(--color-danger);
    margin-top: var(--space-2);
  }
</style>
