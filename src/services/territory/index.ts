/**
 * Territory Service
 * 
 * CRITICAL: Kingmaker module is ONLY used for INITIAL IMPORT
 * 
 * This service manages territory data with the following rules:
 * 
 * ⚠️ DO NOT USE KINGMAKER FOR REGULAR OPERATIONS ⚠️
 * 
 * Kingmaker Usage (IMPORT ONLY):
 * - syncFromKingmaker() - ONLY called during initial setup to import hex data
 * - importFromFoundryGrid() - Alternative import for custom maps
 * 
 * Kingdom Store Usage (ALL OPERATIONS):
 * - Kingdom Store is the source of truth for ALL gameplay
 * - Update hexes directly via updateKingdom()
 * - Never write to Kingmaker during gameplay
 * - Never sync from Kingmaker after initial import
 * 
 * Data Flow:
 * 1. Initial Setup: Kingmaker → syncFromKingmaker() → Kingdom Store
 * 2. Gameplay: Kingdom Store ONLY (Kingmaker not involved)
 * 3. Reactive Overlays: Subscribe to Kingdom Store, update automatically
 * 
 * Common Mistake:
 * ❌ WRONG: Update Kingmaker → sync from Kingmaker → Kingdom Store
 * ✅ RIGHT: Update Kingdom Store directly → reactive overlays update
 */

import { get } from 'svelte/store';
import { kingdomData, updateKingdom } from '../../stores/KingdomStore';
import { Hex, Worksite, WorksiteType, type HexFeature } from '../../models/Hex';
import type { Settlement, SettlementTier } from '../../models/Settlement';
import { createSettlement, createKingmakerSettlementId } from '../../models/Settlement';
import type { HexFeature as KingmakerHexFeature, HexState } from '../../api/kingmaker';
import { logger } from '../../utils/Logger';
import { normalizeTerrainType, getTravelDifficultyFromTerrain } from '../../types/terrain';
import type { TerrainType, TravelDifficulty } from '../../types/terrain';
import { PLAYER_KINGDOM } from '../../types/ownership';

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
     * Import territory from Foundry hex grid (for custom maps without Kingmaker)
     * GM-ONLY: Only GM can import territory data
     */
    async importFromFoundryGrid(): Promise<KingmakerSyncResult> {
        // GM check - only GM can import data
        if (!(game as any)?.user?.isGM) {
            logger.error('[Territory Service] Only GM can import kingdom data');
            return { 
                success: false, 
                hexesSynced: 0, 
                settlementsSynced: 0, 
                error: 'Only GM can import kingdom data' 
            };
        }
        
        try {
            // @ts-ignore - Foundry globals
            const canvas = game.canvas;
            
            // Validate hex grid
            // @ts-ignore - Foundry CONST
            if (!canvas?.grid || 
                (canvas.grid.type !== CONST.GRID_TYPES.HEXODDR && 
                 canvas.grid.type !== CONST.GRID_TYPES.HEXEVENR)) {
                return {
                    success: false,
                    hexesSynced: 0,
                    settlementsSynced: 0,
                    error: 'Scene must use a hex grid (HEXODDR or HEXEVENR)'
                };
            }
            
            // Get grid dimensions
            const grid = canvas.grid;
            const gridWidth = Math.floor(canvas.dimensions.width / grid.size);
            const gridHeight = Math.floor(canvas.dimensions.height / grid.size);

            // Generate hexes for entire grid
            const hexes: Hex[] = [];
            for (let i = 0; i < gridHeight; i++) {
                for (let j = 0; j < gridWidth; j++) {
                    const hex = new Hex(
                        i,          // row
                        j,          // col
                        'plains',   // Default terrain (editable later)
                        'open',     // Default travel (editable later)
                        null,       // No worksite
                        new Map(),  // No commodities
                        null,       // No name
                        null,       // Wilderness (unclaimed)
                        false,      // No road
                        0,          // No fortification
                        []          // No Kingmaker features
                    );
                    hexes.push(hex);
                }
            }

            // Update kingdom store with territory data
            await this.updateKingdomStore(hexes);
            
            return {
                success: true,
                hexesSynced: hexes.length,
                settlementsSynced: 0
            };
            
        } catch (error) {
            logger.error('[Territory Service] Failed to import from Foundry grid:', error);
            return {
                success: false,
                hexesSynced: 0,
                settlementsSynced: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    
    /**
     * Sync territory data from Kingmaker module to Kingdom store
     * GM-ONLY: Only GM can import territory data
     */
    async syncFromKingmaker(): Promise<KingmakerSyncResult> {
        // GM check - only GM can import data
        if (!(game as any)?.user?.isGM) {
            logger.error('[Territory Service] Only GM can import kingdom data');
            return { 
                success: false, 
                hexesSynced: 0, 
                settlementsSynced: 0, 
                error: 'Only GM can import kingdom data' 
            };
        }
        
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

            const hexStates = km.state.hexes || {};
            const regionHexes = km.region?.hexes;
            
            if (!regionHexes) {
                logger.error('Kingmaker region hexes not available');
                return {
                    success: false,
                    hexesSynced: 0,
                    settlementsSynced: 0,
                    error: 'Kingmaker region hexes not available'
                };
            }
            
            // Convert and filter claimed hexes
            const hexes: Hex[] = [];

            // Iterate through REGION hexes (map data) instead of state hexes (player data)
            // This ensures we get all ~300 map hexes, not just the ones with state
            for (const [numericId, regionHex] of regionHexes.entries()) {
                if (!regionHex || !regionHex.data) {
                    continue; // Skip invalid hexes
                }
                
                // Convert numeric ID to dot notation
                const hexId = String(numericId);
                const dotNotationId = this.convertHexId(hexId);
                
                // Get terrain and travel from the hex's data (this is the source of truth)
                const hexData = regionHex.data;
                const rawTerrain = hexData.terrain;
                const zoneId = hexData.zone || null;
                
                let terrainType: TerrainType;
                if (rawTerrain) {
                    terrainType = normalizeTerrainType(rawTerrain);
                } else {
                    terrainType = 'plains'; // Default to plains if no terrain data

                }
                
                // Set travel difficulty based on terrain type (not Kingmaker's values)
                const travelDifficulty = getTravelDifficultyFromTerrain(terrainType);
                
                // Look up hex state to get ownership data
                // If hex has no state, it's wilderness (claimedBy = null)
                const hexState = hexStates[hexId] || {};
                // Convert Kingmaker's claimed (boolean) to our claimedBy (string | null)
                const claimedBy = hexState.claimed ? PLAYER_KINGDOM : null;
                
                // Debug log for each hex (reduced logging for performance)
                if (claimedBy === PLAYER_KINGDOM || hexState.camp || hexState.features?.length > 0) {

                }
                
                // Convert worksite (if hex has state)
                const worksite = hexState.camp || hexState.features ? this.convertWorksite(hexState) : null;
                
                // Convert commodities from Kingmaker format
                const commodities = this.convertCommodities(hexState);
                
                // Log commodity detection for debugging
                if (commodities.size > 0) {

                }
                
                // Parse row and col from dotNotationId
                const [rowStr, colStr] = dotNotationId.split('.');
                const row = parseInt(rowStr);
                const col = parseInt(colStr);
                
                // Convert Kingmaker features to our format first
                const ourFeatures = this.convertKingmakerFeatures(hexState.features || []);
                
                // Extract hasRoad from features (roads OR settlements count as roads)
                const hasRoadFeature = hexState.features?.some((f: KingmakerHexFeature) => f.type === 'road') || false;
                const hasSettlementFeature = ourFeatures.some(f => f.type === 'settlement');
                const hasRoad = hasRoadFeature || hasSettlementFeature;
                
                // Create hex with features and ownership
                const hex = new Hex(
                    row,
                    col,
                    terrainType,
                    travelDifficulty,
                    worksite,
                    commodities,      // Pass commodities Map
                    null,             // Name can be added later if available
                    claimedBy,        // Track hex ownership
                    hasRoad,          // Road flag
                    0,                // No fortification (default)
                    ourFeatures       // Our features (Kingmaker data converted & discarded)
                );
                hexes.push(hex);
            }

            // Count settlement features for logging (settlements remain as hex features only)
            let settlementFeatureCount = 0;
            for (const hex of hexes) {
                settlementFeatureCount += hex.features.filter(f => f.type === 'settlement').length;
            }


            // Generate water features from terrain data (lakes from water, swamps from swamp terrain)
            const waterFeatures = this.generateWaterFeaturesFromTerrain(hexes);
            
            // Update kingdom store with territory data and water features
            await this.updateKingdomStore(hexes, undefined, waterFeatures);

            // Switch to setup tab after successful import
            const { setSelectedTab } = await import('../../stores/ui');
            setSelectedTab('setup');
            
            return {
                success: true,
                hexesSynced: hexes.length,
                settlementsSynced: 0  // Settlements are hex features, not Settlement objects
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
     * Generate water features from terrain data during import
     * Creates lakes from 'water' terrain and swamps from 'swamp' terrain
     */
    private generateWaterFeaturesFromTerrain(hexes: Hex[]): { lakes: any[], swamps: any[], waterfalls: any[] } {
        const lakes: any[] = [];
        const swamps: any[] = [];
        
        for (const hex of hexes) {
            // Water terrain → Lake feature
            if (hex.terrain === 'water') {
                lakes.push({
                    id: crypto.randomUUID(),
                    hexI: hex.row,
                    hexJ: hex.col
                });
                logger.info(`[Territory Service] Created lake feature at hex ${hex.id} (water terrain)`);
            }
            
            // Swamp terrain → Swamp feature
            if (hex.terrain === 'swamp') {
                swamps.push({
                    id: crypto.randomUUID(),
                    hexI: hex.row,
                    hexJ: hex.col
                });
                logger.info(`[Territory Service] Created swamp feature at hex ${hex.id} (swamp terrain)`);
            }
        }
        
        logger.info(`[Territory Service] Generated ${lakes.length} lakes and ${swamps.length} swamps from terrain data`);
        
        return { lakes, swamps, waterfalls: [] };
    }
    
    /**
     * Update the Kingdom store with territory data
     * Optionally accepts settlements to merge into kingdom data (for initial import only)
     * Optionally accepts water features to initialize waterFeatures structure
     */
    private async updateKingdomStore(
        hexes: Hex[], 
        settlements?: Settlement[], 
        waterFeatures?: { lakes: any[], swamps: any[], waterfalls: any[] }
    ): Promise<void> {
        // Log territory update attempt

        // Extract roads from hex hasRoad property
        const roadsBuilt: string[] = [];
        for (const hex of hexes) {
            if (hex.hasRoad) {
                roadsBuilt.push(hex.id);
            }
        }
        
        await updateKingdom(state => {
            // Convert Hex instances to plain objects for storage
            // IMPORTANT: Validate hex IDs to prevent coordinate system bugs
            state.hexes = hexes.map(hex => {
                // Validate hex ID format (must be dot notation like "2.19", not "20.19")
                const isValid = this.validateHexId(hex.id);
                if (!isValid) {
                    logger.error(`[Territory Service] Invalid hex ID detected: ${hex.id} - this will cause rendering issues!`);
                    throw new Error(`Invalid hex ID format: ${hex.id}. Expected format: "i.j" (e.g., "2.19")`);
                }
                
                // Convert Map to plain object for JSON storage
                const commoditiesObj: Record<string, number> = {};
                hex.commodities.forEach((amount, resource) => {
                    commoditiesObj[resource] = amount;
                });
                
                return {
                    id: hex.id,
                    row: hex.row,
                    col: hex.col,
                    terrain: hex.terrain,
                    travel: hex.travel, // ✅ Store travel difficulty
                    worksite: hex.worksite ? { type: hex.worksite.type as string } : undefined,
                    commodities: commoditiesObj, // Store as plain object
                    hasRoad: hex.hasRoad || false,
                    fortified: hex.fortified || 0,
                    name: hex.name || undefined,
                    features: hex.features || [], // Our features (NOT Kingmaker)
                    claimedBy: hex.claimedBy ?? null // Preserve ownership
                };
            });
            // Only count hexes claimed by the player (claimedBy === PLAYER_KINGDOM), not total hexes
            state.size = state.hexes.filter((h: any) => h.claimedBy === PLAYER_KINGDOM).length;
            
            // Merge imported settlements (if provided)
            if (settlements && settlements.length > 0) {
                // Get existing settlements
                const existingSettlements = state.settlements || [];
                const existingIds = new Set(existingSettlements.map(s => s.id));
                
                // Add new settlements that don't already exist
                const newSettlements = settlements.filter(s => !existingIds.has(s.id));
                
                if (newSettlements.length > 0) {
                    state.settlements = [...existingSettlements, ...newSettlements];

                }
            }
            
            // Roads are tracked via hex.hasRoad flag only (no separate roadsBuilt array)
            // The roadsBuilt array was used during import but is now deprecated
            
            // Update worksite counts for UI display
            const worksiteCount: Record<string, number> = {};
            const counts = this.countWorksites(hexes);
            counts.forEach((count, type) => {
                worksiteCount[type] = count;
            });
            state.worksiteCount = worksiteCount;
            
            // Calculate worksite production from all hexes (stored state for efficiency)
            const worksiteProduction: Record<string, number> = {};
            const worksiteProductionByHex: Array<[any, Map<string, number>]> = [];
            
            for (const hex of hexes) {
                const production = hex.getProduction();
                
                // Add to total worksite production
                production.forEach((amount, resource) => {
                    worksiteProduction[resource] = (worksiteProduction[resource] || 0) + amount;
                });
                
                // Store per-hex production for detailed breakdown
                if (production.size > 0) {
                    worksiteProductionByHex.push([{
                        id: hex.id,
                        name: hex.name || `Hex ${hex.id}`,
                        terrain: hex.terrain
                    }, production]);
                }
            }
            
            state.worksiteProduction = worksiteProduction;
            state.worksiteProductionByHex = worksiteProductionByHex;
            
            // Initialize water features if provided (from Kingmaker import)
            if (waterFeatures) {
                state.waterFeatures = waterFeatures;
                logger.info(`[Territory Service] Initialized water features: ${waterFeatures.lakes.length} lakes, ${waterFeatures.swamps.length} swamps`);
            }

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
        
        // CRITICAL: Recalculate worksite production after hex data changes
        // This ensures worksiteProduction stays in sync with hex modifications
        const { tryRecalculateProduction } = await import('../../utils/recalculateProduction');
        await tryRecalculateProduction();
    }
    
    /**
     * Convert numeric hex ID to dot notation
     * Kingmaker format: row * 1000 + column
     * Examples: 2019 -> "2.19", 5018 -> "5.18", 3020 -> "3.20"
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
        
        // Kingmaker stores hex IDs as: row * 1000 + column
        // Examples: 2019 = row 2, col 19; 5018 = row 5, col 18
        const row = Math.floor(num / 1000);
        const col = num % 1000;
        
        return `${row}.${col.toString().padStart(2, '0')}`;
    }
    
    /**
     * Validate hex ID format - must be dot notation like "2.19" (Foundry grid offsets)
     * Prevents coordinate system bugs by rejecting invalid formats like "20.19"
     */
    private validateHexId(hexId: string): boolean {
        // Must contain a dot separator
        if (!hexId.includes('.')) {
            logger.warn(`[Territory Service] Invalid hex ID format (no dot): ${hexId}`);
            return false;
        }
        
        // Parse the coordinates
        const parts = hexId.split('.');
        if (parts.length !== 2) {
            logger.warn(`[Territory Service] Invalid hex ID format (wrong parts): ${hexId}`);
            return false;
        }
        
        const i = parseInt(parts[0], 10);
        const j = parseInt(parts[1], 10);
        
        // Both must be valid numbers
        if (isNaN(i) || isNaN(j)) {
            logger.warn(`[Territory Service] Invalid hex ID format (not numbers): ${hexId}`);
            return false;
        }
        
        // Sanity check: grid coordinates should be reasonable (0-99 range for Stolen Lands map)
        // This catches bugs like "20.19" which should be "2.19"
        if (i < 0 || i > 99 || j < 0 || j > 99) {
            logger.warn(`[Territory Service] Hex ID coordinates out of expected range: ${hexId} (i=${i}, j=${j})`);
            return false;
        }
        
        return true;
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
     * Convert Kingmaker features to our feature format
     * Extracts only what we need, discards Kingmaker-specific data
     * 
     * NOTE: Roads are NOT stored as features - they're tracked via hasRoad flag only
     */
    private convertKingmakerFeatures(kingmakerFeatures: KingmakerHexFeature[]): HexFeature[] {
        const ourFeatures: HexFeature[] = [];
        
        for (const kmFeature of kingmakerFeatures) {
            const featureType = kmFeature.type?.toLowerCase();
            
            if (!featureType) continue; // Skip features with no type
            
            // Convert settlement features - ALL settlements become unlinked hex features
            if (['village', 'town', 'city', 'metropolis'].includes(featureType)) {
                const featureName = (kmFeature as any).name?.trim();
                const hasName = featureName && featureName.toLowerCase() !== 'vacant';
                
                // Create unlinked feature for ALL settlements (named + vacant)
                // Players will create Settlement objects via UI
                ourFeatures.push({
                    type: 'settlement',
                    linked: false,
                    settlementId: null,
                    tier: featureType.charAt(0).toUpperCase() + featureType.slice(1),
                    name: hasName ? featureName : undefined  // Preserve Kingmaker name
                });
            }
            // Skip road features - roads are tracked via hasRoad flag, not in features array
            else if (featureType === 'road') {
                // Intentionally skip - hasRoad flag is set separately
                continue;
            }
            // Convert landmarks (if any)
            else if ((kmFeature as any).name) {
                ourFeatures.push({
                    type: 'landmark',
                    name: (kmFeature as any).name
                });
            }
            // Other features we don't handle yet - could be extended later
        }
        
        return ourFeatures;
    }
    
    /**
     * Convert Kingmaker commodity string to our commodity Map
     * Handles "luxury" → "gold" conversion
     */
    private convertCommodities(hexState: HexState): Map<string, number> {
        const commodities = new Map<string, number>();
        
        if (!hexState.commodity || hexState.commodity.trim() === '') {
            return commodities;
        }
        
        const commodityType = hexState.commodity.toLowerCase().trim();
        
        // Convert Kingmaker luxury to gold
        if (commodityType === 'luxury') {
            commodities.set('gold', 1);

        }
        // Map standard commodities
        else if (['food', 'lumber', 'stone', 'ore'].includes(commodityType)) {
            commodities.set(commodityType, 1);
        }
        // Unknown commodity type
        else {
            logger.warn(`Unknown Kingmaker commodity type: ${hexState.commodity}`);
        }
        
        return commodities;
    }
    
    /**
     * Extract settlements from hex features
     * Uses location-based IDs to prevent duplicates
     * Creates settlements with kingmakerLocation and rmLocation (0,0 if unlinked)
     * IMPORTANT: Only ONE settlement per hex - takes the highest tier if multiple features exist
     */
    private extractSettlements(features: KingmakerHexFeature[], hexId: string): Settlement[] {
        // Get existing settlements to check for duplicates
        const existingSettlements = get(kingdomData).settlements || [];
        
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

            return [];
        }
        
        // Find ALL settlement features in this hex and take the HIGHEST tier
        const settlementFeatures: Array<{ feature: KingmakerHexFeature, tier: SettlementTier, tierRank: number }> = [];
        const tierRanking = { 'Village': 1, 'Town': 2, 'City': 3, 'Metropolis': 4 };
        
        for (const feature of features) {
            const tier = this.getSettlementTier(feature.type);
            if (tier) {
                settlementFeatures.push({
                    feature,
                    tier,
                    tierRank: tierRanking[tier] || 0
                });
            }
        }
        
        // No settlement features found
        if (settlementFeatures.length === 0) {
            return [];
        }
        
        // Sort by tier rank (highest first) and take the first one
        settlementFeatures.sort((a, b) => b.tierRank - a.tierRank);
        const highestTierFeature = settlementFeatures[0];
        
        if (settlementFeatures.length > 1) {
            logger.warn(`Hex ${hexId} has multiple settlement features:`, 
                settlementFeatures.map(sf => sf.tier).join(', '),
                `- using highest tier: ${highestTierFeature.tier}`
            );
        }
        
        // Get feature name
        const featureName = (highestTierFeature.feature as any).name;
        const hasName = featureName && featureName.trim() && featureName.trim().toLowerCase() !== 'vacant';
        
        // Skip unnamed/vacant features - they remain as hex features for location picker
        if (!hasName) {

            return [];
        }
        
        // Create settlement with kingmakerLocation (only for named settlements)
        const settlement = createSettlement(
            featureName.trim(),
            kingmakerLocation, // Use Kingmaker location directly for named settlements
            highestTierFeature.tier as any,
            kingmakerLocation // Pass Kingmaker location to factory
        );
        
        // Factory creates the ID, but we need to ensure it's correct
        settlement.id = settlementId;
        settlement.kingmakerLocation = kingmakerLocation;

        return [settlement];
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
            territory = (kingdomState.hexes || []).map(hexData => {
                // Parse row and col from stored data or ID
                const row = (hexData as any).row ?? parseInt(hexData.id.split('.')[0]);
                const col = (hexData as any).col ?? parseInt(hexData.id.split('.')[1]);
                
                // Convert commodities object back to Map
                const commoditiesData = (hexData as any).commodities || {};
                const commodities = new Map(
                    Object.entries(commoditiesData).map(([k, v]) => [k, Number(v)])
                );
                
                return new Hex(
                    row,
                    col,
                    hexData.terrain as TerrainType,
                    (hexData as any).travel || 'open', // Default to open if not stored
                    hexData.worksite ? new Worksite(hexData.worksite.type as WorksiteType) : null,
                    commodities, // Pass reconstructed Map
                    hexData.name || null,
                    (hexData as any).claimedBy ?? null,
                    (hexData as any).hasRoad || false,
                    (hexData as any).fortified || 0,
                    (hexData as any).features || []
                );
            });
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
        
        // Parse row and col from stored data or ID
        const row = (hexData as any).row ?? parseInt(hexId.split('.')[0]);
        const col = (hexData as any).col ?? parseInt(hexId.split('.')[1]);
        
        // Convert commodities object back to Map
        const commoditiesData = (hexData as any).commodities || {};
        const commodities = new Map(
            Object.entries(commoditiesData).map(([k, v]) => [k, Number(v)])
        );
        
        return new Hex(
            row,
            col,
            hexData.terrain as TerrainType,
            (hexData as any).travel || 'open', // Default to open if not stored
            hexData.worksite ? new Worksite(hexData.worksite.type as WorksiteType) : null,
            commodities, // Pass reconstructed Map
            hexData.name || null,
            (hexData as any).claimedBy ?? null,
            (hexData as any).hasRoad || false,
            (hexData as any).fortified || 0,
            (hexData as any).features || []
        );
    }
    
  /**
   * Get all roads in the kingdom
   * Derives from hex.hasRoad flags (single source of truth)
   * Returns array of hex IDs that have roads
   */
  getRoads(): string[] {
    const state = get(kingdomData);
    
    // Derive from hexes with hasRoad flag (source of truth)
    if (state.hexes) {
      return state.hexes
        .filter((h: any) => h.hasRoad === true)
        .map((h: any) => h.id);
    }
    
    // No roads found
    return [];
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

      return;
    }
    
    // Skip if settlement has no location
    if (!settlement.location || (settlement.location.x === 0 && settlement.location.y === 0)) {

      return;
    }
    
    try {
      // @ts-ignore - Kingmaker global
      const km = (typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker);
      if (!km?.state) {
        logger.warn('[Territory Service] Kingmaker state not available');
        return;
      }
      
      // Calculate hex key from settlement location (Kingmaker format: i * 1000 + j)
      const hexKey = (1000 * settlement.location.x) + settlement.location.y;

      // Convert our tier to Kingmaker feature type
      const kingmakerType = this.tierToKingmakerFeatureType(settlement.tier);
      
      // Get existing hex state to preserve other properties
      const existingHexState = km.state.hexes[hexKey] || {};
      const existingFeatures = existingHexState.features || [];

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

      return;
    }
    
    // Skip if no valid location
    if (!location || (location.x === 0 && location.y === 0)) {

      return;
    }
    
    try {
      // @ts-ignore - Kingmaker global
      const km = (typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker);
      if (!km?.state) {
        logger.warn('[Territory Service] Kingmaker state not available');
        return;
      }
      
      // Calculate hex key (Kingmaker format: i * 1000 + j)
      const hexKey = (1000 * location.x) + location.y;

      // Get existing hex state
      const existingHexState = km.state.hexes[hexKey];
      if (!existingHexState || !existingHexState.features) {

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

      return;
    }
    
    // Skip if no valid location
    if (!location || (location.x === 0 && location.y === 0)) {

      return;
    }
    
    try {
      // @ts-ignore - Kingmaker global
      const km = (typeof kingmaker !== 'undefined' ? kingmaker : (globalThis as any).kingmaker);
      if (!km?.state) {
        logger.warn('[Territory Service] Kingmaker state not available');
        return;
      }
      
      // Calculate hex key (Kingmaker format: i * 1000 + j)
      const hexKey = (1000 * location.x) + location.y;

      // Get existing hex state
      const existingHexState = km.state.hexes[hexKey];
      if (!existingHexState || !existingHexState.features) {

        return;
      }
      
      const existingFeatures = existingHexState.features;
      
      // Remove settlement features from this hex
      const nonSettlementFeatures = existingFeatures.filter((f: any) => 
        !['village', 'town', 'city', 'metropolis'].includes(f.type?.toLowerCase())
      );

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
