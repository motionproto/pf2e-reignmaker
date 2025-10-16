<script lang="ts">
  import type { Structure } from '../../../../../models/Structure';
  
  export let structure: Structure;
</script>

<div class="structure-built">
  <span class="structure-built-name">{structure.name}</span>
  <span class="structure-built-tier">Tier {structure.tier || 1}</span>
</div>

<style lang="scss">
  .structure-built {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 1rem;
    padding-bottom: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    opacity: 0.75;
    
    .structure-built-name {
      flex: 1;
      font-size: var(--font-xl);
      color: var(--text-secondary);
      font-weight: var(--font-weight-semibold);
    }
    
    .structure-built-tier {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.08);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-default);
    }
  }
</style>
