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
    padding: var(--space-12) var(--space-16);
    background: linear-gradient(135deg, 
      rgba(239, 68, 68, 0.2),
      rgba(239, 68, 68, 0.08));
    border: 0.1250rem solid rgba(239, 68, 68, 0.5);
    border-radius: var(--radius-sm);
    
    .shortage-warning-header {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--color-red);
      margin-bottom: var(--space-10);
      
      i {
        font-size: var(--font-lg);
      }
    }
    
    .shortage-warning-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      
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
        gap: var(--space-8);
        padding: var(--space-8) var(--space-12);
        background: rgba(239, 68, 68, 0.15);
        border-radius: var(--radius-xs);
        border-left: 3px solid var(--color-red);
        
        i {
          color: var(--color-red);
          font-size: var(--font-md);
        }
        
        strong {
          color: var(--color-red-light);
        }
      }
    }
  }
</style>
