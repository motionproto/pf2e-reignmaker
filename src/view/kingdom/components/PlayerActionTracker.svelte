<script lang="ts">
  import { kingdomData, onlinePlayers } from '../../../stores/KingdomStore';
  
  export let compact: boolean = false;
  
  let headerExpanded: boolean = false;
  
  // Note: onlinePlayers now comes from reactive store, updated by Foundry hooks
  // This ensures the tracker updates in real-time when players connect/disconnect
  // Actions are still preserved from actionLog even if players disconnect
  
  // Get action log
  $: actionLog = $kingdomData.turnState?.actionLog || [];
  
  // Map of playerId -> action count
  $: playerActionCounts = actionLog.reduce((acc, entry) => {
    const current = acc.get(entry.playerId) || 0;
    acc.set(entry.playerId, current + 1);
    return acc;
  }, new Map<string, number>());
  
  // Group actions by player
  $: actionsByPlayer = actionLog.reduce((acc, entry) => {
    if (!acc[entry.playerId]) acc[entry.playerId] = [];
    acc[entry.playerId].push(entry);
    return acc;
  }, {} as Record<string, typeof actionLog>);
  
  // Players who have acted (for header expansion)
  $: playersWhoActed = $onlinePlayers.filter((p: any) => (playerActionCounts.get(p.playerId) || 0) > 0);
  
  // Helper to format action name from actionName field (e.g., "build-structure-success")
  function formatActionName(actionName: string): { name: string; outcome: string } {
    const parts = actionName.split('-');
    if (parts.length < 2) return { name: actionName, outcome: '' };
    
    // Last part is the outcome
    const outcome = parts[parts.length - 1];
    // Everything before is the action name
    const name = parts.slice(0, -1).join('-');
    
    return { 
      name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      outcome: formatOutcome(outcome)
    };
  }
  
  // Format outcome string
  function formatOutcome(outcome: string): string {
    switch (outcome) {
      case 'criticalSuccess': return 'Critical Success';
      case 'success': return 'Success';
      case 'failure': return 'Failure';
      case 'criticalFailure': return 'Critical Failure';
      default: return outcome;
    }
  }
  
  // Get outcome CSS class
  function getOutcomeClass(outcome: string): string {
    if (outcome.toLowerCase().includes('success')) return 'outcome-success';
    if (outcome.toLowerCase().includes('failure')) return 'outcome-failure';
    return '';
  }
  
  // Toggle header expansion
  function toggleHeader() {
    headerExpanded = !headerExpanded;
  }
</script>

<div class="player-action-tracker {compact ? 'compact' : ''}">
  <div class="tracker-header" on:click={toggleHeader}>
    <div class="tracker-title">
      <i class="fas fa-users"></i>
      <span>Actions</span>
      <i class="fas fa-chevron-{headerExpanded ? 'up' : 'down'} toggle-icon"></i>
    </div>

    <div class="player-dots">
      {#each $onlinePlayers as player}
        {@const hasActed = (playerActionCounts.get(player.playerId) || 0) > 0}
        <div 
          class="player-dot {hasActed ? 'acted' : ''}"
          style="border-color: {player.playerColor}; background-color: {hasActed ? player.playerColor : 'transparent'};"
          title={player.displayName}
        >
          {#if hasActed}
            <i class="fas fa-check"></i>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  
  <!-- Expandable action details -->
  {#if headerExpanded}
    <div class="action-details">
      {#if playersWhoActed.length === 0}
        <div class="no-actions">No actions performed yet</div>
      {:else}
        {#each $onlinePlayers as player}
          {@const playerLog = actionsByPlayer[player.playerId] || []}
          {#if playerLog.length > 0}
            <div class="player-action-group">
              <div class="player-header">
                <div 
                  class="player-dot-small acted"
                  style="border-color: {player.playerColor}; background-color: {player.playerColor};"
                >
                  <i class="fas fa-check"></i>
                </div>
                <span class="player-name">{player.characterName}</span>
                <span class="action-count">({playerLog.length} action{playerLog.length > 1 ? 's' : ''})</span>
              </div>
              <div class="action-list">
                {#each playerLog as action}
                  {@const formatted = formatActionName(action.actionName)}
                  <div class="action-entry">
                    <span class="action-name">{formatted.name}</span>
                    <span class="action-arrow">→</span>
                    <span class="action-outcome {getOutcomeClass(formatted.outcome)}">{formatted.outcome}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .player-action-tracker {
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-subtle);
    margin: 0 var(--space-16);
    &.compact {
      background: transparent;
      border: none;
    }
  }
  
  .tracker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0;
    gap: var(--space-16);
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.8;
    }
  }
  
  .tracker-title {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    padding: var(--space-12) var(--space-16);

    i {
      color: var(--color-amber);
    }
    
    .toggle-icon {
      font-size: var(--font-sm);
      margin-left: var(--space-6);
      color: var(--text-secondary);
    }
  }

  .player-dots {
    display: flex;
    gap: var(--space-16);
    align-items: center;
    padding-right: var(--space-16);
  }

  .player-dot {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    border: 2px solid;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    
    &.acted {
      box-shadow: 0 0 0.5rem rgba(251, 191, 36, 0.4);
      
      i {
        color: white;
        font-size: var(--font-xs);
        text-shadow: 0.0625rem 0.0625rem 0.125rem rgba(0, 0, 0, 0.5);
      }
    }
  }
  
  .player-dot-small {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    &.acted {
      box-shadow: 0 0 0.375rem rgba(251, 191, 36, 0.3);
      
      i {
        color: white;
        font-size: var(--font-xs);
        text-shadow: 0.0625rem 0.0625rem 0.125rem rgba(0, 0, 0, 0.5);
      }
    }
  }
  
  .action-details {
    padding: var(--space-16);
    background: rgba(0, 0, 0, 0.3);
    border-top: 1px solid var(--border-faint);
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }
  
  .no-actions {
    color: var(--text-tertiary);
    font-style: italic;
    font-size: var(--font-sm);
    text-align: center;
    padding: var(--space-10);
  }
  
  .player-action-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
  
  .player-header {
    display: flex;
    align-items: center;
    gap: var(--space-10);
  }
  
  .player-name {
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-semibold);
  }
  
  .action-count {
    color: var(--text-tertiary);
    font-size: var(--font-sm);
  }
  
  .action-list {
    margin-left: var(--space-24);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }
  
  .action-entry {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    font-size: var(--font-sm);
  }
  
  .action-name {
    color: var(--text-secondary);
  }
  
  .action-arrow {
    color: var(--text-tertiary);
    font-size: var(--font-xs);
  }
  
  .action-outcome {
    font-weight: var(--font-weight-semibold);
    
    &.outcome-success {
      color: var(--color-green);
    }
    
    &.outcome-failure {
      color: var(--color-red);
    }
  }
</style>
