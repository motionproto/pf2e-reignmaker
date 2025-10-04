<script lang="ts">
  export let special: string | null = '';
  export let cost: Map<string, number> | null = null;
</script>

{#if special || cost}
  <div class="additional-info">
    {#if special}
      <div class="info-box special-section">
        <i class="fas fa-info-circle"></i>
        <span>{special}</span>
      </div>
    {/if}
    
    {#if cost}
      <div class="info-box cost-section">
        <i class="fas fa-tag"></i>
        <span>Cost: 
          {#each Array.from(cost.entries()) as [resource, amount], i}
            {#if i > 0}, {/if}
            {amount} {resource.charAt(0).toUpperCase() + resource.slice(1)}
          {/each}
        </span>
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .additional-info {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .info-box {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    
    i {
      margin-top: 2px;
      flex-shrink: 0;
    }
    
    span {
      font-size: var(--font-md);
      line-height: 1.5;
    }
    
    &.special-section {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      
      i {
        color: var(--color-blue);
      }
      
      span {
        color: var(--color-blue-light);
      }
    }
    
    &.cost-section {
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3);
      
      i {
        color: var(--color-amber);
      }
      
      span {
        color: var(--color-amber-light);
      }
    }
  }
</style>
