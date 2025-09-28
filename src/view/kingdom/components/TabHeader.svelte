<script lang="ts">
  export let title: string;
</script>

<div class="tab-header">
  <h2>{title}</h2>
  {#if $$slots.default}
    <slot />
  {/if}
</div>

<style lang="scss">
  .tab-header {
    h2 {
      padding: 0.5rem 1rem;
      color: var(--white);
      font-size: var(--font-4xl);
      font-family: var(--base-font);
    }
  }
</style>
