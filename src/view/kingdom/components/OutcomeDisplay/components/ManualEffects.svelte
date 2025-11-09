<script lang="ts">
  export let manualEffects: string[] | undefined = undefined;
  
  $: hasManualEffects = manualEffects && manualEffects.length > 0;
</script>

{#if hasManualEffects && manualEffects}
  <div class="manual-effects">
    <div class="manual-effects-header">
      <i class="fas fa-exclamation-triangle"></i>
      <span>Manual Effects - Apply Yourself</span>
    </div>
    <ul class="manual-effects-list">
      {#each manualEffects as effect}
        <li>{effect}</li>
      {/each}
    </ul>
  </div>
{/if}

<style lang="scss">
  .manual-effects {
    padding: var(--space-12) var(--space-16);
    background: linear-gradient(135deg, 
      rgba(251, 146, 60, 0.15),
      rgba(251, 146, 60, 0.05));
    border: 0.125rem solid rgba(251, 146, 60, 0.4);
    border-radius: var(--radius-sm);
    
    .manual-effects-header {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: rgba(251, 146, 60, 1);
      margin-bottom: var(--space-10);
      
      i {
        font-size: var(--font-lg);
      }
    }
    
    .manual-effects-list {
      margin: 0;
      padding-left: var(--space-24);
      list-style-type: disc;
      
      li {
        color: var(--text-primary);
        font-size: var(--font-md);
        line-height: 1.6;
        margin-bottom: var(--space-6);
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
</style>
