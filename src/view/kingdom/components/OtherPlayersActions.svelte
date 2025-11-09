<script lang="ts">
  // Define ActionResolution inline since stores/gameState doesn't exist
  interface ActionResolution {
    playerName: string;
    playerColor: string;
    actorName: string;
    skillName?: string;
    outcome: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
  }
  
  export let resolutions: ActionResolution[] = [];
  export let compact: boolean = false;
</script>

{#if resolutions.length > 0}
  <div class="other-players-actions {compact ? 'compact' : ''}">
    <div class="actions-label">Other Players:</div>
    <div class="player-badges">
      {#each resolutions as resolution}
        <div 
          class="player-badge outcome-{resolution.outcome}"
          style="border-color: {resolution.playerColor}; background-color: {resolution.playerColor}20;"
          title="{resolution.playerName} {formatOutcome(resolution.outcome)} ({resolution.actorName} - {resolution.skillName || 'Unknown'})"
        >
          <span class="player-name" style="color: {resolution.playerColor};">
            {resolution.playerName.substring(0, 2).toUpperCase()}
          </span>
          <span class="outcome-icon">
            {#if resolution.outcome === 'criticalSuccess'}
              <i class="fas fa-star"></i>
            {:else if resolution.outcome === 'success'}
              <i class="fas fa-check"></i>
            {:else if resolution.outcome === 'failure'}
              <i class="fas fa-times"></i>
            {:else if resolution.outcome === 'criticalFailure'}
              <i class="fas fa-skull"></i>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<script context="module" lang="ts">
  function formatOutcome(outcome: string): string {
    switch (outcome) {
      case 'criticalSuccess':
        return 'critically succeeded';
      case 'success':
        return 'succeeded';
      case 'failure':
        return 'failed';
      case 'criticalFailure':
        return 'critically failed';
      default:
        return outcome;
    }
  }
</script>

<style lang="scss">
  .other-players-actions {
    margin-top: var(--space-10);
    padding: var(--space-10);
    background: var(--overlay-low);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-faint);
    
    &.compact {
      margin-top: var(--space-4);
      padding: var(--space-4);
      
      .actions-label {
        font-size: var(--font-xs);
      }
      
      .player-badge {
        padding: var(--space-2) var(--space-4);
        font-size: var(--font-xs);
      }
    }
  }
  
  .actions-label {
    font-size: var(--font-sm);
    color: var(--text-secondary);
    margin-bottom: var(--space-4);
    font-weight: var(--font-weight-semibold);
  }
  
  .player-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
  }
  
  .player-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-xs);
    border: 2px solid;
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    cursor: help;
    transition: all 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 0.125rem 0.5rem var(--overlay);
    }
    
    &.outcome-criticalSuccess {
      .outcome-icon {
        color: #44ff44;
      }
    }
    
    &.outcome-success {
      .outcome-icon {
        color: #88ff88;
      }
    }
    
    &.outcome-failure {
      .outcome-icon {
        color: #ff8888;
      }
    }
    
    &.outcome-criticalFailure {
      .outcome-icon {
        color: #ff4444;
      }
    }
  }
  
  .player-name {
    font-weight: var(--font-weight-bold);
  }
  
  .outcome-icon {
    display: flex;
    align-items: center;
    
    i {
      font-size: var(--font-xs);
    }
  }
</style>
