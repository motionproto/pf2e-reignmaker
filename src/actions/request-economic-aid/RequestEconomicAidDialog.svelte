<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getKingdomActor } from '../../stores/KingdomStore';
  import type { Faction, AttitudeLevel } from '../../models/Faction';
  import { 
    FACTION_ATTITUDE_ICONS, 
    FACTION_ATTITUDE_COLORS, 
    FACTION_ATTITUDE_NAMES 
  } from '../../utils/presentation';
  import { logger } from '../../utils/Logger';
  
  export let show: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  let selectedFactionId: string | null = null;
  let eligibleFactions: Faction[] = [];
  
  $: if (show) {
    loadEligibleFactions();
  }
  
  async function loadEligibleFactions() {
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('❌ [RequestEconomicAidDialog] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('❌ [RequestEconomicAidDialog] No kingdom data available');
      return;
    }
    
    // Filter factions: Must be Friendly or Helpful (requirement for economic aid)
    eligibleFactions = (kingdom.factions || [])
      .filter((f: Faction) => f.attitude === 'Friendly' || f.attitude === 'Helpful')
      .sort((a: Faction, b: Faction) => a.name.localeCompare(b.name));
  }
  
  function selectFaction(faction: Faction) {
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
      logger.error('❌ [RequestEconomicAidDialog] Selected faction not found');
      return;
    }

    dispatch('confirm', {
      factionId: selectedFactionId,
      factionName: selectedFaction.name
    });
    
    selectedFactionId = null;
    show = false;
  }
  
  function handleCancel() {
    selectedFactionId = null;
    show = false;
    dispatch('cancel');
  }
  
  function getAttitudeConfig(attitude: AttitudeLevel) {
    return {
      displayName: FACTION_ATTITUDE_NAMES[attitude],
      icon: FACTION_ATTITUDE_ICONS[attitude],
      color: FACTION_ATTITUDE_COLORS[attitude]
    };
  }
</script>

{#if show}
<div class="dialog-overlay" on:click={handleCancel}>
  <div class="dialog-content" on:click|stopPropagation>
    <div class="dialog-header">
      <h2>Request Economic Aid</h2>
      <button class="close-button" on:click={handleCancel}>
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="dialog-body">
      <div class="info-notice">
        <i class="fas fa-info-circle"></i>
        <span>Request resources from an allied nation. Only Friendly or Helpful factions will provide aid.</span>
      </div>
      
      {#if eligibleFactions.length === 0}
        <div class="no-factions">
          <i class="fas fa-exclamation-circle"></i>
          <p>No factions available for economic aid.</p>
          <p class="hint">You need at least one Friendly or Helpful faction.</p>
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
                on:click={() => selectFaction(faction)}
              >
                <div class="col-name">
                  {faction.name}
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
        disabled={!selectedFactionId}
        on:click={handleConfirm}
      >
        <i class="fas fa-check"></i>
        Request Aid
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
    background: var(--overlay-higher);
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
    background: var(--surface-lower);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 60px var(--overlay-high);
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
      background: var(--surface-lower);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      
      &:hover:not(:disabled) {
        background: var(--surface-low);
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
  
  .info-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--surface-info);
    border: 1px solid var(--border-info-subtle);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    font-size: var(--font-md);
    color: var(--text-secondary);
    
    i {
      color: rgb(59, 130, 246);
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
    
    &:hover {
      background: rgba(100, 116, 139, 0.15);
    }
    
    &.selected {
      background: var(--surface-info);
      border-left: 3px solid var(--color-primary);
      padding-left: 13px;
    }
    
    .col-name {
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
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
        background: var(--surface);
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
