<script lang="ts">
  export let description: string;
</script>

<p class="card-full-description">{description}</p>

<style lang="scss">
  .card-full-description {
    margin: 0 0 16px 0;
    color: var(--text-secondary);
    font-size: var(--font-md);
    line-height: 1.5;
    text-align: left;
  }
</style>
