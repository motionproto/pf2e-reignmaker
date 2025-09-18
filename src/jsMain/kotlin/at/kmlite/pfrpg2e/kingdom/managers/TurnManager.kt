package at.kmlite.pfrpg2e.kingdom.managers

import at.kmlite.pfrpg2e.kingdom.KingdomData
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.getKingdom
import at.kmlite.pfrpg2e.kingdom.setKingdom
import at.kmlite.pfrpg2e.kingdom.getAllSettlements
import at.kmlite.pfrpg2e.kingdom.data.*
import at.kmlite.pfrpg2e.data.kingdom.settlements.SettlementType
import com.foundryvtt.core.Game

/**
 * Manages the 6-phase turn sequence for Reignmaker-lite.
 * Coordinates all phases and ensures proper flow through each turn.
 */
class TurnManager(
    private val fameManager: FameManager,
    private val unrestIncidentManager: UnrestIncidentManager,
    private val eventManager: KingdomEventsManager,
    private val resourceManager: ResourceManager
) {
    
    /**
     * The 6 phases of a kingdom turn in Reignmaker-lite.
     */
    enum class TurnPhase(val value: String, val displayName: String, val description: String) {
        PHASE_1_FAME("phase1-fame", "Gain Fame", "Gain 1 Fame automatically"),
        PHASE_2_INCIDENTS("phase2-incidents", "Apply Modifiers & Check Incidents", "Apply ongoing effects and check for unrest incidents"),
        PHASE_3_EVENTS("phase3-events", "Check for Events", "Roll for random kingdom events"),
        PHASE_4_RESOURCES("phase4-resources", "Manage Resources", "Process production, consumption, and construction"),
        PHASE_5_ACTIONS("phase5-actions", "Perform Kingdom Actions", "Each PC takes one kingdom action"),
        PHASE_6_END("phase6-end", "End of Turn", "Apply resource loss and cleanup");
        
        companion object {
            fun fromString(value: String): TurnPhase? = values().find { it.value == value }
        }
    }
    
    /**
     * Start a new kingdom turn, executing phases 1-3 automatically.
     */
    suspend fun startTurn(
        actor: KingdomActor,
        game: Game
    ): TurnStartResult {
        val kingdom = actor.getKingdom() ?: return TurnStartResult(
            success = false,
            error = "No kingdom data found"
        )
        
        // Phase 1: Gain Fame
        val phase1Result = executePhase1Fame(actor, kingdom)
        
        // Phase 2: Apply Modifiers & Check Incidents
        val phase2Result = executePhase2Incidents(actor, phase1Result.kingdom, game)
        
        // Phase 3: Check for Events  
        val phase3Result = executePhase3Events(actor, phase2Result.kingdom)
        
        // Set current phase to resources (phase 4)
        phase3Result.kingdom.currentTurnPhase = TurnPhase.PHASE_4_RESOURCES.value
        
        // Save kingdom state
        actor.setKingdom(phase3Result.kingdom)
        
        return TurnStartResult(
            success = true,
            fameGained = phase1Result.fameGained,
            passiveUnrest = phase2Result.passiveUnrest,
            incident = phase2Result.incident,
            event = phase3Result.event,
            currentPhase = TurnPhase.PHASE_4_RESOURCES
        )
    }
    
    /**
     * Execute Phase 1: Gain Fame.
     */
    private fun executePhase1Fame(
        actor: KingdomActor,
        kingdom: KingdomData
    ): Phase1Result {
        // Gain 1 Fame automatically
        kingdom.fame.now = kingdom.fame.now + 1
        
        return Phase1Result(
            kingdom = kingdom,
            fameGained = 1
        )
    }
    
    /**
     * Execute Phase 2: Apply Modifiers & Check Incidents.
     */
    private suspend fun executePhase2Incidents(
        actor: KingdomActor,
        kingdom: KingdomData,
        game: Game
    ): Phase2Result {
        // Calculate passive unrest
        val passiveUnrest = calculatePassiveUnrest(kingdom, game)
        
        // Apply passive unrest
        val updatedUnrest = (kingdom.unrest + passiveUnrest).coerceAtLeast(0)
        kingdom.unrest = updatedUnrest
        
        // Apply structure unrest reductions
        // Note: structure unrest reduction would need to be added when structure system is complete
        val settlements = kingdom.getAllSettlements(game)
        val unrestReduction = 0 // TODO: Add when structures are fully integrated
        kingdom.unrest = (kingdom.unrest - unrestReduction).coerceAtLeast(0)
        
        // Check for incidents based on unrest tier
        val incident = if (kingdom.settings.enableUnrestIncidents == true) {
            unrestIncidentManager.checkForIncident(actor, kingdom.unrest)
        } else {
            null
        }
        
        return Phase2Result(
            kingdom = kingdom,
            passiveUnrest = passiveUnrest,
            unrestReduction = unrestReduction,
            incident = incident
        )
    }
    
    /**
     * Execute Phase 3: Check for Events.
     */
    private suspend fun executePhase3Events(
        actor: KingdomActor,
        kingdom: KingdomData
    ): Phase3Result {
        if (kingdom.settings.enableKingdomEvents != true) {
            return Phase3Result(
                kingdom = kingdom,
                event = null
            )
        }
        
        // Calculate DC based on turns without event
        val baseDC = 16
        val dcReduction = kingdom.turnsWithoutEvent * 5
        val currentDC = (baseDC - dcReduction).coerceAtLeast(1)
        
        // Roll for event
        val roll = (1..20).random()
        val eventOccurs = roll >= currentDC
        
        val event = if (eventOccurs) {
            // Reset counter
            kingdom.turnsWithoutEvent = 0
            // Get random event from manager
            eventManager.selectRandomEvent(kingdom)
        } else {
            // Increment counter
            kingdom.turnsWithoutEvent++
            null
        }
        
        return Phase3Result(
            kingdom = kingdom,
            event = event,
            roll = roll,
            dc = currentDC
        )
    }
    
    /**
     * Execute Phase 4: Manage Resources (automatic).
     */
    suspend fun executePhase4Resources(
        actor: KingdomActor,
        game: Game
    ): Phase4Result {
        val kingdom = actor.getKingdom() ?: return Phase4Result(
            success = false,
            error = "No kingdom data found"
        )
        
        // Check we're in the right phase
        if (kingdom.currentTurnPhase != TurnPhase.PHASE_4_RESOURCES.value) {
            return Phase4Result(
                success = false,
                error = "Not in resource management phase"
            )
        }
        
        // Get settlement and army information
        val settlements = kingdom.getAllSettlements(game)
        val settlementInfo = settlements.allSettlements.map { settlement ->
            // Determine tier based on level/occupiedBlocks
            val level = settlement.occupiedBlocks
            val tier = when {
                level >= 20 -> 4 // Metropolis
                level >= 10 -> 3 // City
                level >= 5 -> 2  // Town
                else -> 1        // Village
            }
            val foodConsumption = when {
                level >= 20 -> 12 // Metropolis
                level >= 10 -> 8  // City
                level >= 5 -> 4   // Town
                else -> 1         // Village
            }
            SettlementResourceInfo(
                id = settlement.id,
                name = settlement.name,
                tier = tier,
                foodConsumption = foodConsumption
            )
        }
        
        // TODO: Get army information when army system is migrated
        val armyInfo = emptyList<ArmyResourceInfo>()
        
        // Process resources
        val result = resourceManager.processResourcePhase(
            worksites = kingdom.worksites,
            commodities = kingdom.commodities.now,
            gold = kingdom.gold,
            storageBuildings = kingdom.storageBuildings,
            constructionProject = kingdom.constructionQueue,
            settlements = settlementInfo,
            armies = armyInfo
        )
        
        // Update kingdom with results
        kingdom.commodities.now = result.commodities
        kingdom.constructionQueue = result.constructionProject
        kingdom.unrest = (kingdom.unrest + result.unrestIncrease).coerceAtLeast(0)
        
        // Move to actions phase
        kingdom.currentTurnPhase = TurnPhase.PHASE_5_ACTIONS.value
        
        // Save kingdom state
        actor.setKingdom(kingdom)
        
        return Phase4Result(
            success = true,
            production = result.production,
            consumption = result.consumption,
            foodShortage = result.foodShortage,
            unrestIncrease = result.unrestIncrease,
            constructionCompleted = result.constructionProject?.isComplete() == true
        )
    }
    
    /**
     * Execute Phase 6: End Turn.
     */
    suspend fun endTurn(
        actor: KingdomActor,
        game: Game
    ): TurnEndResult {
        val kingdom = actor.getKingdom() ?: return TurnEndResult(
            success = false,
            error = "No kingdom data found"
        )
        
        // Process end of turn resource loss
        val endResult = resourceManager.processEndOfTurn(
            commodities = kingdom.commodities.now,
            storageBuildings = kingdom.storageBuildings,
            gold = kingdom.gold
        )
        
        // Update kingdom
        kingdom.commodities.now = endResult.commodities
        kingdom.gold = endResult.gold
        
        // Reset fame (doesn't carry over)
        kingdom.fame.now = 0
        
        // Tick down temporary modifiers
        kingdom.modifiers = kingdom.modifiers.mapNotNull { modifier ->
            val turns = modifier.turns
            when {
                turns == null || turns == 0 -> modifier // Permanent
                turns == 1 -> null // Expires
                else -> RawModifier.copy(modifier, newTurns = turns - 1)
            }
        }.toTypedArray()
        
        // Clear current phase (between turns)
        kingdom.currentTurnPhase = null
        
        // Save kingdom state
        actor.setKingdom(kingdom)
        
        return TurnEndResult(
            success = true,
            resourcesLost = endResult.resourcesLost
        )
    }
    
    /**
     * Calculate passive unrest from various sources.
     */
    private fun calculatePassiveUnrest(
        kingdom: KingdomData,
        game: Game
    ): Int {
        var unrest = 0
        
        // At war
        if (kingdom.atWar) {
            unrest += 1
        }
        
        // Territory size
        val hexCount = kingdom.size
        unrest += when {
            hexCount >= 32 -> 4
            hexCount >= 24 -> 3
            hexCount >= 16 -> 2
            hexCount >= 8 -> 1
            else -> 0
        }
        
        // Each metropolis (level 20+)
        val settlements = kingdom.getAllSettlements(game)
        val metropolisCount = settlements.allSettlements.count { 
            it.occupiedBlocks >= 20
        }
        unrest += metropolisCount
        
        return unrest
    }
    
    /**
     * Get the current unrest tier and associated penalties.
     */
    fun getUnrestTier(unrest: Int): UnrestTier {
        return when {
            unrest >= 9 -> UnrestTier.REBELLION
            unrest >= 6 -> UnrestTier.TURMOIL
            unrest >= 3 -> UnrestTier.DISCONTENT
            else -> UnrestTier.STABLE
        }
    }
    
    /**
     * Check if a specific phase has been completed.
     */
    fun isPhaseComplete(kingdom: KingdomData, phase: TurnPhase): Boolean {
        val currentPhase = kingdom.currentTurnPhase?.let { TurnPhase.fromString(it) }
            ?: return false
        
        return currentPhase.ordinal > phase.ordinal
    }
    
    /**
     * Get the next required phase.
     */
    fun getNextPhase(kingdom: KingdomData): TurnPhase? {
        val currentPhase = kingdom.currentTurnPhase?.let { TurnPhase.fromString(it) }
        
        return when (currentPhase) {
            null -> TurnPhase.PHASE_1_FAME
            TurnPhase.PHASE_1_FAME -> TurnPhase.PHASE_2_INCIDENTS
            TurnPhase.PHASE_2_INCIDENTS -> TurnPhase.PHASE_3_EVENTS
            TurnPhase.PHASE_3_EVENTS -> TurnPhase.PHASE_4_RESOURCES
            TurnPhase.PHASE_4_RESOURCES -> TurnPhase.PHASE_5_ACTIONS
            TurnPhase.PHASE_5_ACTIONS -> TurnPhase.PHASE_6_END
            TurnPhase.PHASE_6_END -> null
        }
    }
}

/**
 * Unrest tiers with associated penalties.
 */
enum class UnrestTier(val displayName: String, val range: String, val penalty: Int) {
    STABLE("Stable", "0-2", 0),
    DISCONTENT("Discontent", "3-5", -1),
    TURMOIL("Turmoil", "6-8", -2),
    REBELLION("Rebellion", "9+", -3);
}

/**
 * Result of starting a new turn.
 */
data class TurnStartResult(
    val success: Boolean,
    val error: String? = null,
    val fameGained: Int = 0,
    val passiveUnrest: Int = 0,
    val incident: UnrestIncident? = null,
    val event: KingdomEvent? = null,
    val currentPhase: TurnManager.TurnPhase? = null
)

/**
 * Phase 1 result.
 */
private data class Phase1Result(
    val kingdom: KingdomData,
    val fameGained: Int
)

/**
 * Phase 2 result.
 */
private data class Phase2Result(
    val kingdom: KingdomData,
    val passiveUnrest: Int,
    val unrestReduction: Int,
    val incident: UnrestIncident?
)

/**
 * Phase 3 result.
 */
private data class Phase3Result(
    val kingdom: KingdomData,
    val event: KingdomEvent?,
    val roll: Int = 0,
    val dc: Int = 0
)

/**
 * Phase 4 resource management result.
 */
data class Phase4Result(
    val success: Boolean,
    val error: String? = null,
    val production: RawResourceYield? = null,
    val consumption: ResourceConsumption? = null,
    val foodShortage: Boolean = false,
    val unrestIncrease: Int = 0,
    val constructionCompleted: Boolean = false
)

/**
 * Result of ending a turn.
 */
data class TurnEndResult(
    val success: Boolean,
    val error: String? = null,
    val resourcesLost: ResourceLoss? = null
)



/**
 * Extension to copy RawModifier with updated turns.
 */
object RawModifier {
    fun copy(modifier: at.kmlite.pfrpg2e.kingdom.RawModifier, newTurns: Int?): at.kmlite.pfrpg2e.kingdom.RawModifier {
        return object : at.kmlite.pfrpg2e.kingdom.RawModifier {
            override var id = modifier.id
            override var type = modifier.type
            override var buttonLabel = modifier.buttonLabel
            override var value = modifier.value
            override var valueExpression = modifier.valueExpression
            override var name = modifier.name
            override var enabled = modifier.enabled
            override var turns = newTurns // Updated value
            override var isConsumedAfterRoll = modifier.isConsumedAfterRoll
            override var rollOptions = modifier.rollOptions
            override var applyIf = modifier.applyIf
            override var fortune = modifier.fortune
            override var rollTwiceKeepLowest = modifier.rollTwiceKeepLowest
            override var rollTwiceKeepHighest = modifier.rollTwiceKeepHighest
            override var upgradeResults = modifier.upgradeResults
            override var downgradeResults = modifier.downgradeResults
            override var notes = modifier.notes
            override var requiresTranslation = modifier.requiresTranslation
            override var selector = modifier.selector
        }
    }
}
