<script lang="ts">
   import { getTierColor } from './settlements.utils';
   
   export let tier: string;
</script>

<div class="settlement-tier">
   <span class="tier-badge">{tier}</span>
</div>

<style lang="scss">
   .settlement-tier {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
      
      .tier-badge {
         padding: 0.125rem 0.5rem;
         border-radius: var(--radius-md);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
         background: rgba(128, 128, 128, 0.2);
         color: var(--text-secondary);
      }
   }
</style>
