<script lang="ts">
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import { structuresService } from '../../../../../services/structures';
  
  // Define tiers with display info
  const tiers = [
    { tier: 1, name: 'Market Square', ratio: '2:1' },
    { tier: 2, name: 'Bazaar', ratio: '3:2' },
    { tier: 3, name: 'Merchant Guild', ratio: '1:1' },
    { tier: 4, name: 'Imperial Bank', ratio: '1:2' }
  ];
  
  // Reactively calculate current tier from kingdom data
  $: currentTier = (() => {
    if (!$kingdomData.settlements || $kingdomData.settlements.length === 0) {
      return 0;
    }
    
    // Initialize structures service
    structuresService.initializeStructures();
    
    // Check for commerce structures in priority order
    const tierMap: { [key: string]: number } = {
      'imperial-bank': 4,
      'merchant-guild': 3,
      'bazaar': 2,
      'market-square': 1
    };
    
    let highestTier = 0;
    
    for (const settlement of $kingdomData.settlements) {
      if (!settlement.structureIds || settlement.structureIds.length === 0) continue;
      
      for (const structureId of settlement.structureIds) {
        const tier = tierMap[structureId];
        if (tier && tier > highestTier) {
          highestTier = tier;
        }
      }
    }
    
    return highestTier;
  })();
</script>

<div class="commerce-tier-info">
  <div class="tier-label">Current Commerce Structure:</div>
  <div class="tier-badges">
    {#each tiers as tier}
        <div 
          class="tier-badge"
          class:active={currentTier === tier.tier}
        >
          <span class="tier-name">{tier.name}</span>
          <span class="tier-ratio">{tier.ratio}</span>
          {#if currentTier === tier.tier}
            <i class="fas fa-check-circle"></i>
          {/if}
        </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .commerce-tier-info {
    margin: 12px 0 16px 0;
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    border: 1px solid var(--border-subtle);
  }
  
  .tier-label {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    margin-bottom: 8px;
  }
  
  .tier-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .tier-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-sm);
    font-size: var(--font-sm);
    color: var(--text-secondary);
    transition: all 0.2s ease;
    
    &.active {
      background: rgba(34, 197, 94, 0.15);
      border-color: var(--color-green);
      color: var(--color-green);
      
      i {
        color: var(--color-green);
        font-size: var(--font-xs);
      }
    }
  }
  
  .tier-name {
    font-weight: var(--font-weight-medium);
  }
  
  .tier-ratio {
    font-weight: var(--font-weight-semibold);
    opacity: 0.9;
  }
</style>
