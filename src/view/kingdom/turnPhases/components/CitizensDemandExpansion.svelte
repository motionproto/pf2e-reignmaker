<script lang="ts">
  /**
   * CitizensDemandExpansion - Displays hexes that citizens demand be claimed
   * 
   * Shows when demand-expansion events have marked hexes as 'demanded'.
   * Each unclaimed demanded hex generates +1 Unrest per turn.
   */
  import { PLAYER_KINGDOM } from '../../../../types/ownership';
  import { kingdomData } from '../../../../stores/KingdomStore';
  import AdjustmentBadges from '../../components/AdjustmentBadges.svelte';

  interface DemandedHex {
    id: string;
    terrain: string;
    isEnemyTerritory: boolean;
    enemyFaction: string | null;
    eventInstanceId?: string;
    createdTurn?: number;
  }

  // Reactive: compute demanded hexes from kingdom data
  $: hexes = $kingdomData.hexes || [];
  
  $: demandedHexes = hexes
    .filter((h: any) => {
      const features = h.features || [];
      const hasDemanded = features.some((f: any) => f.type === 'demanded');
      const notPlayerClaimed = !h.claimedBy || h.claimedBy !== PLAYER_KINGDOM;
      return hasDemanded && notPlayerClaimed;
    })
    .map((h: any): DemandedHex => {
      const features = h.features || [];
      const demandedFeature = features.find((f: any) => f.type === 'demanded');
      const isEnemyTerritory = h.claimedBy && h.claimedBy !== PLAYER_KINGDOM;
      
      return {
        id: h.id,
        terrain: h.terrain || 'unknown',
        isEnemyTerritory,
        enemyFaction: h.claimedBy || null,
        eventInstanceId: demandedFeature?.eventInstanceId,
        createdTurn: demandedFeature?.createdTurn
      };
    });

  // Calculate total unrest: 1 per demanded hex
  $: totalUnrest = demandedHexes.length;
  
  // Create modifier array for AdjustmentBadges (matches Kingdom Size format)
  $: unrestModifiers = totalUnrest > 0 ? [{
    type: 'static' as const,
    resource: 'unrest',
    value: totalUnrest,
    duration: 'permanent' as const
  }] : [];
</script>

{#if demandedHexes.length > 0}
  <div class="demand-expansion-card">
    <div class="card-header">
      <span class="card-title">Citizens Demand Expansion</span>
      <AdjustmentBadges modifiers={unrestModifiers} />
    </div>
    
    <div class="card-content">
      <div class="hex-tokens">
        {#each demandedHexes as hex}
          <span 
            class="hex-token"
            class:enemy={hex.isEnemyTerritory}
            title="{hex.terrain}{hex.isEnemyTerritory ? ' (Enemy Territory)' : ''}"
          >
            <i class="fas {hex.isEnemyTerritory ? 'fa-swords' : 'fa-map-marker-alt'}"></i>
            <span class="hex-id">{hex.id}</span>
          </span>
        {/each}
      </div>
      
      <p class="hint-text">
        {#if demandedHexes.some(h => h.isEnemyTerritory)}
          Claim these hexes to satisfy citizens. Enemy territory requires an army first.
        {:else}
          Claim these hexes to satisfy citizens and earn rewards.
        {/if}
      </p>
    </div>
  </div>
{/if}

<style lang="scss">
  .demand-expansion-card {
    background: linear-gradient(135deg, 
      rgba(100, 116, 139, 0.1),
      rgba(71, 85, 105, 0.05));
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-12);
    padding: var(--space-12) var(--space-16);
    background: var(--surface-low);
    border-bottom: 1px solid var(--border-default);
  }
  
  .card-title {
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
  }
  
  .card-content {
    padding: var(--space-12) var(--space-16);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .hex-tokens {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
  }
  
  .hex-token {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-6) var(--space-10);
    background: var(--surface-higher);
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    
    i {
      font-size: var(--font-sm);
      color: var(--text-secondary);
    }
    
    &.enemy {
      border-color: var(--color-amber);
      background: rgba(251, 191, 36, 0.1);
      
      i {
        color: var(--color-amber);
      }
    }
  }
  
  .hex-id {
    font-family: var(--font-mono, monospace);
  }
  
  .hint-text {
    margin: 0;
    font-size: var(--font-md);
    color: var(--text-tertiary);
    line-height: 1.4;
  }
</style>
