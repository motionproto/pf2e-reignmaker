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
  
  const dispatch = createEventDispatcher();
  
  function handleClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    dispatch('toggle');
  }
</script>

<button 
  class="card-header-btn"
  on:click={handleClick}
  disabled={false}
>
  <div class="card-header-content">
    <div class="card-title-row">
      <strong class="card-name">{name}</strong>
      <div class="card-badges">
        {#if resolved}
          <span class="resolved-badge">
            <i class="fas fa-check-circle"></i>
            {resolvedBadgeText}
          </span>
        {/if}
        {#if !available && missingRequirements.length > 0}
          <span class="requirements-badge">
            <i class="fas fa-exclamation-triangle"></i>
            {missingRequirements.join(', ')}
          </span>
        {/if}
        <i class="fas fa-chevron-{expanded ? 'down' : 'right'} expand-icon"></i>
      </div>
    </div>
    {#if brief}
      <span class="card-brief">{brief}</span>
    {/if}
  </div>
</button>

<style lang="scss">
  .card-header-btn {
    display: flex;
    width: 100%;
    background: transparent;
    border: none;
    margin: 0;
    padding: 0.75em 1em;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease;
    box-sizing: border-box;
    flex-shrink: 0;
    min-height: min-content;
    
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.02);
    }
    
    &:disabled {
      cursor: not-allowed;
    }
  }
  
  .card-header-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    
    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      width: 100%;
      
      .card-name {
        color: var(--text-primary);
        font-size: var(--font-3xl);
        font-weight: var(--font-weight-semibold);
        line-height: 1.3;
        text-align: left;
        flex: 1;
      }
      
      .card-badges {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        
        .resolved-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: var(--radius-sm);
          font-size: var(--font-sm);
          font-weight: var(--font-weight-medium);
          line-height: 1.2;
          letter-spacing: 0.05em;
          color: var(--color-green);
          text-transform: uppercase;
          
          i {
            font-size: 12px;
          }
        }
        
        .requirements-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: var(--radius-sm);
          font-size: var(--font-sm);
          font-weight: var(--font-weight-medium);
          line-height: 1.2;
          letter-spacing: 0.05em;
          color: var(--color-amber);
          text-transform: none;
          
          i {
            font-size: 12px;
          }
        }
        
        .expand-icon {
          color: var(--text-tertiary);
          transition: transform 0.3s ease;
          font-size: 14px;
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
    }
  }
</style>
