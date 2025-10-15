<script lang="ts">
  import type { BuildProject } from '../../../../models/BuildProject';
  import { getResourceIcon, getResourceColor } from '../../utils/presentation';
  
  export let project: BuildProject;
  
  // Convert totalCost object to array for iteration
  $: costArray = Object.entries(project.totalCost || {});
</script>

<div class="build-queue-item">
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
    
    <!-- Build cost -->
    <div class="item-cost">
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
  
  .item-cost {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    
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
