package at.posselt.pfrpg2e.kingdom.managers

import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.KingdomData
import at.posselt.pfrpg2e.kingdom.data.*
import at.posselt.pfrpg2e.kingdom.incidents.UnrestIncidents
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.data.kingdom.settlements.SettlementType
import com.foundryvtt.core.Game
import at.posselt.pfrpg2e.utils.buildPromise
import at.posselt.pfrpg2e.utils.postChatMessage
import at.posselt.pfrpg2e.utils.t
import js.objects.recordOf
import kotlin.math.max

/**
 * Manages unrest incidents and passive unrest accumulation for the kingdom.
 * Handles incident checks, passive unrest calculation, and incident resolution.
 */
class UnrestIncidentManager(private val game: Game) {
    
    /**
     * Calculates passive unrest from kingdom conditions.
     * Called at the start of each turn to determine automatic unrest increases.
     */
    fun calculatePassiveUnrest(kingdom: KingdomData): PassiveUnrestSources {
        // Count hexes controlled by the kingdom
        val hexCount = kingdom.size
        
        // Count metropolises (settlements at level 8+)
        val metropolisCount = kingdom.settlements.count { settlement ->
            val scene = game.scenes.get(settlement.sceneId)
            scene?.let {
                // Check if it's a metropolis (level 8+)
                settlement.level >= 8
            } ?: false
        }
        
        return PassiveUnrestSources.calculate(
            atWar = kingdom.atWar,
            hexCount = hexCount,
            metropolisCount = metropolisCount
        )
    }
    
    /**
     * Determines the current unrest tier based on unrest value.
     */
    fun determineUnrestTier(unrest: Int): UnrestTier {
        return UnrestTier.fromUnrest(unrest)
    }
    
    /**
     * Checks for and rolls an unrest incident based on current tier.
     * Returns the incident if one occurs, null otherwise.
     */
    suspend fun checkForIncident(
        actor: KingdomActor,
        unrest: Int
    ): UnrestIncident? {
        val tier = determineUnrestTier(unrest)
        
        // No incidents in Stable tier
        if (tier == UnrestTier.STABLE) {
            return null
        }
        
        // Roll for incident
        val incident = UnrestIncidents.rollForIncident(tier)
        
        // Log the result
        if (incident != null) {
            console.log("Unrest Incident Triggered: ${incident.name} (${tier.name})")
            
            // Post to chat about the incident
            val message = t(
                "kingdom.unrestIncidentTriggered",
                recordOf(
                    "incident" to incident.name,
                    "tier" to t("kingdom.unrestTier.${tier.name}"),
                    "description" to incident.description
                )
            )
            postChatMessage(message)
        } else {
            console.log("Unrest Check: No incident this turn (${tier.name})")
        }
        
        return incident
    }
    
    /**
     * Applies passive unrest to the kingdom at the start of a turn.
     * Updates the kingdom's unrest value based on passive sources.
     */
    suspend fun applyPassiveUnrest(
        actor: KingdomActor,
        passiveSources: PassiveUnrestSources
    ) {
        if (passiveSources.total > 0) {
            val kingdom = actor.getKingdom() ?: return
            val newUnrest = (kingdom.unrest + passiveSources.total).coerceAtLeast(0)
            
            // Update kingdom unrest
            kingdom.unrest = newUnrest
            actor.setKingdom(kingdom)
            
            // Create detailed message about passive unrest
            val details = mutableListOf<String>()
            if (passiveSources.fromWar > 0) {
                details.add(t("kingdom.passiveUnrest.war", recordOf("amount" to passiveSources.fromWar)))
            }
            if (passiveSources.fromTerritory > 0) {
                details.add(t("kingdom.passiveUnrest.territory", recordOf("amount" to passiveSources.fromTerritory)))
            }
            if (passiveSources.fromMetropolises > 0) {
                details.add(t("kingdom.passiveUnrest.metropolises", recordOf("amount" to passiveSources.fromMetropolises)))
            }
            
            // Post chat message about passive unrest
            val message = t(
                "kingdom.passiveUnrestAdded",
                recordOf(
                    "total" to passiveSources.total,
                    "details" to details.joinToString(", ")
                )
            )
            postChatMessage(message)
            
            // Log for debugging
            console.log("""
                Passive Unrest Added: ${passiveSources.total}
                - From War: ${passiveSources.fromWar}
                - From Territory Size: ${passiveSources.fromTerritory}
                - From Metropolises: ${passiveSources.fromMetropolises}
                New Total Unrest: $newUnrest
            """.trimIndent())
        }
    }
    
    /**
     * Processes the result of an incident resolution.
     * Applies all effects to the kingdom based on the degree of success.
     */
    suspend fun applyIncidentResult(
        actor: KingdomActor,
        incident: UnrestIncident,
        result: IncidentResolutionResult
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // Apply unrest changes
        if (result.unrestChange != 0) {
            kingdom.unrest = max(0, kingdom.unrest + result.unrestChange)
            console.log("Unrest changed by ${result.unrestChange}, new total: ${kingdom.unrest}")
        }
        
        // Apply gold loss
        if (result.goldLost > 0) {
            val actualLoss = kotlin.math.min(result.goldLost, kingdom.resourcePoints.now)
            kingdom.resourcePoints.now -= actualLoss
            
            // If not enough gold, gain unrest instead
            if (actualLoss < result.goldLost) {
                kingdom.unrest += 1
                console.log("Insufficient gold, gained 1 unrest")
            }
            console.log("Gold lost: $actualLoss")
        }
        
        // Apply food loss
        if (result.foodLost > 0) {
            val actualLoss = kotlin.math.min(result.foodLost, kingdom.commodities.now.food)
            kingdom.commodities.now.food -= actualLoss
            
            // If not enough food, gain unrest instead
            if (actualLoss < result.foodLost) {
                kingdom.unrest += 1
                console.log("Insufficient food, gained 1 unrest")
            }
            console.log("Food lost: $actualLoss")
        }
        
        // Apply fame loss
        if (result.fameLost > 0) {
            val actualLoss = kotlin.math.min(result.fameLost, kingdom.fame.now)
            kingdom.fame.now -= actualLoss
            console.log("Fame lost: $actualLoss")
        }
        
        // Apply resource losses
        result.resourcesLost.forEach { (resourceType, amount) ->
            // Resources are not stored between turns in this system
            // This would affect current turn production
            console.log("Resource $resourceType reduced by $amount this turn")
        }
        
        // Handle structure damage/destruction
        if (result.structuresDamaged.isNotEmpty() || result.structuresDestroyed.isNotEmpty()) {
            // This would need integration with structure management
            console.log("Structures damaged: ${result.structuresDamaged}")
            console.log("Structures destroyed: ${result.structuresDestroyed}")
        }
        
        // Handle worksite losses
        if (result.worksitesLost > 0) {
            // Remove random worksites
            console.log("Worksites to remove: ${result.worksitesLost}")
            // This would need integration with worksite management
        }
        
        // Handle hex losses
        if (result.hexesLost > 0) {
            kingdom.size = max(0, kingdom.size - result.hexesLost)
            console.log("Hexes lost: ${result.hexesLost}, new size: ${kingdom.size}")
        }
        
        // Handle settlement level loss
        if (result.settlementLevelLost != null) {
            val settlement = kingdom.settlements.find { it.sceneId == result.settlementLevelLost }
            if (settlement != null && settlement.level > 1) {
                settlement.level -= 1
                console.log("Settlement reduced to level ${settlement.level}")
            }
        }
        
        // Handle diplomatic changes
        result.diplomaticChanges.forEach { (faction, change) ->
            console.log("Faction $faction attitude changed by $change")
            // This would need integration with diplomatic system
        }
        
        // Handle army morale checks
        if (result.armyMoraleChecks > 0) {
            console.log("$result.armyMoraleChecks armies must make morale checks")
            // This would need integration with army management
        }
        
        // Handle prison break
        if (result.prisonBreak) {
            // Convert imprisoned unrest to regular unrest
            console.log("Prison break! Imprisoned unrest released")
            // This would need integration with imprisoned unrest tracking
        }
        
        // Post custom message if provided
        if (result.customMessage != null) {
            postChatMessage(result.customMessage)
        }
        
        // Save the updated kingdom
        actor.setKingdom(kingdom)
        
        // Post summary message
        val summaryParts = mutableListOf<String>()
        if (result.unrestChange != 0) {
            summaryParts.add(t("kingdom.unrestChanged", recordOf("amount" to result.unrestChange)))
        }
        if (result.goldLost > 0) {
            summaryParts.add(t("kingdom.goldLost", recordOf("amount" to result.goldLost)))
        }
        if (result.foodLost > 0) {
            summaryParts.add(t("kingdom.foodLost", recordOf("amount" to result.foodLost)))
        }
        if (result.fameLost > 0) {
            summaryParts.add(t("kingdom.fameLost", recordOf("amount" to result.fameLost)))
        }
        
        if (summaryParts.isNotEmpty()) {
            postChatMessage(
                t("kingdom.incidentResolved", recordOf(
                    "incident" to incident.name,
                    "effects" to summaryParts.joinToString(", ")
                ))
            )
        }
    }
    
    /**
     * Gets the current unrest penalty for kingdom checks.
     * Returns the penalty based on the current unrest tier.
     */
    fun getUnrestPenalty(unrest: Int): Int {
        val tier = determineUnrestTier(unrest)
        return tier.penalty
    }
    
    /**
     * Checks if the kingdom is in a crisis state.
     * Returns true if unrest is at Turmoil or Rebellion tier.
     */
    fun isInCrisis(unrest: Int): Boolean {
        val tier = determineUnrestTier(unrest)
        return tier == UnrestTier.MODERATE || tier == UnrestTier.MAJOR
    }
    
    /**
     * Gets a description of the current unrest state.
     * Useful for UI display and player information.
     */
    fun getUnrestDescription(unrest: Int): String {
        val tier = determineUnrestTier(unrest)
        return t(
            "kingdom.unrestStatus",
            recordOf(
                "tier" to t("kingdom.unrestTier.${tier.name}"),
                "value" to unrest,
                "penalty" to tier.penalty,
                "description" to tier.description
            )
        )
    }
}
