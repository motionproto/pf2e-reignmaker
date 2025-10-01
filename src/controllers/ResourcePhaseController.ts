/**
 * ResourcePhaseController - Collects territory and settlement resources
 * 
 * NEW: Uses simplified step array system with single "collect-resources" step.
 * Any player can complete this step once per turn.
 */

import { getKingdomActor } from '../stores/KingdomStore';
import { get } from 'svelte/store';
import { kingdomData } from '../stores/KingdomStore';
import { 
  reportPhaseStart, 
  reportPhaseComplete, 
  reportPhaseError, 
  createPhaseResult,
  initializePhaseSteps,
  completePhaseStep,
  isStepCompleted
} from './shared/PhaseControllerHelpers';

// Define steps for Resources Phase
const RESOURCES_PHASE_STEPS = [
  { id: 'collect-resources', name: 'Collect Kingdom Resources' }
];

export async function createResourcePhaseController() {
  // Helper functions defined outside the returned object
  const calculateHexProduction = (hex: any): Map<string, number> => {
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
  };

  const getSettlementGoldValue = (tier: string): number => {
    switch (tier.toLowerCase()) {
      case 'village': return 1;
      case 'town': return 2;
      case 'city': return 3;
      case 'metropolis': return 4;
      default: return 0;
    }
  };

  return {
    /**
     * Phase initialization - sets up the single step
     */
    async startPhase() {
      reportPhaseStart('ResourcePhaseController');
      
      try {
        // Initialize phase with predefined steps
        await initializePhaseSteps(RESOURCES_PHASE_STEPS);
        
        reportPhaseComplete('ResourcePhaseController');
        return createPhaseResult(true);
      } catch (error) {
        reportPhaseError('ResourcePhaseController', error instanceof Error ? error : new Error(String(error)));
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * NEW: Single-step resource collection (territory + settlements)
     * Any player can complete this once per turn
     */
    async collectResources() {
      // Check if already completed
      if (isStepCompleted('collect-resources')) {
        return createPhaseResult(false, 'Resources already collected this turn');
      }

      try {
        reportPhaseStart('ResourcePhaseController Collection');
        
        // Collect both territory resources and settlement gold
        await this.collectTerritoryResources();
        await this.collectSettlementGold();
        
        // Mark step as completed (will auto-complete phase)
        await completePhaseStep('collect-resources');
        
        reportPhaseComplete('ResourcePhaseController Collection');
        return createPhaseResult(true);
      } catch (error) {
        reportPhaseError('ResourcePhaseController Collection', error instanceof Error ? error : new Error(String(error)));
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
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
        
        const production = calculateHexProduction(hex);
        production.forEach((amount, resource) => {
          const current = resourceTotals.get(resource) || 0;
          resourceTotals.set(resource, current + amount);
        });
      }
      
      // Apply collected resources
      const actor = getKingdomActor();
      if (!actor) {
        console.error('❌ [ResourcePhaseController] No KingdomActor available');
        return resourceTotals;
      }

      if (resourceTotals.size > 0) {
        await actor.updateKingdom((kingdom) => {
          for (const [resource, amount] of resourceTotals) {
            if (amount > 0) {
              const current = kingdom.resources[resource] || 0;
              kingdom.resources[resource] = current + amount;
              console.log(`✅ [ResourcePhaseController] +${amount} ${resource} from territory`);
            }
          }
        });
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
          const income = getSettlementGoldValue(settlement.tier);
          totalGold += income;
          fedCount++;
          console.log(`💰 [ResourcePhaseController] ${settlement.name} (${settlement.tier}): +${income} gold`);
        } else {
          unfedCount++;
          console.log(`🍞 [ResourcePhaseController] ${settlement.name} (${settlement.tier}): unfed, no gold income`);
        }
      }
      
      if (totalGold > 0) {
        const actor = getKingdomActor();
        if (actor) {
          await actor.updateKingdom((kingdom) => {
            const current = kingdom.resources.gold || 0;
            kingdom.resources.gold = current + totalGold;
          });
        }
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
    getSettlementGoldValue,

    /**
     * Calculate production for a single hex (matches TerritoryTab logic)
     */
    calculateHexProduction,

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
        const production = calculateHexProduction(hex);
        
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
          goldIncome += getSettlementGoldValue(settlement.tier);
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
    }
  };
}
