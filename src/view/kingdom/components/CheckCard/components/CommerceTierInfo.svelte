<script lang="ts">
  import { onMount } from 'svelte';
  import { kingdomData } from '../../../../../stores/KingdomStore';
  import { structuresService } from '../../../../../services/structures';
  
  console.log('✅ [CommerceTierInfo] Component loaded!');
  
  onMount(() => {
    console.log('✅ [CommerceTierInfo] Component mounted!');
  });
  
  // Define tiers with display info
  const tiers = [
    { tier: 1, name: 'Market Square', ratio: '2:1' },
    { tier: 2, name: 'Bazaar', ratio: '3:2' },
    { tier: 3, name: 'Merchant Guild', ratio: '1:1' },
    { tier: 4, name: 'Imperial Bank', ratio: '1:2' }
  ];
  
  // Reactively calculate current tier from kingdom data
  $: currentTier = (() => {
    // Initialize structures service first
    structuresService.initializeStructures();
    
    if (!$kingdomData?.settlements || $kingdomData.settlements.length === 0) {
      console.log('🔍 [CommerceTierInfo] No settlements found');
      return 0;
    }
    
    console.log('🔍 [CommerceTierInfo] Settlements:', $kingdomData.settlements);
    
    // Check for commerce structures in priority order
    const tierMap: { [key: string]: number } = {
      'imperial-bank': 4,
      'merchant-guild': 3,
      'bazaar': 2,
      'market-square': 1
    };
    
    let highestTier = 0;
    
    for (const settlement of $kingdomData.settlements) {
      console.log(`🔍 [CommerceTierInfo] Checking settlement:`, settlement.name, settlement.structureIds);
      if (!settlement.structureIds || settlement.structureIds.length === 0) continue;
      
      for (const structureId of settlement.structureIds) {
        const tier = tierMap[structureId];
        if (tier && tier > highestTier) {
          highestTier = tier;
          console.log(`🔍 [CommerceTierInfo] Found commerce structure: ${structureId} (tier ${tier})`);
        }
      }
    }
    
    console.log(`🔍 [CommerceTierInfo] Current commerce tier: ${highestTier}`);
    return highestTier;
  })();
</script>

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
{#if currentTier === 0}
  <div class="no-commerce-notice">
    <i class="fas fa-info-circle"></i>
    <span>No commerce structure built. Build one to enable trading!</span>
  </div>
{/if}

<style lang="scss">
  .tier-badges {
    margin: 12px 0;
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
  
  .no-commerce-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-sm);
    font-size: var(--font-sm);
    color: var(--color-amber);
    
    i {
      font-size: var(--font-md);
      opacity: 0.8;
    }
  }
</style>
