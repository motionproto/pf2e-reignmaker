<script lang="ts">
  import { buildPossibleOutcomes, formatOutcomeMessage } from '../../../controllers/shared/PossibleOutcomeHelpers';
  import BaseCheckCard from './BaseCheckCard.svelte';
  
  // Props
  export let instance: any;                    // ActiveEventInstance
  export let controller: any;                  // EventPhaseController
  export let isViewingCurrentPhase: boolean;
  
  // State
  let isExpanded = false;
  
  // Extract event data and resolution state
  $: event = instance.eventData;
  $: resolution = instance.appliedOutcome || null;
  $: resolved = !!resolution;
  $: possibleOutcomes = event ? buildPossibleOutcomes(event.effects) : [];
  
  // Build outcomes array for BaseCheckCard
  $: eventOutcomes = event ? (() => {
    const outcomes: Array<{
      type: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
      description: string;
      modifiers?: Array<{ resource: string; value: number }>;
    }> = [];
    
    if (event.effects.criticalSuccess) {
      outcomes.push({
        type: 'criticalSuccess',
        description: event.effects.criticalSuccess.msg
      });
    }
    if (event.effects.success) {
      outcomes.push({
        type: 'success',
        description: event.effects.success.msg
      });
    }
    if (event.effects.failure) {
      outcomes.push({
        type: 'failure',
        description: event.effects.failure.msg
      });
    }
    if (event.effects.criticalFailure) {
      outcomes.push({
        type: 'criticalFailure',
        description: event.effects.criticalFailure.msg
      });
    }
    
    return outcomes;
  })() : [];
  
  // Check if this instance can be resolved (has event data)
  $: canResolve = !!event;
  
  // Get failure preview message (what happens if ignored)
  $: failurePreview = (() => {
    if (!event?.effects) {
      // Fallback for instances without event data
      return instance.description || 'This event cannot be resolved manually';
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
      <h3 class="event-title">{event?.name || 'Ongoing Event'}</h3>
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
        
        <BaseCheckCard
          id={instance.instanceId}
          name={event.name}
          description={event.description}
          skills={event.skills}
          outcomes={eventOutcomes}
          traits={event.traits || []}
          checkType="event"
          expandable={false}
          showCompletions={false}
          showAvailability={false}
          showSpecial={false}
          showIgnoreButton={false}
          {isViewingCurrentPhase}
          {possibleOutcomes}
          showAidButton={false}
          {resolved}
          {resolution}
          primaryButtonLabel="Apply Result"
          skillSectionTitle="Choose Your Response:"
          on:executeSkill
          on:primary
          on:cancel
          on:reroll
        />
      {:else}
        <p class="event-description">{instance.description || 'No description available'}</p>
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
    padding: var(--space-16) var(--space-20);
    background: var(--surface-accent-low);
    border: none;
    border-bottom: 1px solid var(--color-amber);
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease;
    position: relative;
    
    &:hover {
      background: var(--surface-accent);
    }
    
    .expanded & {
      border-bottom-color: var(--color-amber);
    }
  }
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-8);
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
    padding: var(--space-4) var(--space-10);
    border-radius: var(--radius-full);
    font-size: var(--font-xs);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    background: var(--surface-accent-high);
    color: var(--color-amber-light);
    border: 1px solid var(--color-amber);
    margin-left: var(--space-12);
  }
  
  .failure-preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding-right: var(--space-24);
    
    .preview-label {
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      color: var(--color-orange);
      letter-spacing: 0.05rem;
    }
    
    .preview-text {
      font-size: var(--font-sm);
      color: var(--text-secondary);
      line-height: 1.4;
    }
  }
  
  .toggle-icon {
    position: absolute;
    right: 1.25rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-amber-light);
    font-size: var(--font-md);
    transition: transform 0.2s ease;
  }
  
  .event-body {
    padding: var(--space-20);
  }
  
  .event-description {
    font-size: var(--font-md);
    line-height: 1.5;
    color: var(--text-secondary);
    margin-bottom: var(--space-20);
  }
  
  .unresolvable-notice {
    display: flex;
    align-items: center;
    gap: var(--space-10);
    padding: var(--space-16);
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
