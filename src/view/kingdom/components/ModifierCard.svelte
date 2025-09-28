<script lang="ts">
   import type { KingdomModifier } from '../../../models/Modifiers';
   
   export let modifier: KingdomModifier;
</script>

<div class="modifier-card">
   <div class="modifier-name">{modifier.name}</div>
   {#if modifier.description}
      <div class="modifier-desc">{modifier.description}</div>
   {/if}
   <div class="modifier-duration">
      {#if typeof modifier.duration === 'number' && modifier.duration > 0}
         <i class="far fa-clock"></i> {modifier.duration} turns remaining
      {:else if modifier.duration === 'until-resolved'}
         <i class="fas fa-exclamation-triangle"></i> Until Resolved
      {:else if modifier.duration === 'permanent'}
         <i class="fas fa-infinity"></i> Permanent
      {/if}
   </div>
</div>

<style lang="scss">
   .modifier-card {
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      padding: 1rem;
      transition: all 0.2s ease;
      
      &:hover {
         border-color: var(--border-medium);
         background: rgba(0, 0, 0, 0.4);
         transform: translateY(-2px);
         box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }
      
      .modifier-name {
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
         margin-bottom: 8px;
         font-size: var(--font-lg);
      }
      
      .modifier-desc {
         font-size: var(--font-md);
         color: var(--text-secondary);
         margin-bottom: 10px;
         line-height: 1.4;
      }
      
      .modifier-duration {
         font-size: var(--font-s);
         color: var(--color-amber);
         display: flex;
         align-items: center;
         gap: 5px;
         
         i {
            font-size: 12px;
         }
      }
   }
</style>
