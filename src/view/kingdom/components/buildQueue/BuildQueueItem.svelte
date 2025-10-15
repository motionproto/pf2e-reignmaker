<script lang="ts">
  import type { BuildProject } from '../../../../services/buildQueue';
  import { getResourceIcon, getResourceColor } from '../../utils/presentation';
  
  export let project: BuildProject;
  
  // Convert remainingCost object to array for iteration
  // Shows what's left to pay, not the original total cost
  $: costArray = Object.entries(project.remainingCost || {});
  $: isCompleted = project.isCompleted || false;
</script>

<div class="build-queue-item" class:completed={isCompleted}>
  <!-- Thumbnail placeholder -->
  <div class="queue-item-thumbnail">
    <div class="thumbnail-placeholder">
      <i class="fas fa-building"></i>
    </div>
  </div>
  
  <!-- Item info -->
  <div class="queue-item-info">
    <div class="item-header">
      <span class="structure-name">{project.structureName}</span>
      <span class="settlement-location">in {project.settlementName}</span>
    </div>
    
    {#if isCompleted}
      <!-- Completed badge -->
      <div class="completed-badge">
        <i class="fas fa-check-circle"></i>
        <span>Completed</span>
      </div>
    {:else}
      <!-- Build cost -->
      <div class="item-cost">
        <span class="cost-label">Cost:</span>
        <div class="cost-resources">
          {#each costArray as [resource, amount]}
            {#if amount > 0}
              <div class="cost-resource">
                <i class="fas {getResourceIcon(resource)}" style="color: {getResourceColor(resource)}"></i>
                <span>{amount}</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .build-queue-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(0, 0, 0, 0.4);
      border-color: var(--border-medium);
    }
    
    &.completed {
      border-color: #4caf50;
      background: rgba(76, 175, 80, 0.15);
      
      &:hover {
        background: rgba(76, 175, 80, 0.2);
      }
    }
  }
  
  .queue-item-thumbnail {
    flex: 0 0 48px;
    height: 48px;
    
    .thumbnail-placeholder {
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      
      i {
        font-size: 20px;
        color: var(--color-amber);
        opacity: 0.6;
      }
    }
  }
  
  .queue-item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0; // Allow text truncation
  }
  
  .item-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    
    .structure-name {
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      font-size: var(--font-md);
    }
    
    .settlement-location {
      color: var(--text-tertiary);
      font-size: var(--font-sm);
      font-style: italic;
    }
  }
  
  .completed-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #4caf50;
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    
    i {
      font-size: 16px;
    }
  }
  
  .item-cost {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    
    .cost-label {
      font-size: var(--font-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .cost-resources {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .cost-resource {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-sm);
      color: var(--text-secondary);
      
      i {
        font-size: 14px;
      }
      
      span {
        font-weight: var(--font-weight-medium);
      }
    }
  }
</style>
