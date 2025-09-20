package kingdom.lite.model

/**
 * Represents the current state of a kingdom
 */
data class KingdomState(
    // Core attributes
    var economy: Int = 0,
    var stability: Int = 0,
    var culture: Int = 0,
    var loyalty: Int = 0,
    
    // Resources
    var unrest: Int = 0,
    var imprisonedUnrest: Int = 0,  // Unrest that is stored and excluded from the sum
    var fame: Int = 0,
    var resources: MutableMap<String, Int> = mutableMapOf(
        "food" to 0,
        "lumber" to 0,
        "stone" to 0,
        "ore" to 0,
        "gold" to 0
    ),
    
    // Territory and production - always kept up to date
    var hexes: MutableList<Hex> = mutableListOf(),
    var size: Int = 0,  // Total number of claimed hexes
    var controlDC: Int = 15,
    var consumption: Int = 0,
    var settlements: MutableList<Settlement> = mutableListOf(),
    
    // Worksite counts - always kept in sync with hexes
    var worksiteCount: MutableMap<String, Int> = mutableMapOf(
        "farmlands" to 0,
        "lumberCamps" to 0,
        "quarries" to 0,
        "mines" to 0,
        "bogMines" to 0,
        "huntingCamps" to 0
    ),
    
    // Military
    var armies: MutableList<Army> = mutableListOf(),
    
    // Construction
    var buildQueue: MutableList<BuildProject> = mutableListOf(),
    
    // Turn tracking
    var currentTurn: Int = 1,
    var currentPhase: TurnPhase = TurnPhase.PHASE_I,
    var phaseStepsCompleted: MutableMap<String, Boolean> = mutableMapOf(),
    
    // War status
    var isAtWar: Boolean = false,
    
    // Modifiers and effects
    var ongoingModifiers: MutableList<Modifier> = mutableListOf(),
    var oncePerTurnActions: MutableSet<String> = mutableSetOf()
) {
    /**
     * Calculate total resource production from all hexes with worksites
     * Includes special traits that add +1 to production
     */
    fun calculateProduction(): Map<String, Int> {
        val production = mutableMapOf<String, Int>()
        hexes.forEach { hex ->
            hex.getProduction().forEach { (resource, amount) ->
                production[resource] = (production[resource] ?: 0) + amount
            }
        }
        return production
    }
    
    /**
     * Get detailed production breakdown by hex
     */
    fun getProductionByHex(): List<Pair<Hex, Map<String, Int>>> {
        return hexes.filter { it.worksite != null }
            .map { hex -> hex to hex.getProduction() }
    }
    
    /**
     * Get total food consumption for settlements and armies
     * According to Kingdom Rules:
     * - Village: 1 Food, Town: 4 Food, City: 8 Food, Metropolis: 12 Food
     * - Each army: 1 Food
     */
    fun getTotalFoodConsumption(): Int {
        val settlementFood = settlements.sumOf { it.foodConsumption }
        val armyFood = armies.size // Each army consumes 1 food
        return settlementFood + armyFood
    }
    
    /**
     * Get food consumption breakdown
     */
    fun getFoodConsumptionBreakdown(): Pair<Int, Int> {
        val settlementFood = settlements.sumOf { it.foodConsumption }
        val armyFood = armies.size
        return settlementFood to armyFood
    }
    
    /**
     * Get total army support capacity
     * According to Kingdom Rules:
     * - Village: 1 Army, Town: 2 Armies, City: 3 Armies, Metropolis: 4 Armies
     */
    fun getTotalArmySupport(): Int {
        return settlements.sumOf { it.armySupport }
    }
    
    /**
     * Get number of unsupported armies
     */
    fun getUnsupportedArmies(): Int {
        return maxOf(0, armies.size - getTotalArmySupport())
    }
    
    /**
     * Calculate food shortage for this turn
     */
    fun calculateFoodShortage(): Int {
        val needed = getTotalFoodConsumption()
        val available = resources["food"] ?: 0
        return maxOf(0, needed - available)
    }
    
    /**
     * Process resource collection (Phase II Step 1)
     * Adds production from all hexes to kingdom resources
     */
    fun collectResources() {
        val production = calculateProduction()
        production.forEach { (resource, amount) ->
            resources[resource] = (resources[resource] ?: 0) + amount
        }
    }
    
    /**
     * Process food consumption (Phase II Step 2)
     * Returns the amount of unrest generated from shortage
     */
    fun processFoodConsumption(): Int {
        val totalNeeded = getTotalFoodConsumption()
        val currentFood = resources["food"] ?: 0
        
        return if (currentFood < totalNeeded) {
            val shortage = totalNeeded - currentFood
            resources["food"] = 0
            unrest += shortage
            shortage // Return shortage amount for reporting
        } else {
            resources["food"] = currentFood - totalNeeded
            0 // No shortage
        }
    }
    
    /**
     * Clear non-storable resources at end of turn
     * Only Food and Gold can be stored between turns
     */
    fun clearNonStorableResources() {
        resources["lumber"] = 0
        resources["stone"] = 0
        resources["ore"] = 0
    }
    
    /**
     * Check if a phase step has been completed
     */
    fun isPhaseStepCompleted(stepId: String): Boolean {
        return phaseStepsCompleted[stepId] == true
    }
    
    /**
     * Mark a phase step as completed
     */
    fun markPhaseStepCompleted(stepId: String) {
        phaseStepsCompleted[stepId] = true
    }
    
    /**
     * Reset phase steps for a new turn
     */
    fun resetPhaseSteps() {
        phaseStepsCompleted.clear()
    }
}

/**
 * Represents a settlement in the kingdom
 */
data class Settlement(
    val name: String,
    val tier: SettlementTier,
    val structures: MutableList<String> = mutableListOf(),
    val connectedByRoads: Boolean = false
) {
    val foodConsumption: Int
        get() = when (tier) {
            SettlementTier.VILLAGE -> 1
            SettlementTier.TOWN -> 4
            SettlementTier.CITY -> 8
            SettlementTier.METROPOLIS -> 12
        }
    
    val armySupport: Int
        get() = when (tier) {
            SettlementTier.VILLAGE -> 1
            SettlementTier.TOWN -> 2
            SettlementTier.CITY -> 3
            SettlementTier.METROPOLIS -> 4
        }
}

/**
 * Settlement tiers
 */
enum class SettlementTier(val displayName: String, val maxStructures: Int) {
    VILLAGE("Village", 2),
    TOWN("Town", 4),
    CITY("City", 8),
    METROPOLIS("Metropolis", Int.MAX_VALUE)
}

/**
 * Represents an ongoing modifier or effect
 */
data class Modifier(
    val name: String,
    val description: String,
    val effect: (KingdomState) -> Unit,
    val duration: Int = -1, // -1 for permanent, otherwise number of turns
    var remainingTurns: Int = duration
)

/**
 * Turn phases based on Reignmaker Lite rules
 */
enum class TurnPhase(val displayName: String, val description: String) {
    PHASE_I("Phase I: Kingdom Status", "Gain Fame and apply ongoing modifiers"),
    PHASE_II("Phase II: Resources", "Collect resources and manage consumption"),
    PHASE_III("Phase III: Unrest & Incidents", "Calculate unrest and resolve incidents"),
    PHASE_IV("Phase IV: Events", "Resolve kingdom events"),
    PHASE_V("Phase V: Actions", "Perform kingdom actions"),
    PHASE_VI("Phase VI: Resolution", "End of turn cleanup");
    
    fun next(): TurnPhase? {
        val phases = values()
        val currentIndex = phases.indexOf(this)
        return if (currentIndex < phases.size - 1) {
            phases[currentIndex + 1]
        } else {
            null // End of turn
        }
    }
}
