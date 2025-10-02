<script lang="ts">
   import type { ActiveModifier } from '../../../models/Modifiers';
   
   export let modifier: ActiveModifier;
</script>

<div class="modifier-card">
   <div class="modifier-header">
      {#if modifier.icon}
         <i class="{modifier.icon}"></i>
      {/if}
      <div class="modifier-name">{modifier.name}</div>
      <div class="modifier-tier">Tier {modifier.tier}</div>
   </div>
   
   {#if modifier.description}
      <div class="modifier-desc">{modifier.description}</div>
   {/if}
   
   <div class="modifier-source">
      Source: {modifier.sourceName} ({modifier.sourceType})
   </div>
   
   {#if modifier.modifiers && modifier.modifiers.length > 0}
      <div class="modifier-effects">
         {#each modifier.modifiers as effect}
            <div class="effect-badge">
               {effect.resource}: {effect.value > 0 ? '+' : ''}{effect.value}
            </div>
         {/each}
      </div>
   {/if}
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
      
      .modifier-header {
         display: flex;
         align-items: center;
         gap: 8px;
         margin-bottom: 8px;
         
         i {
            font-size: var(--font-lg);
            color: var(--color-amber);
         }
      }
      
      .modifier-name {
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
         font-size: var(--font-lg);
         flex: 1;
      }
      
      .modifier-tier {
         font-size: var(--font-s);
         color: var(--color-blue);
         padding: 2px 8px;
         border-radius: 4px;
         background: rgba(59, 130, 246, 0.2);
      }
      
      .modifier-desc {
         font-size: var(--font-md);
         color: var(--text-secondary);
         margin-bottom: 10px;
         line-height: 1.4;
      }
      
      .modifier-source {
         font-size: var(--font-s);
         color: var(--text-muted);
         margin-bottom: 8px;
      }
      
      .modifier-effects {
         display: flex;
         flex-wrap: wrap;
         gap: 6px;
         margin-top: 8px;
         
         .effect-badge {
            font-size: var(--font-xs);
            padding: 4px 8px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid var(--border-subtle);
            color: var(--text-secondary);
         }
      }
   }
</style>
