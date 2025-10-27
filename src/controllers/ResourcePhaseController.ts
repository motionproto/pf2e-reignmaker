 /**
 * ResourcePhaseController - Collects territory and settlement resources
 * NEW: Uses simplified step array system with single "collect-resources" step.
 * Any player can complete this step once per turn.
 */

import { getKingdomActor } from '../stores/KingdomStore';
import { get } from 'svelte/store';
import { kingdomData } from '../stores/KingdomStore';
import { economicsService } from '../services/economics';
import { 
  reportPhaseStart, 
  reportPhaseComplete, 
  reportPhaseError, 
  createPhaseResult,
  checkPhaseGuard,
  initializePhaseSteps,
  completePhaseStepByIndex,
  isStepCompletedByIndex
} from './shared/PhaseControllerHelpers';
import { TurnPhase } from '../actors/KingdomActor';
import { ResourcesPhaseSteps } from './shared/PhaseStepConstants';
import { logger } from '../utils/Logger';

export async function createResourcePhaseController() {
  // Helper function to get active economic modifiers
  const getActiveModifiers = (kingdom: any) => {
    return economicsService.getActiveModifiers({
      isAtWar: kingdom.isAtWar || false,
      season: kingdom.season,
      economy: kingdom.economy || 0,
      unrest: kingdom.unrest || 0,
      leadershipSkills: kingdom.leadershipSkills || new Map()
    });
  };

  return {
    /**
     * Phase initialization - sets up the single step
     */
    async startPhase() {
      reportPhaseStart('ResourcePhaseController');
      
      try {
        // Phase guard - prevents initialization when not in Resources phase or already initialized
        const guardResult = checkPhaseGuard(TurnPhase.RESOURCES, 'ResourcePhaseController');
        if (guardResult) return guardResult;
        
        // Initialize single manual step as specified
        const steps = [
          { name: 'Resources' }
        ];
        
        await initializePhaseSteps(steps);
        
        // Resource collection requires manual user interaction via UI button

        reportPhaseComplete('ResourcePhaseController');
        return createPhaseResult(true);
      } catch (error) {
        reportPhaseError('ResourcePhaseController', error instanceof Error ? error : new Error(String(error)));
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Single-step resource collection using economics service
     * Any player can complete this once per turn
     */
    async collectResources() {
      // Check if collect resources step is already completed (using type-safe constant)
      if (await isStepCompletedByIndex(ResourcesPhaseSteps.COLLECT_RESOURCES)) {
        return createPhaseResult(false, 'Resources already collected this turn');
      }

      try {
        reportPhaseStart('ResourcePhaseController Collection');
        
        const kingdom = get(kingdomData);
        const actor = getKingdomActor();
        
        if (!actor) {
          return createPhaseResult(false, 'No kingdom actor available');
        }

        // Get active economic modifiers
        const modifiers = getActiveModifiers(kingdom);

        // Use economics service to collect all resources
        const result = economicsService.collectTurnResources({
          hexes: (kingdom.hexes || []) as any[], // Cast to avoid type mismatch - economics service handles the actual hex format
          settlements: kingdom.settlements || [],
          worksiteProduction: new Map(Object.entries(kingdom.worksiteProduction || {})),
          worksiteProductionByHex: [],
          modifiers
        });
        
        // Apply collected resources to kingdom using the new separated structure
        await actor.updateKingdomData((kingdom) => {
          // Apply territory resources (food, lumber, stone, ore)
          result.resourceCollection.territoryResources.forEach((amount, resource) => {
            if (amount > 0) {
              const current = kingdom.resources[resource] || 0;
              kingdom.resources[resource] = current + amount;

            }
          });
          
          // Apply settlement gold
          if (result.resourceCollection.settlementGold > 0) {
            const current = kingdom.resources['gold'] || 0;
            kingdom.resources['gold'] = current + result.resourceCollection.settlementGold;

          }
        });
        
        // Log detailed results with clear separation

        if (result.resourceCollection.territoryResources.size > 0) {
          result.resourceCollection.territoryResources.forEach((amount, resource) => {

          });
        } else {

        }

        if (result.unfedSettlementsCount > 0) {

        }
        
        // Log worksite details
        result.details.productionByHex.forEach(hex => {
          if (hex.production.size > 0) {
            const productionList = Array.from(hex.production.entries())
              .map(([resource, amount]) => `${amount} ${resource}`)
              .join(', ');

          }
        });
        
        // Mark collect resources step as completed (using type-safe constant)
        await completePhaseStepByIndex(ResourcesPhaseSteps.COLLECT_RESOURCES);
        
        reportPhaseComplete('ResourcePhaseController Collection');
        return createPhaseResult(true);
      } catch (error) {
        reportPhaseError('ResourcePhaseController Collection', error instanceof Error ? error : new Error(String(error)));
        return createPhaseResult(false, error instanceof Error ? error.message : 'Unknown error');
      }
    },

    /**
     * Get preview of what would be collected using economics service (for UI display)
     * This should match exactly what collectResources() will actually collect
     */
    async getPreviewData() {
      const kingdom = get(kingdomData);
      const hexes = kingdom.hexes || [];
      const settlements = kingdom.settlements || [];
      
      try {
        // Get active economic modifiers (including commodities, leadership bonuses, etc.)
        const modifiers = getActiveModifiers(kingdom);
        
        // Use economics service with the same worksite production that actual collection uses
        const result = economicsService.collectTurnResources({
          hexes: hexes as any[], // Cast to avoid type mismatch - economics service handles the actual hex format
          settlements,
          worksiteProduction: new Map(Object.entries(kingdom.worksiteProduction || {})),
          worksiteProductionByHex: [], // This will be calculated by the economics service from hexes
          modifiers
        });
        
        // Convert to format expected by UI - structured for presentation
        return {
          // Territory production breakdown
          territoryProduction: result.resourceCollection.territoryResources,
          worksiteDetails: result.details.productionByHex.map(hex => ({
            hexName: hex.hexName,
            terrain: hex.terrain,
            production: hex.production
          })),
          
          // Settlement gold income
          goldIncome: result.resourceCollection.settlementGold,
          fedCount: result.fedSettlementsCount,
          unfedCount: result.unfedSettlementsCount,
          totalSettlements: settlements.length,
          
          // Combined total for verification
          totalCollected: result.totalCollected,
          
          // Collection status
          isCollected: await isStepCompletedByIndex(ResourcesPhaseSteps.COLLECT_RESOURCES)
        };
      } catch (error) {
        logger.error('❌ [ResourcePhaseController] Error in preview calculation:', error);
        
        // Fallback to empty result
        return {
          territoryProduction: new Map(),
          worksiteDetails: [],
          goldIncome: 0,
          fedCount: 0,
          unfedCount: 0,
          totalSettlements: settlements.length,
          totalCollected: new Map(),
          isCollected: await isStepCompletedByIndex(ResourcesPhaseSteps.COLLECT_RESOURCES)
        };
      }
    }
  };
}
