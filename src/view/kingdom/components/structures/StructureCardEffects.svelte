<script lang="ts">
  import type { Structure } from '../../../../models/Structure';
  
  export let structure: Structure;
</script>

<div class="structure-card-effects">
  <div class="effect-label">Effect</div>
  {#if structure.effect}
    <p class="effect-text">{structure.effect}</p>
  {/if}
  
  {#if structure.effects.goldPerTurn}
    <div class="effect-item">
      <i class="fas fa-coins" style="color: #ffd700;"></i>
      <span>+{structure.effects.goldPerTurn} Gold/turn</span>
    </div>
  {/if}
  
  {#if structure.effects.unrestReductionPerTurn}
    <div class="effect-item">
      <i class="fas fa-dove" style="color: #87ceeb;"></i>
      <span>-{structure.effects.unrestReductionPerTurn} Unrest/turn</span>
    </div>
  {/if}
  
  {#if structure.effects.foodStorage}
    <div class="effect-item">
      <i class="fas fa-warehouse" style="color: #cd853f;"></i>
      <span>+{structure.effects.foodStorage} Food Storage</span>
    </div>
  {/if}
  
  {#if structure.special}
    <div class="special-note">
      <i class="fas fa-sparkles"></i>
      {structure.special}
    </div>
  {/if}
</div>

<style lang="scss">
  .structure-card-effects {
    .effect-label {
      font-size: var(--font-s);
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;

    }
    
    .effect-text {
      margin: 0.25rem 0 0.5rem 0;
      font-size: var(--font-md);
      color: var(--text-primary);
      line-height: 1.4;
    }
    
    .effect-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.25rem 0;
      font-size: var(--font-sm);
      color: var(--text-primary);
      
      i {
        width: 1rem;
        text-align: center;
        font-size: var(--font-sm);
      }
    }
    
    .special-note {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(251, 191, 36, 0.05);
      border-left: 2px solid var(--color-amber);
      font-size: var(--font-xs);
      color: var(--text-secondary);
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      
      i {
        color: var(--color-amber);
        font-size: var(--font-xs);
        margin-top: 0.125rem;
      }
    }
  }
</style>
