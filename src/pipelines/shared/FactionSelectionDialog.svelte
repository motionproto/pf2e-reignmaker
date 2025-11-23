<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getKingdomActor } from '../../stores/KingdomStore';
  import type { Faction, AttitudeLevel } from '../../models/Faction';
  import { ATTITUDE_ORDER } from '../../models/Faction';
  import { 
    FACTION_ATTITUDE_ICONS, 
    FACTION_ATTITUDE_COLORS, 
    FACTION_ATTITUDE_NAMES,
    FACTION_ATTITUDE_DESCRIPTIONS 
  } from '../../utils/presentation';
  import { logger } from '../../utils/Logger';
  
  // Props
  export let show: boolean = false;
  export let title: string = 'Select Faction';
  export let description: string = 'Choose a faction to interact with';
  export let filterMode: 'diplomatic' | 'aid' | 'espionage' = 'diplomatic';
  export let showCost: boolean = false;
  export let cost: number = 4;
  
  const dispatch = createEventDispatcher();
  
  // UI State
  let selectedFactionId: string | null = null;
  let eligibleFactions: Array<Faction & { isEligible: boolean; reason?: string }> = [];
  let availableGold: number = 0;
  let isAnimating: boolean = false;
  let highlightedIndex: number = -1;
  
  // Load eligible factions when dialog is shown
  $: if (show) {
    loadEligibleFactions();
  }
  
  async function loadEligibleFactions() {
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('❌ [FactionSelectionDialog] No kingdom actor available');
      return;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('❌ [FactionSelectionDialog] No kingdom data available');
      return;
    }
    
    availableGold = kingdom.resources?.gold || 0;
    
    // Get factions that have already provided aid this turn (for aid mode)
    const aidedThisTurn = kingdom.turnState?.actionsPhase?.factionsAidedThisTurn || [];
    
    // Count allied armies per faction (for military aid mode)
    const armiesByFaction = new Map<string, number>();
    for (const army of kingdom.armies || []) {
      if (army.exemptFromUpkeep && army.ledBy) {
        const count = armiesByFaction.get(army.ledBy) || 0;
        armiesByFaction.set(army.ledBy, count + 1);
      }
    }
    
    // Filter and map factions based on mode
    eligibleFactions = (kingdom.factions || [])
      .map((f: Faction) => {
        let isEligible = true;
        let reason: string | undefined;
        
        switch (filterMode) {
          case 'diplomatic':
            // Can't improve Helpful (already max) or Hostile (requires different action)
            if (f.attitude === 'Helpful') {
              isEligible = false;
              reason = 'Already at maximum attitude';
            } else if (f.attitude === 'Hostile') {
              isEligible = false;
              reason = 'Hostile factions cannot be improved this way';
            }
            break;
            
          case 'aid':
            // Only Friendly or Helpful factions can provide aid
            if (f.attitude !== 'Friendly' && f.attitude !== 'Helpful') {
              isEligible = false;
              reason = 'Must be Friendly or Helpful to provide aid';
            } else if (aidedThisTurn.includes(f.id)) {
              isEligible = false;
              reason = 'Already provided aid this turn';
            }
            // Check army limit for military aid
            if (isEligible && title.toLowerCase().includes('military')) {
              const currentArmies = armiesByFaction.get(f.name) || 0;
              const maxArmies = f.attitude === 'Helpful' ? 2 : 1;
              if (currentArmies >= maxArmies) {
                isEligible = false;
                reason = 'Maximum military aid reached';
              }
            }
            break;
            
          case 'espionage':
            // All factions are valid targets for espionage
            isEligible = true;
            break;
        }
        
        return {
          ...f,
          isEligible,
          reason
        };
      })
      .sort((a: any, b: any) => {
        // Sort eligible first, then by attitude (worst to best for diplomatic, best to worst for others)
        if (a.isEligible !== b.isEligible) {
          return a.isEligible ? -1 : 1;
        }
        const aIndex = ATTITUDE_ORDER.indexOf(a.attitude);
        const bIndex = ATTITUDE_ORDER.indexOf(b.attitude);
        return filterMode === 'diplomatic' ? (bIndex - aIndex) : (aIndex - bIndex);
      });
  }
  
  function selectFaction(faction: typeof eligibleFactions[0]) {
    if (!faction.isEligible || isAnimating) return;
    
    if (showCost && availableGold < cost) {
      // @ts-ignore
      ui?.notifications?.warn(`Insufficient gold (need ${cost}, have ${availableGold})`);
      return;
    }
    
    // Toggle selection: if already selected, deselect; otherwise select
    selectedFactionId = selectedFactionId === faction.id ? null : faction.id;
  }
  
  async function selectRandomFaction() {
    if (isAnimating) return;
    
    // Get only eligible factions
    const eligible = eligibleFactions.filter(f => f.isEligible);
    if (eligible.length === 0) {
      // @ts-ignore
      ui?.notifications?.warn('No eligible factions available');
      return;
    }
    
    // Randomly select one
    const randomIndex = Math.floor(Math.random() * eligible.length);
    const selectedFaction = eligible[randomIndex];
    
    // Find the index in the full list
    const targetIndex = eligibleFactions.findIndex(f => f.id === selectedFaction.id);
    
    // Start animation
    isAnimating = true;
    selectedFactionId = null;
    
    // Cycle through the list once, highlighting each faction
    const animationSpeed = 80; // ms per faction
    const totalFactions = eligibleFactions.length;
    
    for (let i = 0; i < totalFactions; i++) {
      highlightedIndex = i;
      await new Promise(resolve => setTimeout(resolve, animationSpeed));
    }
    
    // Now go to the target and blink twice
    highlightedIndex = targetIndex;
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Blink 1
    highlightedIndex = -1;
    await new Promise(resolve => setTimeout(resolve, 100));
    highlightedIndex = targetIndex;
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Blink 2
    highlightedIndex = -1;
    await new Promise(resolve => setTimeout(resolve, 100));
    highlightedIndex = targetIndex;
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Select the faction
    selectedFactionId = selectedFaction.id;
    highlightedIndex = -1;
    isAnimating = false;
  }
  
  function handleConfirm() {
    if (isAnimating) return;
    
    if (!selectedFactionId) {
      // @ts-ignore
      ui?.notifications?.warn('Please select a faction');
      return;
    }
    
    const selectedFaction = eligibleFactions.find(f => f.id === selectedFactionId);
    if (!selectedFaction) {
      logger.error('❌ [FactionSelectionDialog] Selected faction not found');
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
      color: FACTION_ATTITUDE_COLORS[attitude],
      description: FACTION_ATTITUDE_DESCRIPTIONS[attitude]
    };
  }
</script>

{#if show}
<div class="dialog-overlay" on:click={handleCancel}>
  <div class="dialog-content" on:click|stopPropagation>
    <div class="dialog-header">
      <h2>{title}</h2>
      <button class="close-button" on:click={handleCancel}>
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="dialog-body">
      {#if showCost}
        <div class="info-header">
          <div class="gold-display">
            <i class="fas fa-coins"></i>
            <span>Available: {availableGold} gold</span>
          </div>
        </div>
        
        <div class="cost-notice">
          <i class="fas fa-info-circle"></i>
          <span>Cost: {cost} gold (2 gold on critical success)</span>
        </div>
      {/if}
      
      <p class="dialog-description">{description}</p>
      
      <button 
        class="random-button" 
        disabled={isAnimating || eligibleFactions.filter(f => f.isEligible).length === 0}
        on:click={selectRandomFaction}
      >
        <i class="fas fa-dice"></i>
        {isAnimating ? 'Selecting...' : 'Random Faction'}
      </button>
      
      {#if eligibleFactions.length === 0}
        <div class="no-factions">
          <i class="fas fa-exclamation-circle"></i>
          <p>No factions available.</p>
          <p class="hint">Create factions or improve relations first.</p>
        </div>
      {:else}
        <div class="faction-table">
          <div class="table-header">
            <div class="col-name">Faction</div>
            <div class="col-attitude">Attitude</div>
          </div>
          
          <div class="table-body">
            {#each eligibleFactions as faction, index (faction.id)}
              {@const config = getAttitudeConfig(faction.attitude)}
              <div class="table-row-container">
                <div
                  class="table-row"
                  class:selected={selectedFactionId === faction.id}
                  class:highlighted={highlightedIndex === index}
                  class:disabled={!faction.isEligible || isAnimating}
                  on:click={() => selectFaction(faction)}
                >
                  <div class="col-name">
                    {faction.name}
                  </div>
                  <div class="col-attitude">
                    <div class="attitude-badge" style="border-color: {config.color};">
                      <i class="fas {config.icon}" style="color: {config.color};"></i>
                      <span>{config.displayName}</span>
                    </div>
                  </div>
                </div>
                {#if !faction.isEligible && faction.reason}
                  <div class="row-description">
                    {faction.reason}
                  </div>
                {/if}
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
        disabled={!selectedFactionId || (showCost && availableGold < cost)}
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
  
  .info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 16px;
    
    .gold-display {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: var(--font-md);
      font-weight: var(--font-weight-medium);
      white-space: nowrap;
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid var(--border-accent-subtle);
      
      i {
        color: rgb(234, 179, 8);
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
  
  .dialog-description {
    margin: 0 0 16px 0;
    font-size: var(--font-md);
    color: var(--text-secondary);
    line-height: 1.5;
  }
  
  .random-button {
    width: 100%;
    padding: 12px 16px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: var(--radius-md);
    color: white;
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    i {
      font-size: var(--font-lg);
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
  
  .table-row-container {
    border-bottom: 1px solid var(--border-medium);
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .table-row {
    display: grid;
    grid-template-columns: 2fr 1.5fr;
    gap: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-lg);
    align-items: center;
    
    &:hover:not(.disabled) {
      background: rgba(100, 116, 139, 0.15);
    }
    
    &.selected {
      background: var(--surface-info);
      border-left: 3px solid var(--color-primary);
      padding-left: 13px;
    }
    
    &.highlighted {
      background: rgba(102, 126, 234, 0.2);
      border-left: 3px solid #667eea;
      padding-left: 13px;
      animation: pulse 0.3s ease;
    }
    
    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: rgba(100, 116, 139, 0.05);
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
  
  .row-description {
    padding: 0 var(--space-16) var(--space-12) var(--space-16);
    font-size: var(--font-sm);
    font-weight: normal;
    color: var(--text-secondary);
    line-height: 1.5;
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
