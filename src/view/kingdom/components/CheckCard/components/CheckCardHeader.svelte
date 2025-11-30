<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ResolutionHistoryBadges from './ResolutionHistoryBadges.svelte';
  
  export let name: string;
  export let brief: string = '';
  export let resolved: boolean = false;
  export let available: boolean = true;
  export let expanded: boolean = false;
  export let resolvedBadgeText: string = 'Resolved';
  export let missingRequirements: string[] = [];
  export let traits: string[] = [];
  export let expandable: boolean = true;  // Control chevron visibility
  export let statusBadge: { text: string; type: 'ongoing' | 'resolved' } | null = null;
  
  // Migration status tracking
  export let actionStatus: 'untested' | 'testing' | 'tested' | null = null;
  export let actionNumber: number | null | undefined = undefined;  // Action number for migration badge (1-26)
  
  // Incident status tracking
  export let incidentStatus: 'untested' | 'testing' | 'tested' | null = null;
  export let incidentNumber: number | null | undefined = undefined;  // Incident number for testing badge (1-30)
  
  const dispatch = createEventDispatcher();
  
  function handleClick(event: Event) {
    if (!expandable) return;
    event.preventDefault();
    event.stopPropagation();
    dispatch('toggle');
  }
</script>

{#if expandable}
  <button 
    class="card-header-btn"
    class:expanded
    on:click={handleClick}
    disabled={false}
  >
    <div class="card-header-content">
      <div class="card-title-row">
        <strong class="card-name" class:unavailable={!available}>{name}</strong>
        <div class="card-badges">
          {#if statusBadge}
            <span class="status-badge {statusBadge.type}}">{statusBadge.text}</span>
          {/if}
          {#if traits && traits.length > 0}
            <div class="card-traits">
              {#each traits as trait}
                <span class="trait-badge">{trait}</span>
              {/each}
            </div>
          {/if}
          {#if !available && missingRequirements.length > 0}
            <span class="requirements-badge">
              <i class="fas fa-exclamation-triangle"></i>
              {missingRequirements.join(', ')}
            </span>
          {/if}
          {#if actionStatus === 'tested' && actionNumber}
            <span class="migration-badge tested" title="Tested with PipelineCoordinator">
              #{actionNumber} ✓
            </span>
          {:else if actionStatus === 'testing' && actionNumber}
            <span class="migration-badge testing" title="Currently being tested">
              #{actionNumber} ⟳
            </span>
          {:else if actionStatus === 'untested' && actionNumber}
            <span class="migration-number untested" title="Pipeline exists, needs testing">
              #{actionNumber}
            </span>
          {/if}
          {#if incidentStatus === 'tested'}
            <span class="incident-badge tested" title="Tested with PipelineCoordinator">
              <i class="fas fa-check"></i>
            </span>
          {:else if incidentStatus === 'testing'}
            <span class="incident-badge testing" title="Currently being tested">
              testing
            </span>
          {:else if incidentStatus === 'untested'}
            <span class="incident-badge untested" title="Pipeline exists, needs testing">
              untested
            </span>
          {/if}
          <div class="expand-icon-wrapper">
            <i class="fas fa-chevron-{expanded ? 'down' : 'right'} expand-icon"></i>
          </div>
        </div>
      </div>
    </div>
  </button>
{:else}
  <div class="card-header-static">
    <div class="card-header-content">
      <div class="card-title-row">
        <strong class="card-name" class:unavailable={!available}>{name}</strong>
        <div class="card-badges">
          {#if statusBadge}
            <span class="status-badge {statusBadge.type}">{statusBadge.text}</span>
          {/if}
          {#if traits && traits.length > 0}
            <div class="card-traits">
              {#each traits as trait}
                <span class="trait-badge">{trait}</span>
              {/each}
            </div>
          {/if}
          {#if !available && missingRequirements.length > 0}
            <span class="requirements-badge">
              <i class="fas fa-exclamation-triangle"></i>
              {missingRequirements.join(', ')}
            </span>
          {/if}
          {#if incidentStatus === 'tested'}
            <span class="incident-badge tested" title="Tested with PipelineCoordinator">
              <i class="fas fa-check"></i>
            </span>
          {:else if incidentStatus === 'testing'}
            <span class="incident-badge testing" title="Currently being tested">
              testing
            </span>
          {:else if incidentStatus === 'untested'}
            <span class="incident-badge untested" title="Pipeline exists, needs testing">
              untested
            </span>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .card-header-btn,
  .card-header-static {
    display: flex;
    width: 100%;
    background: transparent;
    border: none;
    margin: 0;
    padding: var(--space-12) var(--space-16);
    text-align: left;
    box-sizing: border-box;
    flex-shrink: 0;
    min-height: min-content;
  }
  
  .card-header-btn {
    cursor: pointer;
    transition: background 0.2s ease;
    
    &.expanded {
      background: var(--surface-low);
    }
    
    &:hover:not(:disabled) {
      background: var(--overlay-lower);
    }
    
    &.expanded:hover:not(:disabled) {
      background: var(--surface-high);
    }
    
    &:disabled {
      cursor: not-allowed;
    }
  }
  
  .card-header-static {
    cursor: default;
  }
  
  .card-header-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    width: 100%;
    
    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-16);
      width: 100%;
      
      .card-name {
        color: var(--text-primary);
        font-size: var(--font-2xl);
        font-weight: var(--font-weight-semibold);
        line-height: 1.3;
        text-align: left;
        flex: 1;
        
        &.unavailable {
          color: var(--text-secondary);
          opacity: 0.7;
        }
      }
      
      .card-badges {
        display: flex;
        align-items: center;
        gap: var(--space-8);
        flex-shrink: 0;
        flex-wrap: wrap;
        
        .requirements-badge {
          display: inline-flex;
          align-items: baseline;
          gap: var(--space-8);
          padding: var(--space-4) var(--space-8);
         
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-md);
          font-size: var(--font-sm);
          font-weight: var(--font-weight-medium);
          line-height: 1.2;
          color: var(--color-amber);
          text-transform: none;
          
          i {
            font-size: var(--font-sm);
          }
        }
        
        .expand-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: var(--space-16);
          height: var(--space-16);
          flex-shrink: 0;
        }
        
        .expand-icon {
          color: var(--text-tertiary);
          transition: transform 0.3s ease;
          font-size: var(--font-sm);
        }
      }
    }
    
    .card-brief {
      color: var(--text-secondary);
      font-size: var(--font-md);
      line-height: 1.5;
      opacity: 0.8;
      text-align: left;
      display: block;
      
      &.unavailable {
        color: var(--text-tertiary);
        opacity: 0.6;
      }
    }
    
    .card-traits {
      display: flex;
      gap: var(--space-6);
      flex-wrap: wrap;
      align-items: center;
    }
    
    .trait-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-2) var(--space-8);
      background: var(--surface-low);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      letter-spacing: 0.05rem;
      color: var(--text-tertiary);
      text-transform: capitalize;
    }
    
    .status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4) var(--space-12);
      border-radius: var(--radius-full);
      font-size: var(--font-sm);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.05rem;
      line-height: 1.2;
      flex-shrink: 0;
      
      &.ongoing {
        background: var(--surface-accent-high);
        color: var(--color-amber-light);
        border: 1px solid var(--color-amber);
      }
      
      &.resolved {
        background: var(--surface-success-high);
        color: var(--color-green);
        border: 1px solid var(--color-green-border);
      }
    }
    
    .migration-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4) var(--space-10);
      border-radius: var(--radius-full);
      font-size: var(--font-xs);
      font-weight: var(--font-weight-semibold);
      letter-spacing: 0.05rem;
      line-height: 1.2;
      flex-shrink: 0;
      cursor: help;
      
      &.tested {
        background: var(--surface-success);
        border: 1px solid var(--border-success);
        color: var(--color-green);
      }
      
      &.testing {
        background: transparent;
        border: 1px solid var(--text-primary);
        color: var(--text-primary);
      }
    }
    
    .migration-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      letter-spacing: 0.05rem;
      line-height: 1.2;
      flex-shrink: 0;
      cursor: help;
      
      &.untested {
        color: var(--text-tertiary);
      }
    }
    
    .incident-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4) var(--space-10);
      border-radius: var(--radius-full);
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      letter-spacing: 0.025rem;
      line-height: 1.2;
      flex-shrink: 0;
      cursor: help;
      text-transform: lowercase;
      
      &.untested {
        color: var(--text-tertiary);
        background: transparent;
        opacity: 0.6;
        font-weight: var(--font-weight-normal);
      }
      
      &.testing {
        background: var(--surface-success);
        border: 1px solid var(--border-success);
        color: var(--color-green);
        text-transform: lowercase;
      }
      
      &.tested {
        background: var(--surface-success);
        border: 1px solid var(--border-success);
        color: var(--color-green);
        
        i {
          font-size: var(--font-xs);
        }
      }
    }
  }
</style>
