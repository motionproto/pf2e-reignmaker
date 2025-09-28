<script lang="ts">
  import type { ResourceCost } from '../../../../models/Structure';
  import { getResourceIcon, getResourceColor } from '../../utils/structure-presentation';
  
  export let constructionCost: ResourceCost;
</script>

<div class="structure-card-cost">
  <div class="cost-label">Cost</div>
  <div class="resource-list">
    {#each Object.entries(constructionCost) as [resource, amount]}
      {#if amount && amount > 0}
        <div class="resource-item">
          <i class="fas {getResourceIcon(resource)} resource-icon" style="color: {getResourceColor(resource)}"></i>
          <span>{amount} {resource}</span>
        </div>
      {/if}
    {/each}
    {#if Object.values(constructionCost).every(v => !v || v === 0)}
      <span class="no-cost">Free</span>
    {/if}
  </div>
</div>

<style lang="scss">
  .structure-card-cost {
    .cost-label {
      font-size: var(--font-xs);
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
      text-transform: uppercase;
    }
    
    .resource-list {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      
      .resource-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: var(--font-sm);
        color: var(--text-primary);
        
        .resource-icon {
          font-size: var(--font-sm);
        }
      }
    }
  }
  
  .no-cost {
    color: var(--text-tertiary);
    font-style: italic;
    font-size: var(--font-sm);
  }
</style>
