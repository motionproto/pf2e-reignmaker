<script lang="ts">
  import Notification from '../../baseComponents/Notification.svelte';
  
  export let special: string | null = '';
  export let cost: Map<string, number> | null = null;
  
  // Build cost description string from Map
  $: costDescription = cost 
    ? Array.from(cost.entries())
        .map(([resource, amount]) => 
          `${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`
        )
        .join(', ')
    : '';
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
      <Notification
        variant="warning"
        size="compact"
        title="Cost"
        description={costDescription}
      />
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
