<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getKingdomActor } from '../../stores/KingdomStore';
  import type { Faction, AttitudeLevel } from '../../models/Faction';
  import { AttitudeLevelConfig, ATTITUDE_ORDER } from '../../models/Faction';
  
  // Props for pre-roll dialog
  export let show: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  // UI State
  let selectedFactionId: string | null = null;
  let eligibleFactions: Faction[] = [];
  let availableGold: number = 0;
  let diplomaticCapacity: number = 0;
  let helpfulCount: number = 0;
  const COST = 4; // Fixed cost for diplomatic relations
  
  // Load eligible factions when dialog is shown
  $: if (show) {
    loadEligibleFactions();
  }
  
  async function loadEligibleFactions() {
    const actor = getKingdomActor();
    if (!actor) {
      console.error('❌ [FactionSelectionDialog] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      console.error('❌ [FactionSelectionDialog] No kingdom data available');
      return;
    }
    
    availableGold = kingdom.resources?.gold || 0;
    diplomaticCapacity = kingdom.resources?.diplomaticCapacity || 1;
    
    // Count current Helpful relationships
    helpfulCount = (kingdom.factions || []).filter(f => f.attitude === 'Helpful').length;
    
    // Filter factions that can be improved (not already at Helpful or Hostile)
    eligibleFactions = (kingdom.factions || [])
      .filter(f => {
        // Can't improve Helpful (already max) or Hostile (requires different action)
        return f.attitude !== 'Helpful' && f.attitude !== 'Hostile';
      })
      .sort((a, b) => {
        // Sort by attitude (worst to best)
        const aIndex = ATTITUDE_ORDER.indexOf(a.attitude);
        const bIndex = ATTITUDE_ORDER.indexOf(b.attitude);
        return bIndex - aIndex; // Reverse order (worst first)
      });
    
    console.log(`🤝 [FactionSelectionDialog] Found ${eligibleFactions.length} eligible factions`);
  }
  
  function selectFaction(faction: Faction) {
    if (availableGold < COST) {
      // @ts-ignore
      ui?.notifications?.warn(`Insufficient gold (need ${COST}, have ${availableGold})`);
      return;
    }
    
    selectedFactionId = faction.id;
  }
  
  function handleConfirm() {
    if (!selectedFactionId) {
      // @ts-ignore
      ui?.notifications?.warn('Please select a faction');
      return;
    }
    
    const selectedFaction = eligibleFactions.find(f => f.id === selectedFactionId);
    if (!selectedFaction) {
      console.error('❌ [FactionSelectionDialog] Selected faction not found');
      return;
    }
    
    console.log('🤝 [FactionSelectionDialog] Faction selected:', selectedFactionId);
    
    // Dispatch confirmation event
    dispatch('confirm', {
      factionId: selectedFactionId,
      factionName: selectedFaction.name
    });
    
    // Reset and close
    selectedFactionId = null;
    show = false;
  }
  
  function handleCancel() {
    selectedFactionId = null;
    show = false;
    dispatch('cancel');
  }
  
  function getAttitudeConfig(attitude: AttitudeLevel) {
    return AttitudeLevelConfig[attitude];
  }
  
  function getNextAttitude(current: AttitudeLevel): AttitudeLevel | null {
    const index = ATTITUDE_ORDER.indexOf(current);
    if (index > 0) {
      return ATTITUDE_ORDER[index - 1];
    }
    return null;
  }
</script>

{#if show}
<div class="dialog-overlay" on:click={handleCancel}>
  <div class="dialog-content" on:click|stopPropagation>
    <div class="dialog-header">
      <h2>Diplomatic Mission</h2>
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
        <div class="capacity-display">
          <i class="fas fa-handshake"></i>
          <span>Helpful Capacity: {helpfulCount}/{diplomaticCapacity}</span>
        </div>
      </div>
      
      <div class="cost-notice">
        <i class="fas fa-info-circle"></i>
        <span>Cost: {COST} gold (2 gold on critical success)</span>
      </div>
      
      {#if eligibleFactions.length === 0}
        <div class="no-factions">
          <i class="fas fa-exclamation-circle"></i>
          <p>No factions available for diplomatic relations.</p>
          <p class="hint">All factions are either already Helpful or Hostile.</p>
        </div>
      {:else}
        <div class="faction-table">
          <div class="table-header">
            <div class="col-name">Faction</div>
            <div class="col-attitude">Current Attitude</div>
          </div>
          
          <div class="table-body">
            {#each eligibleFactions as faction (faction.id)}
              {@const config = getAttitudeConfig(faction.attitude)}
              <div
                class="table-row"
                class:selected={selectedFactionId === faction.id}
                class:cannot-afford={availableGold < COST}
                on:click={() => selectFaction(faction)}
              >
                <div class="col-name">
                  {faction.name}
                  {#if availableGold < COST}
                    <div class="insufficient-gold-label">Requires {COST} gold</div>
                  {/if}
                </div>
                <div class="col-attitude">
                  <div class="attitude-badge">
                    <i class="fas {config.icon}"></i>
                    <span>{config.displayName}</span>
                  </div>
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
        disabled={!selectedFactionId || availableGold < COST}
        on:click={handleConfirm}
      >
        <i class="fas fa-check"></i>
        Select Faction
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
    width: 700px;
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
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 16px;
    
    .gold-display, .capacity-display {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      white-space: nowrap;
    }
    
    .gold-display {
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid rgba(234, 179, 8, 0.3);
      
      i {
        color: rgb(234, 179, 8);
        font-size: var(--font-md);
      }
    }
    
    .capacity-display {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      
      i {
        color: rgb(59, 130, 246);
        font-size: var(--font-md);
      }
    }
  }
  
  .cost-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(100, 116, 139, 0.1);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    font-size: var(--font-md);
    color: var(--text-secondary);
    
    i {
      color: var(--color-primary);
    }
  }
  
  .no-factions {
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
  
  .faction-table {
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .table-header {
    display: grid;
    grid-template-columns: 2fr 1.5fr;
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
    grid-template-columns: 2fr 1.5fr;
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
    
    .col-attitude {
      .attitude-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: var(--radius-sm);
        font-size: var(--font-sm);
        font-weight: var(--font-weight-medium);
        background: var(--bg-subtle);
        border: 1px solid var(--border-medium);
        color: var(--text-primary);
        
        i {
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }
      }
    }
  }
</style>
