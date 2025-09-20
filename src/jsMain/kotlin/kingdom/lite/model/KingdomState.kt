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
    
    // Size and population
    var size: Int = 1,
    var controlDC: Int = 15,
    var consumption: Int = 0,
    var settlements: MutableList<Settlement> = mutableListOf(),
    
    // Turn tracking
    var currentTurn: Int = 1,
    var currentPhase: TurnPhase = TurnPhase.PHASE_I,
    
    // War status
    var isAtWar: Boolean = false,
    
    // Modifiers and effects
    var ongoingModifiers: MutableList<Modifier> = mutableListOf(),
    var oncePerTurnActions: MutableSet<String> = mutableSetOf()
)

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
