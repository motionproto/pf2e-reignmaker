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
import { createSettlement } from '../../models/Settlement';
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
    syncFromKingmaker(): KingmakerSyncResult {
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
            const settlements: Settlement[] = [];
            
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
                
                // Create hex
                const hex = new Hex(
                    dotNotationId,
                    terrain,
                    worksite,
                    hasSpecialTrait,
                    null // Name can be added later if available
                );
                hexes.push(hex);
                
                // Extract settlements from features
                if (hexState.features) {
                    settlements.push(...this.extractSettlements(hexState.features, dotNotationId));
                }
            }
            
            logger.debug(`Synced ${hexes.length} hexes and ${settlements.length} settlements`);
            
            // Update kingdom store with territory data
            this.updateKingdomStore(hexes, settlements);
            
            return {
                success: true,
                hexesSynced: hexes.length,
                settlementsSynced: settlements.length
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
    private updateKingdomStore(hexes: Hex[], kingmakerSettlements: Settlement[]): void {
        // Check if kingdom actor store is available before updating
        try {
            const actor = get(kingdomData);
            if (!actor || Object.keys(actor).length === 0) {
                logger.warn('[Territory Service] No kingdom data available, skipping store update');
                return;
            }
        } catch (error) {
            logger.warn('[Territory Service] Error checking kingdom data:', error);
            return;
        }
        
        updateKingdom(state => {
            // Convert Hex instances to plain objects for storage
            state.hexes = hexes.map(hex => ({
                id: hex.id,
                terrain: hex.terrain,
                worksite: hex.worksite ? { type: hex.worksite.type as string } : undefined,
                hasSpecialTrait: hex.hasSpecialTrait || false,
                name: hex.name || undefined
            }));
            state.size = hexes.length;
            
            // Merge settlements - preserve existing data
            const mergedSettlements = this.mergeSettlements(state.settlements || [], kingmakerSettlements);
            state.settlements = mergedSettlements;
            
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
                settlements: state.settlements.length,
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
                settlementCount: kingmakerSettlements.length,
                source: 'kingmaker-sync'
            });
        }
    }
    
    /**
     * Merge existing settlements with Kingmaker settlement locations
     * Preserves user-edited data while ensuring settlements exist at Kingmaker locations
     */
    private mergeSettlements(existing: Settlement[], fromKingmaker: Settlement[]): Settlement[] {
        const result: Settlement[] = [...existing];
        
        for (const kmSettlement of fromKingmaker) {
            // Check if we already have a settlement at this location
            const existingAtLocation = existing.find(s => 
                s.location.x === kmSettlement.location.x && 
                s.location.y === kmSettlement.location.y
            );
            
            if (!existingAtLocation) {
                // Only add if we don't have a settlement at this location
                logger.debug(`Adding new settlement at ${kmSettlement.location.x},${kmSettlement.location.y} from Kingmaker`);
                result.push(kmSettlement);
            } else {
                // Keep our existing settlement data
                logger.debug(`Preserving existing settlement "${existingAtLocation.name}" at ${existingAtLocation.location.x},${existingAtLocation.location.y}`);
            }
        }
        
        // Remove settlements that no longer exist in Kingmaker
        // (only if they're at locations Kingmaker knows about)
        const kmLocations = fromKingmaker.map(s => `${s.location.x},${s.location.y}`);
        return result.filter(settlement => {
            const locationKey = `${settlement.location.x},${settlement.location.y}`;
            // Keep if: Kingmaker has it OR it's a user-created settlement at a non-Kingmaker location
            const shouldKeep = kmLocations.includes(locationKey) || 
                              !fromKingmaker.some(km => km.location.x === settlement.location.x && km.location.y === settlement.location.y);
            
            if (!shouldKeep) {
                logger.debug(`Removing settlement "${settlement.name}" at ${locationKey} - no longer in Kingmaker`);
            }
            
            return shouldKeep;
        });
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
     */
    private extractSettlements(features: HexFeature[], hexId: string): Settlement[] {
        const settlements: Settlement[] = [];
        
        for (const feature of features) {
            const tier = this.getSettlementTier(feature.type);
            if (tier) {
                // Parse hex coordinates from ID
                const [xStr, yStr] = hexId.split('.');
                const x = parseInt(xStr) || 0;
                const y = parseInt(yStr) || 0;
                
                // Create settlement using the factory function
                const settlement = createSettlement(
                    `${feature.type}_${hexId}`,
                    { x, y },
                    tier as any
                );
                
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
                    hexData.name || null
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
            hexData.name || null
        );
    }
    
    /**
     * Check if Kingmaker module is available
     */
    isKingmakerAvailable(): boolean {
        // @ts-ignore - Foundry global
        return typeof game !== 'undefined' && game?.modules?.get('pf2e-kingmaker')?.active;
    }
}

// Export singleton instance
export const territoryService = new TerritoryService();

// Re-export types
export type { HexFeature, HexState } from '../../api/kingmaker';
