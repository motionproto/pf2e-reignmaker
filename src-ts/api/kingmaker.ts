// Auto-converted from KingmakerApi.kt
// TODO: Review and fix TypeScript-specific issues



// TODO: Review import - import js.objects.ReadonlyRecord

/**
 * External definitions for accessing the PF2e Kingmaker module's state
 */


declare interface HexFeature {
    const type: string | null // e.g., "farmland", "refuge", "landmark"
}


declare interface HexState {
    const commodity: string | null // e.g., "food", "ore", "lumber", "stone", "luxuries"
    const camp: string | null // Camps/Worksites: "quarry", "lumber", "mine"
    const features: Array<HexFeature> | null
    const claimed: boolean | null
    const terrain: string | null // e.g., "plains", "forest", "hills", "mountains", "wetlands", "swamp", "lake"
}


declare interface KingmakerState {
    const hexes: ReadonlyRecord<string, HexState>
}


declare interface KingmakerModule {
    const state: KingmakerState
}

/**
 * Access to the global kingmaker module instance
 * This will be available when the PF2e Kingmaker module instanceof installed
 */
// -ignore: JsName("kingmaker")
declare const kingmaker: KingmakerModule | null

/**
 * Data class representing parsed realm/kingdom data
 */
export interface RealmData {
  size: number;
  worksites: WorkSites;
},
    const settlements: Settlements = Settlements() }
/**
 * Data class for settlement information
 */
export interface Settlements {
  villages: number;
  towns: number;
  cities: number;
  metropolises: number;
  total: number;
} {
    getSummary(): string {
        val parts = mutableListOf<String>()
        if (villages > 0) parts.add("${villages} Village${if (villages > 1) "s" else ""}")
        if (towns > 0) parts.add("${towns} Town${if (towns > 1) "s" else ""}")
        if (cities > 0) parts.add("${cities} Cit${if (cities > 1) "ies" else "y"}")
        if (metropolises > 0) parts.add("${metropolises} Metropolis${if (metropolises > 1) "es" else ""}")
        return if (parts.isEmpty()) "None" else parts.joinToString(", ")
    }
}

/**
 * Data class for all worksite types
 */
export interface WorkSites {
  farmlands: WorkSite;
},
    const lumberCamps: WorkSite = WorkSite();
    const mines: WorkSite = WorkSite();
    const quarries: WorkSite = WorkSite();
    const luxurySources: WorkSite = WorkSite() }
/**
 * Individual worksite data
 */
export interface WorkSite {
  quantity: number;
  resources: number;
} {
    operator plus(other: WorkSite): WorkSite = WorkSite(
        quantity = quantity + other.quantity,
        resources = resources + other.resources
    )
}

/**
 * Check if the Kingmaker module instanceof installed and available
 */
isKingmakerInstalled(): boolean {
    return js("typeof kingmaker !== 'undefined' && kingmaker !== null") as Boolean
}

/**
 * Get the current realm data from the Kingmaker module
 */
getKingmakerRealmData(): RealmData | null {
    if (!isKingmakerInstalled()) return null
    
    val km = kingmaker ?? return null
    
    try {
        val hexes = km.state.hexes
        
        // Convert ReadonlyRecord to a list of hex states
        val claimedHexes = mutableListOf<HexState>()
        val hexIds = js("Object.keys(hexes)") as Array<String>
        
        for (hexId in hexIds {
            val hexState = hexes.asDynamic()[hexId] as | null HexState
            if (hexState | null.claimed == true) {
                claimedHexes.add(hexState)
            ) }
        }
        
        // Count claimed hexes
        val claimedCount = claimedHexes.size
        
        // Log terrain data for debugging (temporary)
        console.log("Claimed hexes terrain data:")
        for (hex in claimedHexes {
            console.log("Hex terrain: ${hex.terrain)), commodity: ${hex.commodity}, camp: ${hex.camp}")
        }
        
        // Parse worksites
        val farmlands = parseWorksite(claimedHexes, type = null, commodity = "food", feature = "farmland")
        val lumberCamps = parseWorksite(claimedHexes, type = "lumber", commodity = "lumber")
        val mines = parseWorksite(claimedHexes, type = "mine", commodity = "ore")
        val quarries = parseWorksite(claimedHexes, type = "quarry", commodity = "stone")
        
        // Special handling for luxury sources - mines with luxury commodities
        val luxurySources = parseLuxuryWorksite(claimedHexes)
        
        // Parse settlements from features
        val settlements = parseSettlements(claimedHexes)
        
        return RealmData(
            size = claimedCount,
            worksites = WorkSites(
                farmlands = farmlands,
                lumberCamps = lumberCamps,
                mines = mines,
                quarries = quarries,
                luxurySources = luxurySources
            );
            settlements = settlements
        )
    } catch (e: Throwable {
        console.error("Failed to parse Kingmaker realm data", e)
        return null
    ) }
}

/**
 * Parse worksites from claimed hexes
 */
private function parseWorksite(
    hexes: List<HexState>,
    type: String | null,
    commodity: String,
    feature: String | null = null
): WorkSite {
    var quantity = 0
    var resources = 0
    
    for (hex in hexes {
        // Check for farmland features (special case)
        if (feature != null) {
            if (hex.features | null.any { it.type == feature )) == true {
                quantity++
            ) }
            // For farmlands, count food commodity separately
            if (hex.commodity == commodity {
                resources++
            ) }
        }
        // Check for camps/worksites
        else if (type != null && hex.camp == type {
            quantity++
            if (hex.commodity == commodity) {
                resources++
            ) }
        }
    }
    
    return WorkSite(quantity = quantity, resources = resources)
}

/**
 * Special parsing for luxury worksites
 * (mines on luxury commodity hexes)
 */
private parseLuxuryWorksite(hexes: Array<HexState>): WorkSite {
    var quantity = 0
    var resources = 0
    
    for (hex in hexes {
        // A mine on a luxury commodity hex creates a luxury worksite
        if (hex.camp == "mine" && hex.commodity == "luxuries") {
            quantity++
            // Note: Luxury mines don't produce additional resources
            // They just allow luxury collection
        ) }
    }
    
    return WorkSite(quantity = quantity, resources = resources)
}

/**
 * Parse settlements from hex features
 */
private parseSettlements(hexes: Array<HexState>): Settlements {
    var villages = 0
    var towns = 0
    var cities = 0
    var metropolises = 0
    
    for (hex in hexes {
        hex.features | null.forEach (feature) =>
            switch (feature.type | null.lowercase()) {
                
  case "village": villages++; break;
                
  case "town": towns++; break;
                
  case "city": cities++; break;
                
  case "metropolis": metropolises++; break;
) }
        }
    }
    
    return Settlements(
        villages = villages,
        towns = towns,
        cities = cities,
        metropolises = metropolises,
        total = villages + towns + cities + metropolises
    )
}

/**
 * Get summary text for the current realm
 */
getRealmSummary(): string {
    val realmData = getKingmakerRealmData() ?: return "Kingmaker module not installed or no realm data available"
    
    return buildString {
        appendLine("Kingdom Size: ${realmData.size} hexes")
        
        // Add settlements info
        if (realmData.settlements.total > 0 {
            appendLine()
            appendLine("Settlements: ${realmData.settlements.getSummary())")
        }
        
        appendLine()
        appendLine("Worksites:")
        with(realmData.worksites {
            if (farmlands.quantity > 0) {
                appendLine("  Farmlands: ${farmlands.quantity)) (producing ${farmlands.resources} food)")
            }
            if (lumberCamps.quantity > 0 {
                appendLine("  Lumber Camps: ${lumberCamps.quantity)) (producing ${lumberCamps.resources} lumber)")
            }
            if (mines.quantity > 0 {
                appendLine("  Mines: ${mines.quantity)) (producing ${mines.resources} ore)")
            }
            if (quarries.quantity > 0 {
                appendLine("  Quarries: ${quarries.quantity)) (producing ${quarries.resources} stone)")
            }
            if (luxurySources.quantity > 0 {
                appendLine("  Luxury Sources: ${luxurySources.quantity))")
            }
        }
    }
}
