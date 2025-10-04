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
    padding: 14px 16px;
    background: linear-gradient(135deg, 
      rgba(251, 146, 60, 0.15),
      rgba(251, 146, 60, 0.05));
    border: 2px solid rgba(251, 146, 60, 0.4);
    border-radius: var(--radius-sm);
    
    .manual-effects-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: rgba(251, 146, 60, 1);
      margin-bottom: 10px;
      
      i {
        font-size: 18px;
      }
    }
    
    .manual-effects-list {
      margin: 0;
      padding-left: 24px;
      list-style-type: disc;
      
      li {
        color: var(--text-primary);
        font-size: var(--font-md);
        line-height: 1.6;
        margin-bottom: 6px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
</style>
