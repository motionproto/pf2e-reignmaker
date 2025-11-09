<script lang="ts">
  import { getOutcomeBadgeClass, getOutcomeBadgeLabel } from '../../../utils/presentation';
  
  export let resolutionHistory: Array<{ actor: string; outcome: string }> = [];
</script>

<div class="resolution-history-badges">
  {#each resolutionHistory as res}
    <span class="history-badge {getOutcomeBadgeClass(res.outcome)}">
      {res.actor} - {getOutcomeBadgeLabel(res.outcome)}
    </span>
  {/each}
</div>

<style lang="scss">
  .resolution-history-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    margin-top: var(--space-8);
  }
  
  .history-badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-2) var(--space-8);
    border-radius: var(--radius-sm);
    font-size: var(--font-xs);
    font-weight: var(--font-weight-medium);
    line-height: 1.2;
    border: 1px solid;
    
    &.badge-crit-success {
      background: rgba(34, 197, 94, 0.15);
      border-color: rgba(34, 197, 94, 0.4);
      color: var(--color-green);
    }
    
    &.badge-success {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.3);
      color: var(--color-green-light);
    }
    
    &.badge-failure {
      background: rgba(249, 115, 22, 0.1);
      border-color: rgba(249, 115, 22, 0.3);
      color: var(--color-orange);
    }
    
    &.badge-crit-failure {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: var(--color-red);
    }
    
    &.badge-neutral {
      background: rgba(100, 116, 139, 0.1);
      border-color: rgba(100, 116, 139, 0.3);
      color: var(--text-secondary);
    }
  }
</style>
