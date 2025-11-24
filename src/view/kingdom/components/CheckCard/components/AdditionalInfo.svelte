<script lang="ts">
  import Notification from '../../baseComponents/Notification.svelte';
  import CostDisplay from '../CostDisplay.svelte';
  
  export let special: string | null = '';
  export let cost: Map<string, number> | null = null;
  
  // Convert Map to plain object for CostDisplay
  $: costObject = cost 
    ? Object.fromEntries(cost.entries())
    : {};
</script>

{#if special || cost}
  <div class="additional-info">
    {#if special}
      <Notification
        variant="info"
        size="compact"
        title={special}
        description=""
      />
    {/if}
    
    {#if cost}
      <CostDisplay cost={costObject} />
    {/if}
  </div>
{/if}

<style lang="scss">
  .additional-info {
    margin-top: var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
</style>
