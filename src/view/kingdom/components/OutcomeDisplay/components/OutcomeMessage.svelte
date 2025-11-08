<script lang="ts">
  export let effect: string;
</script>

{#if effect && effect.trim().length > 0}
  <div class="resolution-effect">
    {@html effect}
  </div>
{/if}

<style lang="scss">
  .resolution-effect {
    color: var(--text-primary);
    font-size: var(--font-lg);
    font-weight: var(--font-weight-medium);
    line-height: 1.4;
    padding: 0;
  }
</style>
