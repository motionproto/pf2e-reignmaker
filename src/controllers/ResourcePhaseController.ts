/**
 * ResourcePhaseController - Simplified architecture for resource collection phase
 * 
 * Follows new architecture pattern:
 * - Business logic only
 * - Uses kingdomData store as single source of truth
 * - Returns simple success/error results
 */

import { markPhaseStepCompleted, setResource, modifyResource } from '../stores/KingdomStore';
import { get } from 'svelte/store';
import { kingdomData } from '../stores/KingdomStore';

export async function createResourcePhaseController() {
  return {
    /**
     * Phase initialization following migration guide pattern (no automatic execution)
     */
    async startPhase() {
      console.log('🟡 [ResourcePhaseController] Starting resources phase (manual mode)...');
      console.log('✅ [ResourcePhaseController] Phase ready for manual collection');
      return { success: true };
    },

    /**
     * Manual collection of both territory resources and settlement gold
     */
    async collectResources() {
      try {
        console.log('🟡 [ResourcePhaseController] Starting manual resource collection...');
        
        await this.collectTerritoryResources();
        await this.collectSettlementGold();
        await markPhaseStepCompleted('resources-collect');
        
        console.log('✅ [ResourcePhaseController] Collection completed successfully');
        return { success: true };
      } catch (error) {
        console.error('❌ [ResourcePhaseController] Failed:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },

    /**
     * Complete the phase (notify turn manager)
     */
    async completePhase() {
      try {
        await this.notifyPhaseComplete();
        console.log('✅ [ResourcePhaseController] Phase completed');
        return { success: true };
      } catch (error) {
        console.error('❌ [ResourcePhaseController] Failed to complete phase:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },

    /**
     * Collect resources from territory hexes with worksites
     */
    async collectTerritoryResources() {
      const kingdom = get(kingdomData);
      const hexes = kingdom.hexes || [];
      
      console.log(`🟡 [ResourcePhaseController] Collecting from ${hexes.length} hexes...`);
      
      const resourceTotals = new Map<string, number>();
      
      for (const hex of hexes) {
        if (!hex.worksite) continue;
        
        const production = this.calculateHexProduction(hex);
        production.forEach((amount, resource) => {
          const current = resourceTotals.get(resource) || 0;
          resourceTotals.set(resource, current + amount);
        });
      }
      
      // Apply collected resources
      for (const [resource, amount] of resourceTotals) {
        if (amount > 0) {
          await modifyResource(resource, amount);
          console.log(`✅ [ResourcePhaseController] +${amount} ${resource} from territory`);
        }
      }
      
      return resourceTotals;
    },

    /**
     * Collect gold income from settlements
     */
    async collectSettlementGold() {
      const kingdom = get(kingdomData);
      const settlements = kingdom.settlements || [];
      
      console.log(`🟡 [ResourcePhaseController] Collecting gold from ${settlements.length} settlements...`);
      
      let totalGold = 0;
      let fedCount = 0;
      let unfedCount = 0;
      
      for (const settlement of settlements) {
        // Only fed settlements generate gold
        if (settlement.wasFedLastTurn !== false) {
          // Gold income based on settlement tier
          const income = this.getSettlementGoldValue(settlement.tier);
          totalGold += income;
          fedCount++;
          console.log(`💰 [ResourcePhaseController] ${settlement.name} (${settlement.tier}): +${income} gold`);
        } else {
          unfedCount++;
          console.log(`🍞 [ResourcePhaseController] ${settlement.name} (${settlement.tier}): unfed, no gold income`);
        }
      }
      
      if (totalGold > 0) {
        await modifyResource('gold', totalGold);
        console.log(`✅ [ResourcePhaseController] +${totalGold} gold from ${fedCount} fed settlements`);
      }
      
      if (unfedCount > 0) {
        console.log(`🟡 [ResourcePhaseController] ${unfedCount} settlements unfed (no gold income)`);
      }
      
      return { totalGold, fedCount, unfedCount };
    },

    /**
     * Get gold value for a settlement tier
     */
    getSettlementGoldValue(tier: string): number {
      switch (tier.toLowerCase()) {
        case 'village': return 1;
        case 'town': return 2;
        case 'city': return 3;
        case 'metropolis': return 4;
        default: return 0;
      }
    },

    /**
     * Calculate production for a single hex (matches TerritoryTab logic)
     */
    calculateHexProduction(hex: any): Map<string, number> {
      const production = new Map<string, number>();
      
      if (!hex.worksite) return production;
      
      const terrain = hex.terrain.toLowerCase();
      const worksiteType = hex.worksite.type;
      
      // Base production based on worksite type and terrain compatibility
      switch (worksiteType) {
        case 'Farmstead':
          if (terrain === 'plains' || terrain === 'forest') production.set('food', 2);
          else if (terrain === 'hills' || terrain === 'swamp' || terrain === 'desert') production.set('food', 1);
          break;
        case 'Logging Camp':
          if (terrain === 'forest') production.set('lumber', 2);
          break;
        case 'Quarry':
          if (terrain === 'hills' || terrain === 'mountains') production.set('stone', 1);
          break;
        case 'Mine':
        case 'Bog Mine':
          if (terrain === 'mountains' || terrain === 'swamp') production.set('ore', 1);
          break;
        case 'Hunting/Fishing Camp':
          if (terrain === 'swamp') production.set('food', 1);
          break;
        case 'Oasis Farm':
          if (terrain === 'desert') production.set('food', 1);
          break;
      }
      
      // Apply special trait bonus (+1 to all production)
      if (hex.hasSpecialTrait) {
        production.forEach((amount, resource) => {
          production.set(resource, amount + 1);
        });
      }
      
      return production;
    },

    /**
     * Get preview of what would be collected (for UI display)
     */
    getCollectionPreview() {
      const kingdom = get(kingdomData);
      const hexes = kingdom.hexes || [];
      const settlements = kingdom.settlements || [];
      
      // Calculate territory production with worksite details
      const territoryProduction = new Map<string, number>();
      const worksiteDetails: Array<{hexName: string, terrain: string, production: Map<string, number>}> = [];
      
      for (const hex of hexes) {
        if (!hex.worksite) continue;
        const production = this.calculateHexProduction(hex);
        
        if (production.size > 0) {
          // Add to total production
          production.forEach((amount, resource) => {
            const current = territoryProduction.get(resource) || 0;
            territoryProduction.set(resource, current + amount);
          });
          
          // Add to worksite details
          worksiteDetails.push({
            hexName: hex.name || hex.id || 'Unnamed Hex',
            terrain: hex.terrain || 'Unknown',
            production
          });
        }
      }
      
      // Calculate settlement gold
      let goldIncome = 0;
      let fedCount = 0;
      let unfedCount = 0;
      
      for (const settlement of settlements) {
        if (settlement.wasFedLastTurn !== false) {
          goldIncome += this.getSettlementGoldValue(settlement.tier);
          fedCount++;
        } else {
          unfedCount++;
        }
      }
      
      return {
        territoryProduction,
        worksiteDetails,
        goldIncome,
        fedCount,
        unfedCount,
        totalSettlements: settlements.length
      };
    },

    /**
     * Notify turn manager that phase is complete
     */
    async notifyPhaseComplete() {
      const { getTurnManager } = await import('../stores/KingdomStore');
      const manager = getTurnManager();
      if (manager) {
        await manager.markPhaseComplete();
      }
    }
  };
}
