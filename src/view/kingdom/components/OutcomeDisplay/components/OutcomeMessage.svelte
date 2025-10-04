<script lang="ts">
  export let effect: string;
</script>

{#if effect}
  <div class="resolution-effect">
    {@html effect}
  </div>
{/if}

<style lang="scss">
  .resolution-effect {
    color: var(--text-primary);
    font-size: var(--font-3xl);
    font-weight: var(--font-weight-semibold);
    line-height: 1.4;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
  }
</style>
