<script lang="ts">
  /**
   * CompletionNotifications - Shows stacked notifications of completed actions
   * Displays: Character Name - Outcome - Effect Summary
   * 
   * Now reads from the action log (same source as PlayerActionTracker)
   */
  
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import type { ActionLogEntry } from '../../../../../models/TurnState';
  
  export let actionId: string;  // The action ID to filter completions for
  
  // Get action log entries for this specific action
  $: actionLog = $kingdomData.turnState?.actionLog || [];
  $: completions = actionLog
    .filter((entry: ActionLogEntry) => {
      // Parse action name format: "action-id-outcome"
      const parts = entry.actionName.split('-');
      if (parts.length < 2) return false;
      
      // Last part is outcome, everything before is the action ID
      const entryActionId = parts.slice(0, -1).join('-');
      return entryActionId === actionId;
    })
    .map((entry: ActionLogEntry) => {
      // Extract outcome from action name (last part after last dash)
      const parts = entry.actionName.split('-');
      const outcome = parts[parts.length - 1] as 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      
      return {
        actorName: entry.characterName,
        outcome,
        skillName: undefined,  // Not tracked in action log
        stateChanges: undefined  // Not tracked in action log
      };
    });
  
  // Format outcome for display
  function formatOutcome(outcome: string): string {
    switch (outcome) {
      case 'criticalSuccess':
        return 'Critical Success';
      case 'success':
        return 'Success';
      case 'failure':
        return 'Failure';
      case 'criticalFailure':
        return 'Critical Failure';
      default:
        return outcome;
    }
  }
  
  // Get outcome icon (matches PossibleOutcomes)
  function getOutcomeIcon(outcome: string): string {
    switch (outcome) {
      case 'criticalSuccess':
        return 'fa-star';
      case 'success':
        return 'fa-thumbs-up';
      case 'failure':
        return 'fa-thumbs-down';
      case 'criticalFailure':
        return 'fa-skull';
      default:
        return 'fa-question';
    }
  }
  
  // Format effects for display
  function formatEffects(stateChanges?: Record<string, any>): string {
    if (!stateChanges) return '';
    
    const effects: string[] = [];
    
    for (const [key, value] of Object.entries(stateChanges)) {
      if (key === 'meta') continue; // Skip meta information
      
      if (typeof value === 'number') {
        const sign = value > 0 ? '+' : '';
        const displayKey = key.charAt(0).toUpperCase() + key.slice(1);
        effects.push(`${sign}${value} ${displayKey}`);
      }
    }
    
    return effects.join(', ') || 'No changes';
  }
</script>

{#if completions.length > 0}
  <div class="completion-notifications">
    <div class="notifications-label">
      Completed this turn:
    </div>
    <div class="notifications-list">
      {#each completions as completion, index (index)}
        <div class="notification outcome-{completion.outcome}">
          <div class="notification-icon">
            <i class="fas {getOutcomeIcon(completion.outcome)}"></i>
          </div>
          <div class="notification-content">
            <span class="actor-name">{completion.actorName}</span>
            {#if completion.skillName}
              <span class="skill-name">({completion.skillName})</span>
            {/if}
            <span class="separator">—</span>
            <span class="outcome-text">{formatOutcome(completion.outcome)}</span>
            <span class="separator">—</span>
            <span class="effects">{formatEffects(completion.stateChanges)}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .completion-notifications {
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-medium);
  }
  
  .notifications-label {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .notifications-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .notification {
    display: flex;
    align-items: center;
    gap: .5rem;
    padding: 8px 10px 8px 0px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: var(--radius-xs);
    border-left: 3px solid;
    font-size: var(--font-sm);
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.04);
      transform: translateX(2px);
    }
    
    &.outcome-criticalSuccess {
      border-left-color: #22c55e;
      
      .notification-icon {
        color: #22c55e;
      }
    }
    
    &.outcome-success {
      border-left-color: #4ade80;
      
      .notification-icon {
        color: #4ade80;
      }
    }
    
    &.outcome-failure {
      border-left-color: #f87171;
      
      .notification-icon {
        color: #f87171;
      }
    }
    
    &.outcome-criticalFailure {
      border-left-color: #dc2626;
      
      .notification-icon {
        color: #dc2626;
      }
    }
  }
  
  .notification-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    font-size: 14px;
  }
  
  .notification-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: .75rem;
    flex-wrap: wrap;
    line-height: 1.4;
  }
  
  .actor-name {
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
  
  .skill-name {
    font-size: var(--font-s);
    color: var(--text-tertiary);
    font-style: italic;
  }
  
  .separator {
    color: var(--text-tertiary);
    opacity: 0.5;
  }
  
  .outcome-text {
    font-weight: var(--font-weight-medium);
    color: var(--text-secondary);
  }
  
  .effects {
    color: var(--text-secondary);
    font-family: var(--font-base);
    font-size: var(--font-sm);
  }
</style>
