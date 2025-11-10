<script context="module" lang="ts">
  import type { EventModifier } from '../../../types/modifiers';
  import type { PossibleOutcome } from '../../../controllers/shared/PossibleOutcomeHelpers';
  
  export type { PossibleOutcome };
</script>

<script lang="ts">
  import AdjustmentBadges from './AdjustmentBadges.svelte';
  
  export let outcomes: PossibleOutcome[];
  export let skill: string | undefined = undefined;
  export let showTitle: boolean = true;
  
  const resultStyles = {
    criticalSuccess: {
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-400',
      textColor: 'text-emerald-900',
      iconColor: 'text-emerald-600',
      icon: 'fa-star'
    },
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400',
      textColor: 'text-green-900',
      iconColor: 'text-green-600',
      icon: 'fa-thumbs-up'
    },
    failure: {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-400',
      textColor: 'text-orange-900',
      iconColor: 'text-orange-600',
      icon: 'fa-thumbs-down'
    },
    criticalFailure: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      textColor: 'text-red-900',
      iconColor: 'text-red-600',
      icon: 'fa-skull'
    }
  };
  
  const resultLabels = {
    criticalSuccess: 'Critical Success',
    success: 'Success',
    failure: 'Failure',
    criticalFailure: 'Critical Failure'
  };
</script>

<div class="possible-outcomes">
  {#if showTitle}
    <h4 class="outcomes-title">
      {#if skill}
        <span>{skill} Check Outcomes</span>
      {:else}
        <span>Possible Outcomes</span>
      {/if}
    </h4>
  {/if}
  
  <div class="outcomes-list">
    {#each outcomes as outcome}
      {@const style = resultStyles[outcome.result]}
      <div class="outcome-item outcome-{outcome.result}">
        <div class="outcome-content-wrapper">
          <!-- Icon -->
          <div class="outcome-icon">
            <i class="fas {style.icon}"></i>
          </div>
          
          <!-- Content -->
          <div class="outcome-content">
            <div class="outcome-label">
              {outcome.label || resultLabels[outcome.result]}
            </div>
            <div class="outcome-description">
              {@html outcome.description}
            </div>
            
            <!-- Show modifiers if present -->
            {#if outcome.modifiers && outcome.modifiers.length > 0}
              <div class="outcome-modifiers">
                <AdjustmentBadges modifiers={outcome.modifiers} />
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .possible-outcomes {
    width: 100%;
  }
  
  .outcomes-title {
    font-size: var(--font-2xl);
    font-weight: var(--font-weight-semibold);
    line-height: 1.3;
    color: var(--text-primary);
    margin-bottom: var(--space-4);
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }
  
  .outcomes-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-8);
  }
  
  /* Ensure critical success appears first, success second, 
     failure third, critical failure fourth */
  .outcome-criticalSuccess {
    order: 1;
  }
  
  .outcome-success {
    order: 2;
  }
  
  .outcome-failure {
    order: 3;
  }
  
  .outcome-criticalFailure {
    order: 4;
  }
  
  /* On smaller screens, go back to single column */
  @media (max-width: 40rem) { .outcomes-list { grid-template-columns: 1fr;
    }
  }
  
  .outcome-item {
    padding: var(--space-8) var(--space-6) var(--space-8) var(--space-12);
    border-radius: var(--radius-md);
    border-left: 4px solid;
    background: var(--overlay-low);
    
    &.outcome-criticalSuccess {
      background: var(--surface-success-lower);
      border-left-color: var(--color-green);
      
      .outcome-icon {
        color: var(--color-green);
      }
      
      .outcome-label {
        color: var(--color-green);
      }
      
      .modifier-badge {
        border-color: hsla(142, 71%, 45%, 0.5);
      }
    }
    
    &.outcome-success {
      background: var(--surface-success-lower);
      border-left-color: var(--color-green-light);
      
      .outcome-icon {
        color: var(--color-green-light);
      }
      
      .outcome-label {
        color: var(--color-green-light);
      }
      
      .modifier-badge {
        border-color: hsla(122, 39%, 49%, 0.5);
      }
    }
    
    &.outcome-failure {
      background: rgba(249, 115, 22, 0.03);
      border-left-color: var(--color-orange);
      
      .outcome-icon {
        color: var(--color-orange);
      }
      
      .outcome-label {
        color: var(--color-orange);
      }
      
      .modifier-badge {
        border-color: hsla(36, 100%, 50%, 0.5);
      }
    }
    
    &.outcome-criticalFailure {
      background: var(--surface-primary-lower);
      border-left-color: var(--color-red);
      
      .outcome-icon {
        color: var(--color-red);
      }
      
      .outcome-label {
        color: var(--color-red);
      }
      
      .modifier-badge {
        border-color: hsla(4, 66%, 58%, 0.5);
      }
    }
  }
  
  .outcome-content-wrapper {
    display: flex;
    align-items: flex-start;
    gap: var(--space-6);
  }
  
  .outcome-icon {
    flex-shrink: 0;
    margin-top: -var(--space-2);
    font-size: var(--font-md);
    width: 1.25rem;
  }
  
  .outcome-content {
    flex-grow: 1;
  }
  
  .outcome-label {
    font-size: var(--font-s);
    font-weight: var(--font-weight-medium);
    line-height: 1.4;
    letter-spacing: 0.025rem;
    text-transform: uppercase;
    margin-bottom: var(--space-8);
  }
  
  .outcome-description {
    color: var(--text-secondary);
    font-size: var(--font-md);
    line-height: ver(--line-height-snug);
    margin-bottom: var(--space-8);
  }
  
  .outcome-modifiers {
    margin-top: var(--space-6);
  }
</style>
