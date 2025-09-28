<script lang="ts">
  import type { Structure } from '../../../../models/Structure';
  import { getTierLabel } from '../../utils/structure-presentation';
  
  export let structure: Structure;
  export let tier: number;
</script>

<div class="structure-card-header">
  <span class="tier-badge">{getTierLabel(structure.tier || tier)}</span>
  <h4>{structure.name}</h4>
  {#if structure.upgradeFrom}
    <span class="upgrade-badge">
      <i class="fas fa-level-up-alt"></i>
      Upgrade
    </span>
  {/if}
</div>

<style lang="scss">
  .structure-card-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: 0.5rem;
    
    .tier-badge {
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--text-secondary);
      background: rgba(251, 191, 36, 0.1);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-amber);
    }
    
    h4 {
      margin: 0;
      color: var(--text-primary);
      font-size: var(--font-xl);
      font-weight: 600;
      font-family: var(--base-font);
      flex: 1;
    }
    
    .upgrade-badge {
      font-size: var(--font-xs);
      color: var(--color-green);
      background: rgba(34, 197, 94, 0.1);
      padding: 0.125rem 0.375rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-green);
      display: flex;
      align-items: center;
      gap: 0.25rem;
      
      i {
        font-size: var(--font-xs);
      }
    }
  }
</style>
