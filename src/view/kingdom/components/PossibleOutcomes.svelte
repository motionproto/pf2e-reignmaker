<script context="module" lang="ts">
  export interface PossibleOutcome {
    result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';
    label: string;
    description: string;
  }
</script>

<script lang="ts">
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
              {outcome.description}
            </div>
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
    font-size: var(--type-heading-2-size);
    font-weight: var(--type-heading-2-weight);
    line-height: var(--type-heading-2-line);
    color: var(--text-primary);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .outcomes-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .outcome-item {
    padding: 8px 6px 8px 12px;
    border-radius: var(--radius-md);
    border-left: 4px solid;
    transition: all 0.2s ease;
    background: rgba(0, 0, 0, 0.2);
    
    &:hover {
      transform: translateX(2px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    &.outcome-criticalSuccess {
      background: rgba(34, 197, 94, 0.05);
      border-left-color: var(--color-green);
      
      .outcome-icon {
        color: var(--color-green);
      }
      
      .outcome-label {
        color: var(--color-green);
      }
    }
    
    &.outcome-success {
      background: rgba(34, 197, 94, 0.03);
      border-left-color: var(--color-green-light);
      
      .outcome-icon {
        color: var(--color-green-light);
      }
      
      .outcome-label {
        color: var(--color-green-light);
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
    }
    
    &.outcome-criticalFailure {
      background: rgba(239, 68, 68, 0.05);
      border-left-color: var(--color-red);
      
      .outcome-icon {
        color: var(--color-red);
      }
      
      .outcome-label {
        color: var(--color-red);
      }
    }
  }
  
  .outcome-content-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  
  .outcome-icon {
    flex-shrink: 0;
    margin-top: -1px;
    font-size: 16px;
    width: 20px;
  }
  
  .outcome-content {
    flex-grow: 1;
  }
  
  .outcome-label {
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
    line-height: var(--type-label-line);
    letter-spacing: var(--type-label-spacing);
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  
  .outcome-description {
    color: var(--text-secondary);
    font-size: var(--type-body-size);
    line-height: var(--type-body-line);
  }
</style>
