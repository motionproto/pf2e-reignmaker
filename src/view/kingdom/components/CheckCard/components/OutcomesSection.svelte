<script lang="ts">
  import PossibleOutcomes from '../../PossibleOutcomes.svelte';
  import type { PossibleOutcome } from '../../PossibleOutcomes.svelte';
  
  export let possibleOutcomes: PossibleOutcome[] = [];
</script>

<div class="outcomes-section">
  <PossibleOutcomes 
    outcomes={possibleOutcomes}
    showTitle={false}
  />
</div>

<style lang="scss">
  .outcomes-section {
    margin-top: var(--space-20);
  }
</style>
