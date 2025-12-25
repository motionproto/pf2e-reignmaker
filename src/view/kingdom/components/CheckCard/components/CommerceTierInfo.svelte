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
    { tier: 0, name: 'No Structure', ratio: '3:1' },
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

<style lang="scss">
  .tier-badges {
    margin: var(--space-12) 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
  }
  
  .tier-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6) var(--space-12);
    background: var(--hover-low);
    border: 1px solid var(--border-medium);
    border-radius: 9999px;  /* Pill-style: fully rounded edges */
    font-size: var(--font-sm);
    color: var(--text-secondary);
    transition: all 0.2s ease;
    
    &.active {
      background: var(--surface-success);
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
