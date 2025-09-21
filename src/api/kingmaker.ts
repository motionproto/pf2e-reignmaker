// External definitions for accessing the PF2e Kingmaker module's state

/**
 * External definitions for accessing the PF2e Kingmaker module's state
 */

export interface HexFeature {
    type: string | null; // e.g., "farmland", "refuge", "landmark"
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
