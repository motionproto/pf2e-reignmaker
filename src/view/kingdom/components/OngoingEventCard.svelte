<script lang="ts">
  import { buildPossibleOutcomes, formatOutcomeMessage } from '../../../controllers/shared/PossibleOutcomeHelpers';
  import EventCard from './EventCard.svelte';
  
  // Props
  export let modifier: any;                    // ActiveModifier with originalEventData
  export let controller: any;                  // EventPhaseController
  export let isViewingCurrentPhase: boolean;
  
  // State
  let isExpanded = false;
  
  // Extract event data
  $: event = modifier.originalEventData;
  $: possibleOutcomes = event ? buildPossibleOutcomes(event.effects) : [];
  
  // Check if this modifier can be resolved (has original event data)
  $: canResolve = !!event;
  
  // Get failure preview message (what happens if ignored)
  $: failurePreview = (() => {
    if (!event?.effects) {
      // Fallback for modifiers without event data
      return modifier.description || 'This modifier cannot be resolved manually';
    }
    
    // Prefer critical failure, fallback to failure
    const failureEffect = event.effects.criticalFailure || event.effects.failure;
    if (!failureEffect) return 'Unknown effect';
    
    return formatOutcomeMessage(failureEffect.msg, failureEffect.modifiers);
  })();
  
  function toggleExpand() {
    isExpanded = !isExpanded;
  }
</script>

<div class="ongoing-event-card" class:expanded={isExpanded}>
  <!-- Header - Always visible, click to toggle -->
  <button class="event-header" on:click={toggleExpand} type="button">
    <div class="header-content">
      <h3 class="event-title">{event?.name || modifier.name}</h3>
      <span class="ongoing-badge">Ongoing</span>
    </div>
    {#if !isExpanded}
      <div class="failure-preview">
        <span class="preview-label">If ignored:</span>
        <span class="preview-text">{@html failurePreview}</span>
      </div>
    {/if}
    <i class="fas fa-chevron-{isExpanded ? 'up' : 'down'} toggle-icon"></i>
  </button>
  
  <!-- Expanded content -->
  {#if isExpanded}
    <div class="event-body">
      {#if canResolve}
        <p class="event-description">{event.description}</p>
        
        <EventCard
          checkType="event"
          item={event}
          {isViewingCurrentPhase}
          {possibleOutcomes}
          showIgnoreButton={false}
          resolved={false}
          resolution={null}
          on:executeSkill
          on:applyResult
          on:cancel
          on:reroll
          on:debugOutcomeChanged
        />
      {:else}
        <p class="event-description">{modifier.description || 'No description available'}</p>
        <div class="unresolvable-notice">
          <i class="fas fa-info-circle"></i>
          <span>This modifier cannot be resolved manually and will be applied automatically.</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .ongoing-event-card {
    background: linear-gradient(135deg,
      rgba(31, 31, 35, 0.6),
      rgba(15, 15, 17, 0.4));
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-medium);
    overflow: hidden;
    transition: all 0.2s ease;
    
    &.expanded {
      border-color: var(--color-amber);
    }
  }
  
  .event-header {
    width: 100%;
    padding: 15px 20px;
    background: rgba(251, 191, 36, 0.1);
    border: none;
    border-bottom: 1px solid var(--color-amber);
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease;
    position: relative;
    
    &:hover {
      background: rgba(251, 191, 36, 0.15);
    }
    
    .expanded & {
      border-bottom-color: var(--color-amber);
    }
  }
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .event-title {
    margin: 0;
    font-size: var(--font-2xl);
    font-weight: var(--font-weight-semibold);
    line-height: 1.3;
    color: var(--text-primary);
    flex: 1;
  }
  
  .ongoing-badge {
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: var(--font-xs);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    background: rgba(251, 191, 36, 0.2);
    color: var(--color-amber-light);
    border: 1px solid var(--color-amber);
    margin-left: 12px;
  }
  
  .failure-preview {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 30px;
    
    .preview-label {
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      color: var(--color-orange);
      letter-spacing: 0.05em;
    }
    
    .preview-text {
      font-size: var(--font-sm);
      color: var(--text-secondary);
      line-height: 1.4;
    }
  }
  
  .toggle-icon {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-amber-light);
    font-size: var(--font-md);
    transition: transform 0.2s ease;
  }
  
  .event-body {
    padding: 20px;
  }
  
  .event-description {
    font-size: var(--font-md);
    line-height: 1.5;
    color: var(--text-secondary);
    margin-bottom: 20px;
  }
  
  .unresolvable-notice {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px;
    background: rgba(100, 116, 139, 0.1);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: var(--font-sm);
    
    i {
      color: var(--text-tertiary);
      font-size: var(--font-lg);
    }
  }
</style>
