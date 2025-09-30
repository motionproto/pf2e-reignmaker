<script lang="ts">
  import { getAllPlayerActions, type PlayerAction } from '../../../stores/gameState';
  import { gameState } from '../../../stores/gameState';
  import { kingdomState } from '../../../stores/kingdom';
  
  export let compact: boolean = false;
  
  $: playerActions = getAllPlayerActions();
  $: currentPhase = $kingdomState.currentPhase;
</script>

<div class="player-action-tracker {compact ? 'compact' : ''}">
  {#if !compact}
    <h4 class="tracker-title">Player Actions</h4>
  {/if}
  
  <div class="player-actions-list">
    {#each playerActions as action}
      <div class="player-action-item">
        <span class="player-name">{action.playerName}:</span>
        <div 
          class="action-dot {action.actionSpent ? 'spent' : 'available'}"
          style="background-color: {action.actionSpent ? action.playerColor : 'rgba(255, 255, 255, 0.1)'}; 
                 border-color: {action.playerColor};"
          title="{action.actionSpent ? `Action spent in ${action.spentInPhase}` : 'Action available'}"
        >
          {#if action.actionSpent}
            <i class="fas fa-check"></i>
          {/if}
        </div>
        {#if !compact && action.actionSpent && action.spentInPhase}
          <span class="spent-in-phase">({action.spentInPhase})</span>
        {/if}
      </div>
    {/each}
    
    {#if playerActions.length === 0}
      <div class="no-players">No player actions initialized</div>
    {/if}
  </div>
</div>

<style lang="scss">
  .player-action-tracker {
    padding: 15px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    
    &.compact {
      padding: 10px;
      background: transparent;
      border: none;
      
      .player-actions-list {
        flex-direction: row;
        gap: 15px;
      }
      
      .player-action-item {
        gap: 8px;
      }
      
      .player-name {
        font-size: var(--font-sm);
      }
      
      .action-dot {
        width: 16px;
        height: 16px;
      }
    }
  }
  
  .tracker-title {
    margin: 0 0 12px 0;
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
  }
  
  .player-actions-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .player-action-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .player-name {
    color: var(--text-secondary);
    font-size: var(--font-md);
    min-width: 100px;
  }
  
  .action-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    &.available {
      background: rgba(255, 255, 255, 0.1);
      opacity: 0.7;
      
      &:hover {
        opacity: 1;
      }
    }
    
    &.spent {
      box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
      
      i {
        color: white;
        font-size: var(--font-xs);
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      }
    }
  }
  
  .spent-in-phase {
    color: var(--text-tertiary);
    font-size: var(--font-sm);
    font-style: italic;
    margin-left: 5px;
  }
  
  .no-players {
    color: var(--text-tertiary);
    font-style: italic;
    font-size: var(--font-sm);
  }
</style>
