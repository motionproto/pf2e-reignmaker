/**
 * Build Roads Action Implementation
 * Calculates road segments based on skill proficiency rank
 */

import type { CustomActionImplementation } from '../../controllers/actions/implementations';
import type { ResolutionData } from '../../types/modifiers';
import { 
  logActionStart, 
  logActionSuccess, 
  logActionError,
  createSuccessResult,
  createErrorResult,
  type ResolveResult 
} from '../shared/ActionHelpers';
import { getKingdomActor } from '../../stores/KingdomStore';

/**
 * Convert proficiency rank to number of road segments
 * Critical success always gives at least 2 segments
 * 0 = untrained (2 segments - minimum)
 * 1 = trained (2 segments - minimum)
 * 2 = expert (2 segments)
 * 3 = master (3 segments)
 * 4 = legendary (4 segments)
 */
function getRoadSegmentsFromProficiency(proficiencyRank: number): number {
  return Math.max(2, proficiencyRank);
}

const BuildRoadsAction: CustomActionImplementation = {
  id: 'build-roads',
  
  /**
   * Custom resolution to calculate road segments based on proficiency
   */
  customResolution: {
    component: null, // No custom UI needed
    
    validateData(resolutionData: ResolutionData): boolean {
      return true;
    },
    
    async execute(resolutionData: ResolutionData, instance?: any): Promise<ResolveResult> {
      logActionStart('build-roads', 'Starting road building process');
      
      try {
        const outcome = instance?.metadata?.outcome || 'success';
        const game = (globalThis as any).game;
        
        // Get the proficiency rank from the roll metadata
        let proficiencyRank = 0;
        const pendingCheck = await game.user?.getFlag('pf2e-reignmaker', 'pendingCheck') as any;
        if (pendingCheck?.proficiencyRank !== undefined) {
          proficiencyRank = pendingCheck.proficiencyRank;
        }
        
        // Calculate road segments based on outcome
        let roadSegments = 0;
        
        switch (outcome) {
          case 'criticalSuccess':
            roadSegments = getRoadSegmentsFromProficiency(proficiencyRank);
            break;
          case 'success':
            roadSegments = 1;
            break;
          case 'failure':
          case 'criticalFailure':
            // No roads on failure
            const failureMessage = outcome === 'criticalFailure' 
              ? 'Critical failure - work crews lost'
              : 'Failure - no effect';
            logActionSuccess('build-roads', failureMessage);
            return createSuccessResult(failureMessage);
        }
        
        // === HEX SELECTION WORKFLOW ===
        
        // Import validation function (gets fresh data on each call)
        const { validateRoadHex } = await import('./roadValidator');
        
        // Invoke hex selector with validation
        // HexSelectorService automatically shows appropriate overlays (territories, roads)
        const { hexSelectorService } = await import('../../services/hex-selector');
        const proficiencyName = ['Untrained', 'Trained', 'Expert', 'Master', 'Legendary'][proficiencyRank] || 'Unknown';
        
        const selectedHexes = await hexSelectorService.selectHexes({
          title: `Build ${roadSegments} Road Segment${roadSegments !== 1 ? 's' : ''}`,
          count: roadSegments,
          colorType: 'road',
          validationFn: validateRoadHex  // Real-time validation with road preview!
        });
        
        // Handle cancellation (not an error - user chose to cancel)
        if (!selectedHexes || selectedHexes.length === 0) {
          logActionSuccess('build-roads', 'Road selection cancelled by user');
          return createSuccessResult('Road selection cancelled');
        }
        
        // Update Kingdom Store
        const { updateKingdom } = await import('../../stores/KingdomStore');
        await updateKingdom(kingdom => {
          if (!kingdom.roadsBuilt) kingdom.roadsBuilt = [];
          kingdom.roadsBuilt.push(...selectedHexes);
          console.log(`🛣️ [BuildRoads] Added roads: ${selectedHexes.join(', ')}`);
        });
        
        // Clear interactive layers - roads now permanent in 'routes' layer (via reactive overlay)
        const { ReignMakerMapLayer } = await import('../../services/map/ReignMakerMapLayer');
        const mapLayer = ReignMakerMapLayer.getInstance();
        mapLayer.clearSelection();
        console.log('🧹 [BuildRoads] Cleared interactive layers');
        console.log('[BuildRoads] 🔄 Reactive road overlay will auto-update from Kingdom Store change');
        
        // Success message
        const message = outcome === 'criticalSuccess'
          ? `Built ${roadSegments} road segment${roadSegments !== 1 ? 's' : ''} (${proficiencyName} proficiency): ${selectedHexes.join(', ')}`
          : `Built road segment: ${selectedHexes.join(', ')}`;
        
        logActionSuccess('build-roads', message);
        return createSuccessResult(message);
        
      } catch (error) {
        logActionError('build-roads', error as Error);
        return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  },
  
  // Always use custom resolution to calculate segments
  needsCustomResolution(outcome): boolean {
    return outcome === 'criticalSuccess' || outcome === 'success';
  }
};

export default BuildRoadsAction;
