<script lang="ts">
  export let description: string;
  export let brief: string = '';
  
  // Use brief if available, otherwise fall back to full description
  $: displayText = brief || description;
</script>

<p class="card-full-description">{displayText}</p>

<style lang="scss">
  .card-full-description {
    margin: 0 0 var(--space-16) 0;
    color: var(--text-secondary);
    font-size: var(--font-md);
    line-height: 1.5;
    text-align: left;
  }
</style>
