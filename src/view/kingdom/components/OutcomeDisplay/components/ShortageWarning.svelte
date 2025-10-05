<script lang="ts">
  import { formatStateChangeLabel } from '../../../../../services/resolution';
  
  export let shortfallResources: string[] = [];
  
  $: hasShortfalls = shortfallResources.length > 0;
</script>

{#if hasShortfalls}
  <div class="shortage-warning">
    <div class="shortage-warning-header">
      <i class="fas fa-exclamation-triangle"></i>
      <span>Resource Shortage</span>
    </div>
    <div class="shortage-warning-content">
      <p>
        You didn't have enough 
        {#each shortfallResources as resource, i}
          {#if i > 0}{i === shortfallResources.length - 1 ? ' and ' : ', '}{/if}<strong>{formatStateChangeLabel(resource)}</strong>
        {/each}
        to pay the full cost.
      </p>
      <p class="shortage-penalty">
        <i class="fas fa-angry"></i> 
        <strong>+1 Unrest</strong> from shortage
      </p>
    </div>
  </div>
{/if}

<style lang="scss">
  .shortage-warning {
    padding: 14px 16px;
    background: linear-gradient(135deg, 
      rgba(239, 68, 68, 0.2),
      rgba(239, 68, 68, 0.08));
    border: 2px solid rgba(239, 68, 68, 0.5);
    border-radius: var(--radius-sm);
    
    .shortage-warning-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--color-red);
      margin-bottom: 10px;
      
      i {
        font-size: 18px;
      }
    }
    
    .shortage-warning-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      p {
        margin: 0;
        color: var(--text-primary);
        font-size: var(--font-md);
        line-height: 1.5;
        
        strong {
          color: var(--color-red-light);
          font-weight: var(--font-weight-bold);
        }
      }
      
      .shortage-penalty {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(239, 68, 68, 0.15);
        border-radius: var(--radius-xs);
        border-left: 3px solid var(--color-red);
        
        i {
          color: var(--color-red);
          font-size: 16px;
        }
        
        strong {
          color: var(--color-red-light);
        }
      }
    }
  }
</style>
