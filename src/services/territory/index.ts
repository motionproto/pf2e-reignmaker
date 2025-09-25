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
import { kingdomState } from '../../stores/kingdom';
import { Hex, Worksite, WorksiteType } from '../../models/Hex';
import type { Settlement, SettlementTier } from '../../models/KingdomState';
import { createSettlement } from '../../models/Settlement';
import type { HexFeature, HexState } from '../../api/kingmaker';

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
            
            console.log('Starting Kingmaker sync, found hexes:', Object.keys(hexStates).length);
            
            for (const hexId of Object.keys(hexStates)) {
                const hexState = hexStates[hexId];
                if (!hexState?.claimed) continue;
                
                // Convert numeric ID to dot notation
                const dotNotationId = this.convertHexId(hexId);
                
                // Get terrain directly from hexState (it's provided by Kingmaker)
                // Default to 'plains' if not specified
                const terrain = this.normalizeTerrainName(hexState.terrain || 'plains');
                
                // Debug log for each claimed hex
                console.log(`Processing hex ${dotNotationId}:`, {
                    terrain: hexState.terrain,
                    normalizedTerrain: terrain,
                    camp: hexState.camp,
                    commodity: hexState.commodity,
                    features: hexState.features
                });
                
                // Convert worksite
                const worksite = this.convertWorksite(hexState);
                
                // Check for special commodity trait
                const hasSpecialTrait = this.hasMatchingCommodity(hexState, worksite);
                
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
            
            console.log(`Synced ${hexes.length} hexes and ${settlements.length} settlements`);
            
            // Update kingdom store with territory data
            this.updateKingdomStore(hexes, settlements);
            
            return {
                success: true,
                hexesSynced: hexes.length,
                settlementsSynced: settlements.length
            };
            
        } catch (error) {
            console.error('Failed to sync from Kingmaker:', error);
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
    private updateKingdomStore(hexes: Hex[], settlements: Settlement[]): void {
        kingdomState.update(state => {
            // Update territory data
            state.hexes = hexes;
            state.size = hexes.length;
            state.settlements = settlements;
            
            // Update worksite counts for UI display
            state.worksiteCount = this.countWorksites(hexes);
            
            // Update cached production values - calculate once when hexes change
            state.updateCachedProduction();
            
            return state;
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
            console.warn(`Invalid hex ID: ${numericId}, returning as is`);
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
        if (!terrain) return 'Plains';
        
        const normalized = terrain.toLowerCase();
        switch (normalized) {
            case 'plains': return 'Plains';
            case 'forest': return 'Forest';
            case 'hills': return 'Hills';
            case 'mountains': return 'Mountains';
            case 'swamp': return 'Swamp';
            case 'wetlands': return 'Swamp';
            case 'desert': return 'Desert';
            case 'lake': return 'Plains'; // Lakes treated as plains
            default: return 'Plains';
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
                    console.warn(`Unknown camp type from Kingmaker: ${hexState.camp}`);
                    return null;
            }
        }
        
        return null;
    }
    
    /**
     * Check if hex has commodity matching its worksite production
     */
    private hasMatchingCommodity(hexState: HexState, worksite: Worksite | null): boolean {
        if (!worksite || !hexState.commodity) return false;
        
        // Check worksite-commodity matches
        switch (worksite.type) {
            case WorksiteType.FARMSTEAD: 
                return hexState.commodity === 'food';
            case WorksiteType.LOGGING_CAMP: 
                return hexState.commodity === 'lumber';
            case WorksiteType.QUARRY: 
                return hexState.commodity === 'stone';
            case WorksiteType.MINE: 
                return hexState.commodity === 'ore';
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
        // Use provided hexes or get from kingdom store
        const territory = hexes || get(kingdomState).hexes;
        
        // Count hexes by terrain
        const hexesByTerrain = new Map<string, number>();
        for (const hex of territory) {
            const count = hexesByTerrain.get(hex.terrain) || 0;
            hexesByTerrain.set(hex.terrain, count + 1);
        }
        
        // Count worksites
        const worksiteCount = this.countWorksites(territory);
        
        // Count settlements
        const settlementCount = get(kingdomState).settlements.length;
        
        // Calculate total production
        const totalProduction = new Map<string, number>();
        for (const hex of territory) {
            const production = hex.getProduction();
            production.forEach((amount, resource) => {
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
        const state = get(kingdomState);
        return state.hexes.find(h => h.id === hexId) || null;
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
