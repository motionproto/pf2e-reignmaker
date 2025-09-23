// External definitions for accessing the PF2e Kingmaker module's state

import { kingdomState, updateKingdomStat, addSettlement } from '../stores/kingdom';
import { Hex, Worksite, WorksiteType } from '../models/Hex';
import type { Settlement, SettlementTier } from '../models/KingdomState';
import { get } from 'svelte/store';

/**
 * External definitions for accessing the PF2e Kingmaker module's state
 */

export interface HexFeature {
    type: string | null; // e.g., "farmland", "refuge", "landmark", "village", "town", "city", "metropolis"
}

export interface HexState {
    commodity: string | null; // e.g., "food", "ore", "lumber", "stone", "luxuries"
    camp: string | null; // Camps/Worksites: "quarry", "lumber", "mine"
    features: HexFeature[] | null;
    claimed: boolean | null;
    terrain: string | null; // e.g., "plains", "forest", "hills", "mountains", "wetlands", "swamp", "lake"
}

export interface KingmakerState {
    hexes: Record<string, HexState>;
}

export interface KingmakerModule {
    state: KingmakerState;
}

/**
 * Access to the global kingmaker module instance
 * This will be available when the PF2e Kingmaker module is installed
 */
declare const kingmaker: KingmakerModule | null;

/**
 * Data class representing parsed realm/kingdom data
 */
export interface RealmData {
    size: number;
    worksites: WorkSites;
    settlements: Settlements;
}

/**
 * Data class for settlement information
 */
export class Settlements {
    villages: number = 0;
    towns: number = 0;
    cities: number = 0;
    metropolises: number = 0;
    total: number = 0;

    constructor(data?: Partial<Settlements> | null) {
        if (data) {
            this.villages = data.villages || 0;
            this.towns = data.towns || 0;
            this.cities = data.cities || 0;
            this.metropolises = data.metropolises || 0;
            this.total = data.total || 0;
        }
    }

    getSummary(): string {
        const parts: string[] = [];
        if (this.villages > 0) parts.push(`${this.villages} Village${this.villages > 1 ? "s" : ""}`);
        if (this.towns > 0) parts.push(`${this.towns} Town${this.towns > 1 ? "s" : ""}`);
        if (this.cities > 0) parts.push(`${this.cities} Cit${this.cities > 1 ? "ies" : "y"}`);
        if (this.metropolises > 0) parts.push(`${this.metropolises} Metropolis${this.metropolises > 1 ? "es" : ""}`);
        return parts.length === 0 ? "None" : parts.join(", ");
    }
}

/**
 * Data class for all worksite types
 */
export interface WorkSites {
    farmlands: WorkSite;
    lumberCamps: WorkSite;
    mines: WorkSite;
    quarries: WorkSite;
    luxurySources: WorkSite;
}

/**
 * Individual worksite data
 */
export class WorkSite {
    quantity: number;
    resources: number;

    constructor(quantity: number = 0, resources: number = 0) {
        this.quantity = quantity;
        this.resources = resources;
    }

    plus(other: WorkSite): WorkSite {
        return new WorkSite(
            this.quantity + other.quantity,
            this.resources + other.resources
        );
    }
}

/**
 * Check if the Kingmaker module is installed and available
 */
export function isKingmakerInstalled(): boolean {
    return typeof (window as any).kingmaker !== 'undefined' && (window as any).kingmaker !== null;
}

/**
 * Get the current realm data from the Kingmaker module
 */
export function getKingmakerRealmData(): RealmData | null {
    if (!isKingmakerInstalled()) return null;
    
    const km = (window as any).kingmaker as KingmakerModule;
    if (!km) return null;
    
    try {
        const hexes = km.state.hexes;
        
        // Convert Record to array of hex states
        const claimedHexes: HexState[] = [];
        const hexIds = Object.keys(hexes);
        
        for (const hexId of hexIds) {
            const hexState = hexes[hexId];
            if (hexState?.claimed === true) {
                claimedHexes.push(hexState);
            }
        }
        
        // Count claimed hexes
        const claimedCount = claimedHexes.length;
        
        // Log terrain data for debugging (temporary)
        console.log("Claimed hexes terrain data:");
        for (const hex of claimedHexes) {
            console.log(`Hex terrain: ${hex.terrain}, commodity: ${hex.commodity}, camp: ${hex.camp}`);
        }
        
        // Parse worksites
        const farmlands = parseWorksite(claimedHexes, null, "food", "farmland");
        const lumberCamps = parseWorksite(claimedHexes, "lumber", "lumber");
        const mines = parseWorksite(claimedHexes, "mine", "ore");
        const quarries = parseWorksite(claimedHexes, "quarry", "stone");
        
        // Special handling for luxury sources - mines with luxury commodities
        const luxurySources = parseLuxuryWorksite(claimedHexes);
        
        // Parse settlements from features
        const settlements = parseSettlements(claimedHexes);
        
        return {
            size: claimedCount,
            worksites: {
                farmlands,
                lumberCamps,
                mines,
                quarries,
                luxurySources
            },
            settlements
        };
    } catch (e) {
        console.error("Failed to parse Kingmaker realm data", e);
        return null;
    }
}

/**
 * Parse worksites from claimed hexes
 */
function parseWorksite(
    hexes: HexState[],
    type: string | null,
    commodity: string,
    feature: string | null = null
): WorkSite {
    let quantity = 0;
    let resources = 0;
    
    for (const hex of hexes) {
        // Check for farmland features (special case)
        if (feature != null) {
            if (hex.features?.some(f => f.type === feature)) {
                quantity++;
            }
            // For farmlands, count food commodity separately
            if (hex.commodity === commodity) {
                resources++;
            }
        }
        // Check for camps/worksites
        else if (type != null && hex.camp === type) {
            quantity++;
            if (hex.commodity === commodity) {
                resources++;
            }
        }
    }
    
    return new WorkSite(quantity, resources);
}

/**
 * Special parsing for luxury worksites
 * (mines on luxury commodity hexes)
 */
function parseLuxuryWorksite(hexes: HexState[]): WorkSite {
    let quantity = 0;
    let resources = 0;
    
    for (const hex of hexes) {
        // A mine on a luxury commodity hex creates a luxury worksite
        if (hex.camp === "mine" && hex.commodity === "luxuries") {
            quantity++;
            // Note: Luxury mines don't produce additional resources
            // They just allow luxury collection
        }
    }
    
    return new WorkSite(quantity, resources);
}

/**
 * Parse settlements from hex features
 */
function parseSettlements(hexes: HexState[]): Settlements {
    let villages = 0;
    let towns = 0;
    let cities = 0;
    let metropolises = 0;
    
    for (const hex of hexes) {
        hex.features?.forEach((feature) => {
            switch (feature.type?.toLowerCase()) {
                case "village": villages++; break;
                case "town": towns++; break;
                case "city": cities++; break;
                case "metropolis": metropolises++; break;
            }
        });
    }
    
    return new Settlements({
        villages,
        towns,
        cities,
        metropolises,
        total: villages + towns + cities + metropolises
    });
}

/**
 * Get summary text for the current realm
 */
export function getRealmSummary(): string {
    const realmData = getKingmakerRealmData();
    if (!realmData) return "Kingmaker module not installed or no realm data available";
    
    const lines: string[] = [];
    lines.push(`Kingdom Size: ${realmData.size} hexes`);
    
    // Add settlements info
    if (realmData.settlements.total > 0) {
        lines.push("");
        lines.push(`Settlements: ${realmData.settlements.getSummary()}`);
    }
    
    lines.push("");
    lines.push("Worksites:");
    
    const worksites = realmData.worksites;
    if (worksites.farmlands.quantity > 0) {
        lines.push(`  Farmlands: ${worksites.farmlands.quantity} (producing ${worksites.farmlands.resources} food)`);
    }
    if (worksites.lumberCamps.quantity > 0) {
        lines.push(`  Lumber Camps: ${worksites.lumberCamps.quantity} (producing ${worksites.lumberCamps.resources} lumber)`);
    }
    if (worksites.mines.quantity > 0) {
        lines.push(`  Mines: ${worksites.mines.quantity} (producing ${worksites.mines.resources} ore)`);
    }
    if (worksites.quarries.quantity > 0) {
        lines.push(`  Quarries: ${worksites.quarries.quantity} (producing ${worksites.quarries.resources} stone)`);
    }
    if (worksites.luxurySources.quantity > 0) {
        lines.push(`  Luxury Sources: ${worksites.luxurySources.quantity}`);
    }
    
    return lines.join("\n");
}

/**
 * Convert a terrain string from Kingmaker format to our format
 */
function normalizeTerrainName(terrain: string | null): string {
    if (!terrain) return 'Plains';
    
    // Convert to title case and handle special cases
    const normalized = terrain.toLowerCase();
    switch (normalized) {
        case 'plains': return 'Plains';
        case 'forest': return 'Forest';
        case 'hills': return 'Hills';
        case 'mountains': return 'Mountains';
        case 'swamp': return 'Swamp';
        case 'wetlands': return 'Swamp';
        case 'desert': return 'Desert';
        case 'lake': return 'Plains'; // Lakes treated as plains for worksite purposes
        default: return 'Plains';
    }
}

/**
 * Convert a camp type to worksite type
 */
function campToWorksiteType(camp: string | null): WorksiteType | null {
    if (!camp) return null;
    
    switch (camp.toLowerCase()) {
        case 'lumber': return WorksiteType.LOGGING_CAMP;
        case 'mine': return WorksiteType.MINE;
        case 'quarry': return WorksiteType.QUARRY;
        default: return null;
    }
}

/**
 * Convert settlement tier from string
 */
function getSettlementTier(type: string): SettlementTier | null {
    switch (type.toLowerCase()) {
        case 'village': return 'Village' as SettlementTier;
        case 'town': return 'Town' as SettlementTier;
        case 'city': return 'City' as SettlementTier;
        case 'metropolis': return 'Metropolis' as SettlementTier;
        default: return null;
    }
}

/**
 * Sync Kingmaker module data to the Kingdom State store
 * This updates the store with the current state from the Kingmaker module
 */
export function syncKingmakerToKingdomState(): boolean {
    if (!isKingmakerInstalled()) {
        console.warn("Kingmaker module not installed, cannot sync");
        return false;
    }
    
    const km = (window as any).kingmaker as KingmakerModule;
    if (!km) return false;
    
    try {
        const hexStates = km.state.hexes;
        const hexIds = Object.keys(hexStates);
        
        // Build hex objects and settlements
        const newHexes: Hex[] = [];
        const newSettlements: Settlement[] = [];
        const settlementMap = new Map<string, Settlement>();
        
        // Count worksites for updating the store
        const worksiteCounts = new Map<string, number>([
            ['farmlands', 0],
            ['lumberCamps', 0],
            ['quarries', 0],
            ['mines', 0]
        ]);
        
        // Track calculated income for each resource
        const calculatedIncome = new Map<string, number>([
            ['food', 0],
            ['lumber', 0],
            ['stone', 0],
            ['ore', 0],
            ['gold', 0]
        ]);
        
        let hexIndex = 0;
        for (const hexId of hexIds) {
            const hexState = hexStates[hexId];
            if (!hexState?.claimed) continue;
            
            // Create hex object
            const terrain = normalizeTerrainName(hexState.terrain);
            let worksite: Worksite | null = null;
            
            // Check for farmland feature
            const hasFarmland = hexState.features?.some(f => f.type === 'farmland') || false;
            if (hasFarmland) {
                worksite = new Worksite(WorksiteType.FARMSTEAD);
                worksiteCounts.set('farmlands', (worksiteCounts.get('farmlands') || 0) + 1);
                
                // Calculate food income based on terrain
                const foodYield = terrain === 'Plains' ? 2 : terrain === 'Hills' ? 1 : 0;
                const commodityBonus = hexState.commodity === 'food' ? 1 : 0;
                calculatedIncome.set('food', (calculatedIncome.get('food') || 0) + foodYield + commodityBonus);
            }
            // Check for camp/worksite
            else if (hexState.camp) {
                const worksiteType = campToWorksiteType(hexState.camp);
                if (worksiteType) {
                    worksite = new Worksite(worksiteType);
                    
                    // Update counts and calculate income
                    switch (worksiteType) {
                        case WorksiteType.LOGGING_CAMP:
                            worksiteCounts.set('lumberCamps', (worksiteCounts.get('lumberCamps') || 0) + 1);
                            // Lumber camps in forests produce 2 lumber
                            const lumberYield = terrain === 'Forest' ? 2 : 1;
                            const lumberBonus = hexState.commodity === 'lumber' ? 1 : 0;
                            calculatedIncome.set('lumber', (calculatedIncome.get('lumber') || 0) + lumberYield + lumberBonus);
                            break;
                        case WorksiteType.MINE:
                            worksiteCounts.set('mines', (worksiteCounts.get('mines') || 0) + 1);
                            // Mines in mountains produce 1 ore
                            const oreYield = terrain === 'Mountains' ? 1 : 0;
                            const oreBonus = hexState.commodity === 'ore' ? 1 : 0;
                            calculatedIncome.set('ore', (calculatedIncome.get('ore') || 0) + oreYield + oreBonus);
                            break;
                        case WorksiteType.QUARRY:
                            worksiteCounts.set('quarries', (worksiteCounts.get('quarries') || 0) + 1);
                            // Quarries in hills/mountains produce 1 stone
                            const stoneYield = (terrain === 'Hills' || terrain === 'Mountains') ? 1 : 0;
                            const stoneBonus = hexState.commodity === 'stone' ? 1 : 0;
                            calculatedIncome.set('stone', (calculatedIncome.get('stone') || 0) + stoneYield + stoneBonus);
                            break;
                    }
                }
            }
            
            // Check for special commodity traits
            const hasSpecialTrait = hexState.commodity !== null && hexState.commodity !== 'none';
            
            // Create hex with a unique ID
            const hex = new Hex(
                `hex_${hexIndex++}`,
                terrain,
                worksite,
                hasSpecialTrait,
                null // Name can be added later if needed
            );
            newHexes.push(hex);
            
            // Parse settlement features
            hexState.features?.forEach(feature => {
                if (feature.type) {
                    const tier = getSettlementTier(feature.type);
                    if (tier) {
                        // For simplicity, create one settlement per feature
                        // In a real game, you might want to group them
                        const settlementName = `${feature.type}_${hexId}`;
                        const settlement: Settlement = {
                            name: settlementName,
                            tier: tier,
                            structureIds: [],
                            connectedByRoads: false
                        };
                        newSettlements.push(settlement);
                    }
                }
            });
        }
        
        // Add gold income from settlements (1 gold per settlement)
        calculatedIncome.set('gold', newSettlements.length);
        
        // Update the kingdom state store
        kingdomState.update(state => {
            // Update hexes and size
            state.hexes = newHexes;
            state.size = newHexes.length;
            
            // Update settlements
            state.settlements = newSettlements;
            
            // Update worksite counts
            state.worksiteCount = worksiteCounts;
            
            // Store the calculated income on the state object
            (state as any).income = calculatedIncome;
            
            // Calculate and store production for quick access
            // This will be used by the UI
            const production = state.calculateProduction();
            console.log("Synced Kingmaker data - Size:", state.size, "Production:", production, "Income:", calculatedIncome);
            
            return state;
        });
        
        console.log(`Successfully synced ${newHexes.length} hexes and ${newSettlements.length} settlements from Kingmaker module`);
        return true;
        
    } catch (e) {
        console.error("Failed to sync Kingmaker data to Kingdom State", e);
        return false;
    }
}

/**
 * Start automatic syncing of Kingmaker data using Foundry hooks
 * This uses event-driven updates instead of polling for better performance
 */
export function startKingmakerSync(): () => void {
    // Do initial sync
    syncKingmakerToKingdomState();
    
    // Define hook handlers
    const syncHandler = () => {
        console.log("Kingmaker state change detected, syncing...");
        syncKingmakerToKingdomState();
    };
    
    const updateActorHandler = (actor: any, changes: any, options: any, userId: string) => {
        // Check if this is a kingdom-related update
        if (actor.type === 'party' || changes.system?.kingdom) {
            console.log("Kingdom actor updated, syncing...");
            syncKingmakerToKingdomState();
        }
    };
    
    const renderHandler = (app: any, html: any, data: any) => {
        // Sync when kingdom-related apps are rendered
        if (app.constructor.name.includes('Kingdom') || app.id?.includes('kingdom')) {
            syncKingmakerToKingdomState();
        }
    };
    
    // Listen to various Foundry hooks that might indicate kingdom state changes
    // @ts-ignore - Foundry global
    if (typeof Hooks !== 'undefined') {
        // Hook into general updates
        Hooks.on('updateActor', updateActorHandler);
        Hooks.on('updateScene', syncHandler);
        Hooks.on('canvasReady', syncHandler);
        
        // Hook into kingdom-specific events if they exist
        Hooks.on('pf2e.kingmaker.hexClaimed', syncHandler);
        Hooks.on('pf2e.kingmaker.hexUpdated', syncHandler);
        Hooks.on('pf2e.kingmaker.settlementBuilt', syncHandler);
        Hooks.on('pf2e.kingmaker.worksiteBuilt', syncHandler);
        Hooks.on('pf2e.kingmaker.stateChanged', syncHandler);
        
        // Hook into UI updates
        Hooks.on('renderKingdomSheet', renderHandler);
        Hooks.on('renderKingdomHUD', renderHandler);
        
        console.log("Kingmaker sync hooks registered");
    }
    
    // Also set up a fallback periodic sync (less frequent)
    // This ensures we catch any changes that don't trigger hooks
    const intervalId = setInterval(() => {
        syncKingmakerToKingdomState();
    }, 30000); // 30 seconds instead of 5
    
    // Return cleanup function
    return () => {
        // Remove all hook listeners
        // @ts-ignore - Foundry global
        if (typeof Hooks !== 'undefined') {
            Hooks.off('updateActor', updateActorHandler);
            Hooks.off('updateScene', syncHandler);
            Hooks.off('canvasReady', syncHandler);
            Hooks.off('pf2e.kingmaker.hexClaimed', syncHandler);
            Hooks.off('pf2e.kingmaker.hexUpdated', syncHandler);
            Hooks.off('pf2e.kingmaker.settlementBuilt', syncHandler);
            Hooks.off('pf2e.kingmaker.worksiteBuilt', syncHandler);
            Hooks.off('pf2e.kingmaker.stateChanged', syncHandler);
            Hooks.off('renderKingdomSheet', renderHandler);
            Hooks.off('renderKingdomHUD', renderHandler);
            
            console.log("Kingmaker sync hooks removed");
        }
        
        // Clear the fallback interval
        clearInterval(intervalId);
    };
}

/**
 * Initialize Kingmaker sync when Foundry is ready
 * This should be called from the module's ready hook
 */
export function initializeKingmakerSync(): void {
    // @ts-ignore - Foundry global
    if (typeof Hooks !== 'undefined') {
        Hooks.once('ready', () => {
            console.log('Initializing Kingmaker sync...');
            
            // Check if Kingmaker is installed before starting sync
            if (isKingmakerInstalled()) {
                startKingmakerSync();
                console.log('Kingmaker sync started');
            } else {
                console.log('Kingmaker module not detected, sync not started');
                
                // Set up a listener to start sync if Kingmaker gets loaded later
                Hooks.on('setup', () => {
                    if (isKingmakerInstalled()) {
                        startKingmakerSync();
                    }
                });
            }
        });
    }
}
