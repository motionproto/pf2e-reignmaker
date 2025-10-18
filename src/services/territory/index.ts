/**
 * Territory Service
 * 
 * Manages territory state synchronization between the Kingmaker module
 * and the Kingdom store. This service is responsible for:
 * - Syncing hex data from the Kingmaker module
 * - Converting between data formats
 * - Updating the Kingdom store with territory information
 * - Providing territory-related calculations
 */

import { get } from 'svelte/store';
import { kingdomData, updateKingdom } from '../../stores/KingdomStore';
import { Hex, Worksite, WorksiteType } from '../../models/Hex';
import type { Settlement, SettlementTier } from '../../models/Settlement';
import { createSettlement, createKingmakerSettlementId } from '../../models/Settlement';
import type { HexFeature, HexState } from '../../api/kingmaker';
import { logger } from '../../utils/Logger';

// Declare Foundry globals
declare const Hooks: any;

export interface TerritoryMetrics {
    totalHexes: number;
    hexesByTerrain: Map<string, number>;
    worksiteCount: Map<string, number>;
    settlementCount: number;
    totalProduction: Map<string, number>;
}

export interface KingmakerSyncResult {
    success: boolean;
    hexesSynced: number;
    settlementsSynced: number;
    error?: string;
}

export class TerritoryService {
    /**
     * Sync territory data from Kingmaker module to Kingdom store
     */
    async syncFromKingmaker(): Promise<KingmakerSyncResult> {
        try {
            // Check if Kingmaker is available
            // @ts-ignore - Kingmaker global
            const km = (typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker);
            if (!km?.state?.hexes) {
                return {
                    success: false,
                    hexesSynced: 0,
                    settlementsSynced: 0,
                    error: 'Kingmaker module not available'
                };
            }

            const hexStates = km.state.hexes;
            
            // Convert and filter claimed hexes
            const hexes: Hex[] = [];
            
            logger.debug('Starting Kingmaker sync, found hexes:', Object.keys(hexStates).length);
            
            for (const hexId of Object.keys(hexStates)) {
                const hexState = hexStates[hexId];
                if (!hexState?.claimed) continue;
                
                // Convert numeric ID to dot notation
                const dotNotationId = this.convertHexId(hexId);
                
                // Get terrain from the region map only - no fallbacks
                let terrain = 'Unknown';
                let zoneId = null;
                
                try {
                    // @ts-ignore - Kingmaker global
                    const regionHex = km.region?.hexes?.get(parseInt(hexId));
                    if (regionHex && regionHex.data) {
                        // Get terrain from the hex's data (this is the source of truth)
                        const hexData = regionHex.data;
                        const rawTerrain = hexData.terrain;
                        
                        if (rawTerrain) {
                            terrain = this.normalizeTerrainName(rawTerrain);
                            zoneId = hexData.zone;
                            
                            logger.debug(`Got terrain from region hex ${dotNotationId}:`, {
                                rawTerrain,
                                normalizedTerrain: terrain,
                                zone: zoneId
                            });
                        } else {
                            logger.warn(`Region hex ${dotNotationId} has no terrain data, marking as Unknown`);
                            terrain = 'Unknown';
                        }
                    } else {
                        logger.warn(`Could not find region hex for ${dotNotationId}, marking as Unknown`);
                        terrain = 'Unknown';
                    }
                } catch (error) {
                    logger.error(`Error accessing region hex for ${dotNotationId}:`, error);
                    terrain = 'Unknown';
                }
                
                // Debug log for each claimed hex
                logger.debug(`Processing hex ${dotNotationId}:`, {
                    terrain: terrain,
                    zone: zoneId,
                    camp: hexState.camp,
                    commodity: hexState.commodity,
                    features: hexState.features
                });
                
                // Convert worksite
                const worksite = this.convertWorksite(hexState);
                
                // Check for special commodity trait
                const hasSpecialTrait = this.hasMatchingCommodity(hexState, worksite);
                
                // Log commodity detection for debugging
                if (worksite) {
                    logger.debug(`Hex ${dotNotationId} worksite analysis:`, {
                        worksiteType: worksite.type,
                        commodity: hexState.commodity || 'none',
                        hasMatchingCommodity: hasSpecialTrait,
                        expectedProduction: worksite.getBaseProduction(terrain),
                        bonusApplied: hasSpecialTrait ? '+1' : 'none'
                    });
                }
                
                // Create hex with features
                const hex = new Hex(
                    dotNotationId,
                    terrain,
                    worksite,
                    hasSpecialTrait,
                    null, // Name can be added later if available
                    hexState.features || [] // Preserve features from Kingmaker
                );
                hexes.push(hex);
            }
            
            logger.debug(`Synced ${hexes.length} hexes`);
            
            // Update kingdom store with territory data
            await this.updateKingdomStore(hexes);
            
            logger.info(`[Territory Service] Kingdom store update completed successfully`);
            
            return {
                success: true,
                hexesSynced: hexes.length,
                settlementsSynced: 0
            };
            
        } catch (error) {
            logger.error('Failed to sync from Kingmaker:', error);
            return {
                success: false,
                hexesSynced: 0,
                settlementsSynced: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    
    /**
     * Update the Kingdom store with territory data
     */
    private async updateKingdomStore(hexes: Hex[]): Promise<void> {
        // Log territory update attempt
        logger.info(`[Territory Service] Updating kingdom store with ${hexes.length} hexes`);
        
        await updateKingdom(state => {
            // Convert Hex instances to plain objects for storage
            state.hexes = hexes.map(hex => ({
                id: hex.id,
                terrain: hex.terrain,
                worksite: hex.worksite ? { type: hex.worksite.type as string } : undefined,
                hasSpecialTrait: hex.hasSpecialTrait || false,
                name: hex.name || undefined,
                features: hex.features || [] // Preserve features
            }));
            state.size = hexes.length;
            
            // NOTE: Settlements are NOT modified during sync - they are managed manually by the player
            
            // Update worksite counts for UI display
            const worksiteCount: Record<string, number> = {};
            const counts = this.countWorksites(hexes);
            counts.forEach((count, type) => {
                worksiteCount[type] = count;
            });
            state.worksiteCount = worksiteCount;
            
            // Calculate and cache total production from all hexes
            const cachedProduction: Record<string, number> = {};
            const cachedProductionByHex: Array<[any, Map<string, number>]> = [];
            
            for (const hex of hexes) {
                const production = hex.getProduction();
                
                // Add to total cached production
                production.forEach((amount, resource) => {
                    cachedProduction[resource] = (cachedProduction[resource] || 0) + amount;
                });
                
                // Store per-hex production for detailed breakdown
                if (production.size > 0) {
                    cachedProductionByHex.push([{
                        id: hex.id,
                        name: hex.name || `Hex ${hex.id}`,
                        terrain: hex.terrain
                    }, production]);
                }
            }
            
            state.cachedProduction = cachedProduction;
            state.cachedProductionByHex = cachedProductionByHex;
            
            logger.debug('[Territory Service] Updated kingdom store with:', {
                hexes: state.hexes.length,
                worksiteCount: state.worksiteCount,
                cachedProduction: state.cachedProduction,
                productionByHexCount: state.cachedProductionByHex.length
            });
            
            return state;
        });
        
        // Emit territory update hook for persistence service
        if (typeof Hooks !== 'undefined') {
            Hooks.call('pf2e-reignmaker.territoryUpdated', {
                hexCount: hexes.length,
                settlementCount: 0,
                source: 'kingmaker-sync'
            });
        }
    }
    
    /**
     * Convert numeric hex ID to dot notation (e.g., 9209 -> "92.09", 1011 -> "1.11")
     */
    private convertHexId(numericId: string): string {
        // If already in dot notation, return as is
        if (numericId.includes('.')) {
            return numericId;
        }
        
        const num = parseInt(numericId);
        if (isNaN(num)) {
            logger.warn(`Invalid hex ID: ${numericId}, returning as is`);
            return numericId;
        }
        
        // Handle 4-digit format (e.g., 9209 -> 92.09, 1011 -> 1.11)
        if (num >= 1000) {
            const row = Math.floor(num / 100);
            const col = num % 100;
            return `${row}.${col.toString().padStart(2, '0')}`;
        } else {
            // Handle 3-digit or less (e.g., 105 -> 1.05)
            const row = Math.floor(num / 100);
            const col = num % 100;
            return `${row}.${col.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Normalize terrain names to our system
     */
    private normalizeTerrainName(terrain: string | null): string {
        if (!terrain) {
            return 'Unknown';
        }
        
        // Handle object terrain (if Kingmaker provides terrain as an object)
        let terrainString = terrain;
        if (typeof terrain === 'object') {
            // Try to extract terrain name from object
            const terrainObj = terrain as any;
            terrainString = terrainObj.type || terrainObj.name || terrainObj.value || JSON.stringify(terrain);
            logger.debug('Terrain is object, extracted:', terrainString, 'from', terrain);
        }
        
        const normalized = terrainString.toString().toLowerCase().trim();
        
        // Handle various terrain name formats from Kingmaker
        switch (normalized) {
            // Plains variants
            case 'plains':
            case 'plain':
            case 'grassland':
            case 'grasslands':
            case 'meadow':
            case 'meadows':
            case 'field':
            case 'fields':
                return 'Plains';
                
            // Forest variants  
            case 'forest':
            case 'forests':
            case 'wood':
            case 'woods':
            case 'woodland':
            case 'woodlands':
            case 'jungle':
            case 'grove':
                return 'Forest';
                
            // Hills variants
            case 'hill':
            case 'hills':
            case 'highland':
            case 'highlands':
            case 'foothill':
            case 'foothills':
                return 'Hills';
                
            // Mountains variants
            case 'mountain':
            case 'mountains':
            case 'mount':
            case 'peak':
            case 'peaks':
            case 'cliff':
            case 'cliffs':
                return 'Mountains';
                
            // Swamp/Wetlands variants
            case 'swamp':
            case 'swamps':
            case 'wetland':
            case 'wetlands':
            case 'marsh':
            case 'marshes':
            case 'bog':
            case 'bogs':
            case 'fen':
            case 'fens':
                return 'Swamp';
                
            // Desert variants
            case 'desert':
            case 'deserts':
            case 'badlands':
            case 'wasteland':
            case 'wastes':
            case 'dunes':
                return 'Desert';
                
            // Water/Lake (treated as plains for production)
            case 'lake':
            case 'lakes':
            case 'water':
            case 'river':
            case 'rivers':
            case 'ocean':
            case 'sea':
                return 'Plains'; // Lakes/water treated as plains
                
            default: 
                logger.warn(`Unknown terrain type: "${terrainString}" (original: ${JSON.stringify(terrain)}), marking as Unknown`);
                return 'Unknown';
        }
    }
    
    /**
     * Convert Kingmaker worksite/camp to our Worksite model
     * 
     * Kingmaker has two ways to represent worksites:
     * 1. Features (for farmland) - stored in hexState.features array
     * 2. Camps (for lumber/mine/quarry) - stored in hexState.camp string
     */
    private convertWorksite(hexState: HexState): Worksite | null {
        // Check for farmland FEATURE first (farmland is NOT a camp in Kingmaker)
        if (hexState.features?.some(f => f.type === 'farmland')) {
            return new Worksite(WorksiteType.FARMSTEAD);
        }
        
        // Check for camps (lumber, mine, quarry are the only valid camp types)
        if (hexState.camp) {
            switch (hexState.camp.toLowerCase()) {
                case 'lumber': 
                    return new Worksite(WorksiteType.LOGGING_CAMP);
                case 'mine': 
                    return new Worksite(WorksiteType.MINE);
                case 'quarry': 
                    return new Worksite(WorksiteType.QUARRY);
                default: 
                    logger.warn(`Unknown camp type from Kingmaker: ${hexState.camp}`);
                    return null;
            }
        }
        
        return null;
    }
    
    /**
     * Check if hex has commodity matching its worksite production
     */
    private hasMatchingCommodity(hexState: HexState, worksite: Worksite | null): boolean {
        if (!worksite || !hexState.commodity || hexState.commodity.trim() === '') return false;
        
        // Check worksite-commodity matches
        switch (worksite.type) {
            case WorksiteType.FARMSTEAD: 
                return hexState.commodity.toLowerCase() === 'food';
            case WorksiteType.LOGGING_CAMP: 
                return hexState.commodity.toLowerCase() === 'lumber';
            case WorksiteType.QUARRY: 
                return hexState.commodity.toLowerCase() === 'stone';
            case WorksiteType.MINE: 
                return hexState.commodity.toLowerCase() === 'ore';
            default: 
                return false;
        }
    }
    
    /**
     * Extract settlements from hex features
     * Uses location-based IDs to prevent duplicates
     * Creates settlements with kingmakerLocation and rmLocation (0,0 if unlinked)
     */
    private extractSettlements(features: HexFeature[], hexId: string): Settlement[] {
        const settlements: Settlement[] = [];
        
        // Get existing settlements to check for duplicates
        const existingSettlements = get(kingdomData).settlements || [];
        
        for (const feature of features) {
            const tier = this.getSettlementTier(feature.type);
            if (tier) {
                // Parse hex coordinates from ID
                const [xStr, yStr] = hexId.split('.');
                const kingmakerX = parseInt(xStr) || 0;
                const kingmakerY = parseInt(yStr) || 0;
                const kingmakerLocation = { x: kingmakerX, y: kingmakerY };
                
                // Create consistent ID based on Kingmaker location
                const settlementId = createKingmakerSettlementId(kingmakerLocation);
                
                // Check if we already have this settlement
                const existing = existingSettlements.find(s => s.id === settlementId);
                if (existing) {
                    logger.debug(`Settlement ${settlementId} already exists, skipping duplicate creation`);
                    continue;
                }
                
                // Get feature name
                const featureName = (feature as any).name;
                const hasName = featureName && featureName.trim() && featureName.trim().toLowerCase() !== 'vacant';
                
                // rmLocation: (0,0) if no name (unlinked), otherwise same as Kingmaker location (linked)
                const rmLocation = hasName ? kingmakerLocation : { x: 0, y: 0 };
                
                // Create settlement with kingmakerLocation
                const settlement = createSettlement(
                    hasName ? featureName.trim() : 'Unnamed Settlement',
                    rmLocation,
                    tier as any,
                    kingmakerLocation // Pass Kingmaker location to factory
                );
                
                // Factory creates the ID, but we need to ensure it's correct
                settlement.id = settlementId;
                settlement.kingmakerLocation = kingmakerLocation;
                
                logger.debug(`Created settlement ${settlementId}:`, {
                    name: settlement.name,
                    kingmakerLocation,
                    rmLocation,
                    linked: hasName
                });
                
                settlements.push(settlement);
            }
        }
        
        return settlements;
    }
    
    /**
     * Get settlement tier from feature type
     */
    private getSettlementTier(type: string | null): SettlementTier | null {
        if (!type) return null;
        
        switch (type.toLowerCase()) {
            case 'village': return 'Village' as SettlementTier;
            case 'town': return 'Town' as SettlementTier;
            case 'city': return 'City' as SettlementTier;
            case 'metropolis': return 'Metropolis' as SettlementTier;
            default: return null;
        }
    }
    
    /**
     * Count worksites by type from hexes
     */
    private countWorksites(hexes: Hex[]): Map<string, number> {
        const counts = new Map<string, number>([
            ['farmlands', 0],
            ['lumberCamps', 0],
            ['quarries', 0],
            ['mines', 0]
        ]);
        
        for (const hex of hexes) {
            if (!hex.worksite) continue;
            
            switch (hex.worksite.type) {
                case WorksiteType.FARMSTEAD:
                    counts.set('farmlands', (counts.get('farmlands') || 0) + 1);
                    break;
                case WorksiteType.LOGGING_CAMP:
                    counts.set('lumberCamps', (counts.get('lumberCamps') || 0) + 1);
                    break;
                case WorksiteType.MINE:
                    counts.set('mines', (counts.get('mines') || 0) + 1);
                    break;
                case WorksiteType.QUARRY:
                    counts.set('quarries', (counts.get('quarries') || 0) + 1);
                    break;
            }
        }
        
        return counts;
    }
    
    /**
     * Get territory metrics for display
     */
    getTerritoryMetrics(hexes?: Hex[]): TerritoryMetrics {
        // Use provided hexes or reconstruct from kingdom store
        let territory: Hex[];
        if (hexes) {
            territory = hexes;
        } else {
            const kingdomState = get(kingdomData);
            territory = (kingdomState.hexes || []).map(hexData => 
                new Hex(
                    hexData.id,
                    hexData.terrain,
                    hexData.worksite ? new Worksite(hexData.worksite.type as WorksiteType) : null,
                    hexData.hasSpecialTrait || false,
                    hexData.name || null,
                    hexData.features || []
                )
            );
        }
        
        // Count hexes by terrain
        const hexesByTerrain = new Map<string, number>();
        for (const hex of territory) {
            const count = hexesByTerrain.get(hex.terrain) || 0;
            hexesByTerrain.set(hex.terrain, count + 1);
        }
        
        // Count worksites
        const worksiteCount = this.countWorksites(territory);
        
        // Count settlements
        const settlementCount = get(kingdomData).settlements?.length || 0;
        
        // Calculate total production
        const totalProduction = new Map<string, number>();
        for (const hex of territory) {
            const production = hex.getProduction();
            production.forEach((amount: number, resource: string) => {
                totalProduction.set(resource, (totalProduction.get(resource) || 0) + amount);
            });
        }
        
        return {
            totalHexes: territory.length,
            hexesByTerrain,
            worksiteCount,
            settlementCount,
            totalProduction
        };
    }
    
    /**
     * Get information about a specific hex
     */
    getTerritoryInfo(hexId: string): Hex | null {
        const state = get(kingdomData);
        const hexData = state.hexes?.find((h: any) => h.id === hexId);
        if (!hexData) return null;
        
        return new Hex(
            hexData.id,
            hexData.terrain,
            hexData.worksite ? new Worksite(hexData.worksite.type as WorksiteType) : null,
            hexData.hasSpecialTrait || false,
            hexData.name || null,
            hexData.features || []
        );
    }
    
  /**
   * Check if Kingmaker module is available
   */
  isKingmakerAvailable(): boolean {
    // @ts-ignore - Foundry global
    return typeof game !== 'undefined' && game?.modules?.get('pf2e-kingmaker')?.active;
  }
  
  /* -------------------------------------------- */
  /*  Kingmaker Map Updates (Write Operations)   */
  /* -------------------------------------------- */
  
  /**
   * Update a settlement feature on the Kingmaker map
   * Called when settlements are created, upgraded, or renamed
   */
  async updateKingmakerSettlement(settlement: Settlement): Promise<void> {
    if (!this.isKingmakerAvailable()) {
      logger.debug('[Territory Service] Kingmaker module not available, skipping map update');
      return;
    }
    
    // Skip if settlement has no location
    if (!settlement.location || (settlement.location.x === 0 && settlement.location.y === 0)) {
      logger.debug(`[Territory Service] Settlement ${settlement.name} has no location, skipping map update`);
      return;
    }
    
    try {
      // @ts-ignore - Kingmaker global
      const km = (typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker);
      if (!km?.state) {
        logger.warn('[Territory Service] Kingmaker state not available');
        return;
      }
      
      // Calculate hex key from settlement location (same format Kingmaker uses)
      const hexKey = (100 * settlement.location.x) + settlement.location.y;
      
      logger.debug(`🗺️ [Territory Service] Updating settlement on map:`, {
        settlement: settlement.name,
        tier: settlement.tier,
        location: `${settlement.location.x}:${settlement.location.y}`,
        hexKey: hexKey
      });
      
      // Convert our tier to Kingmaker feature type
      const kingmakerType = this.tierToKingmakerFeatureType(settlement.tier);
      
      // Get existing hex state to preserve other properties
      const existingHexState = km.state.hexes[hexKey] || {};
      const existingFeatures = existingHexState.features || [];
      
      logger.debug(`🗺️ [Territory Service] Existing hex state:`, {
        hexKey,
        existingFeatures: existingFeatures.map((f: any) => ({ type: f.type, name: f.name })),
        claimed: existingHexState.claimed,
        explored: existingHexState.explored
      });
      
      // Remove any existing settlement features from this hex
      const nonSettlementFeatures = existingFeatures.filter((f: any) => 
        !['village', 'town', 'city', 'metropolis'].includes(f.type?.toLowerCase())
      );
      
      // Create settlement feature
      const settlementFeature = {
        type: kingmakerType,
        name: settlement.name,
        discovered: true
      };
      
      // Add our settlement feature
      const updatedFeatures = [
        ...nonSettlementFeatures,
        settlementFeature
      ];
      
      logger.debug(`🗺️ [Territory Service] Updated features:`, {
        removed: existingFeatures.length - nonSettlementFeatures.length,
        added: settlementFeature,
        totalFeatures: updatedFeatures.length
      });
      
      // Update Kingmaker state - DEFAULT recursive behavior is what we want
      // This merges our hex into the existing hexes object
      km.state.updateSource({
        hexes: {
          [hexKey]: {
            ...existingHexState,
            features: updatedFeatures
          }
        }
      });
      
      await km.state.save();
      
      logger.info(`✅ [Territory Service] Updated Kingmaker map for "${settlement.name}" at ${settlement.location.x}:${settlement.location.y} (${kingmakerType})`);
      
    } catch (error) {
      logger.error('[Territory Service] Failed to update Kingmaker settlement:', error);
    }
  }
  
  /**
   * Clear the custom name from a settlement feature on the Kingmaker map
   * Called when settlements are unlinked (keeps the settlement feature, just removes the name)
   */
  async clearKingmakerSettlementName(location: { x: number, y: number }): Promise<void> {
    if (!this.isKingmakerAvailable()) {
      logger.debug('[Territory Service] Kingmaker module not available, skipping map update');
      return;
    }
    
    // Skip if no valid location
    if (!location || (location.x === 0 && location.y === 0)) {
      logger.debug('[Territory Service] Invalid location, skipping map update');
      return;
    }
    
    try {
      // @ts-ignore - Kingmaker global
      const km = (typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker);
      if (!km?.state) {
        logger.warn('[Territory Service] Kingmaker state not available');
        return;
      }
      
      // Calculate hex key
      const hexKey = (100 * location.x) + location.y;
      
      logger.debug(`🗺️ [Territory Service] Clearing settlement name from map:`, {
        location: `${location.x}:${location.y}`,
        hexKey: hexKey
      });
      
      // Get existing hex state
      const existingHexState = km.state.hexes[hexKey];
      if (!existingHexState || !existingHexState.features) {
        logger.debug(`[Territory Service] No features at ${location.x}:${location.y}, nothing to clear`);
        return;
      }
      
      const existingFeatures = existingHexState.features;
      
      // Find settlement feature and set name to "vacant"
      const updatedFeatures = existingFeatures.map((f: any) => {
        if (['village', 'town', 'city', 'metropolis'].includes(f.type?.toLowerCase())) {
          // Keep the feature but set name to "vacant"
          return {
            ...f,
            name: 'vacant'
          };
        }
        return f;
      });
      
      logger.debug(`🗺️ [Territory Service] Settlement name cleared:`, {
        existingCount: existingFeatures.length,
        updatedCount: updatedFeatures.length
      });
      
      // Update Kingmaker state
      km.state.updateSource({
        hexes: {
          [hexKey]: {
            ...existingHexState,
            features: updatedFeatures
          }
        }
      });
      
      await km.state.save();
      
      logger.info(`✅ [Territory Service] Cleared settlement name from Kingmaker map at ${location.x}:${location.y}`);
      
    } catch (error) {
      logger.error('[Territory Service] Failed to clear Kingmaker settlement name:', error);
    }
  }
  
  /**
   * Remove a settlement feature from the Kingmaker map
   * Called when settlements are deleted or unlinked
   */
  async deleteKingmakerSettlement(location: { x: number, y: number }): Promise<void> {
    if (!this.isKingmakerAvailable()) {
      logger.debug('[Territory Service] Kingmaker module not available, skipping map update');
      return;
    }
    
    // Skip if no valid location
    if (!location || (location.x === 0 && location.y === 0)) {
      logger.debug('[Territory Service] Invalid location, skipping map update');
      return;
    }
    
    try {
      // @ts-ignore - Kingmaker global
      const km = (typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker);
      if (!km?.state) {
        logger.warn('[Territory Service] Kingmaker state not available');
        return;
      }
      
      // Calculate hex key
      const hexKey = (100 * location.x) + location.y;
      
      logger.debug(`🗺️ [Territory Service] Removing settlement from map:`, {
        location: `${location.x}:${location.y}`,
        hexKey: hexKey
      });
      
      // Get existing hex state
      const existingHexState = km.state.hexes[hexKey];
      if (!existingHexState || !existingHexState.features) {
        logger.debug(`[Territory Service] No features at ${location.x}:${location.y}, nothing to delete`);
        return;
      }
      
      const existingFeatures = existingHexState.features;
      
      // Remove settlement features from this hex
      const nonSettlementFeatures = existingFeatures.filter((f: any) => 
        !['village', 'town', 'city', 'metropolis'].includes(f.type?.toLowerCase())
      );
      
      logger.debug(`🗺️ [Territory Service] Feature removal:`, {
        existingCount: existingFeatures.length,
        removedCount: existingFeatures.length - nonSettlementFeatures.length,
        remainingCount: nonSettlementFeatures.length
      });
      
      // Update Kingmaker state - DEFAULT recursive behavior is what we want
      km.state.updateSource({
        hexes: {
          [hexKey]: {
            ...existingHexState,
            features: nonSettlementFeatures
          }
        }
      });
      
      await km.state.save();
      
      logger.info(`✅ [Territory Service] Removed settlement from Kingmaker map at ${location.x}:${location.y}`);
      
    } catch (error) {
      logger.error('[Territory Service] Failed to delete Kingmaker settlement:', error);
    }
  }
  
  /**
   * Convert our settlement tier to Kingmaker feature type
   */
  private tierToKingmakerFeatureType(tier: SettlementTier): string {
    switch (tier) {
      case 'Village':
        return 'village';
      case 'Town':
        return 'town';
      case 'City':
        return 'city';
      case 'Metropolis':
        return 'metropolis';
      default:
        return 'village';
    }
  }
}

// Export singleton instance
export const territoryService = new TerritoryService();

// Re-export types
export type { HexFeature, HexState } from '../../api/kingmaker';
