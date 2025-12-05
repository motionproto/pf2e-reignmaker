<script lang="ts">
  import { renderBadgeToString } from '../../../types/OutcomeBadge';
  import type { UnifiedOutcomeBadge } from '../../../types/OutcomeBadge';
  
  export let badges: UnifiedOutcomeBadge[];
</script>

{#if badges && badges.length > 0}
  {#each badges as badge}
    {@const text = renderBadgeToString(badge)}
    {#if text}
      <span class="badge">{text}</span>
    {/if}
  {/each}
{/if}

<style lang="scss">
  .badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-lg);
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    line-height: 1.3;
    white-space: nowrap;
    background: var(--hover-low);
    color: var(--text-secondary);
    border: 1px solid var(--border-medium);
  }
</style>







