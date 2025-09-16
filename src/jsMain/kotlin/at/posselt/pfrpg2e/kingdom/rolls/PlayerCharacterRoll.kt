package at.posselt.pfrpg2e.kingdom.rolls

import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.KingdomData
import at.posselt.pfrpg2e.kingdom.data.UnrestIncident
import at.posselt.pfrpg2e.kingdom.data.IncidentSkillOption
import at.posselt.pfrpg2e.kingdom.data.IncidentResolutionResult
import at.posselt.pfrpg2e.kingdom.managers.UnrestIncidentManager
import at.posselt.pfrpg2e.kingdom.incidents.JsonIncidentLoader
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.data.checks.DegreeOfSuccess
import at.posselt.pfrpg2e.utils.postChatMessage
import at.posselt.pfrpg2e.utils.t
import at.posselt.pfrpg2e.utils.buildPromise
import com.foundryvtt.core.Game
import com.foundryvtt.core.documents.ChatMessage
import js.objects.recordOf
import kotlinx.coroutines.await
import kotlin.random.Random
import kotlin.js.Json

/**
 * Types of rolls that player characters can make for kingdom management
 */
enum class CharacterRollType(val value: String) {
    INCIDENT("incident"),      // Unrest incidents
    ACTIVITY("activity"),      // Kingdom activities
    EVENT("event"),           // Kingdom events
    SKILL("skill"),          // Direct skill checks
    EXPLORATION("exploration"), // Future: exploration checks
    DIPLOMACY("diplomacy");    // Future: diplomatic checks
    
    companion object {
        fun fromString(value: String): CharacterRollType? {
            return values().firstOrNull { it.value == value }
        }
    }
}

/**
 * Handles player character rolls for kingdom management features
 */
class PlayerCharacterRoll(
    private val game: Game,
    private val kingdomActor: KingdomActor
) {
    
    /**
     * Calculate the DC for any kingdom-related player roll
     * Universal unrest penalty applies to ALL kingdom checks
     */
    fun calculateDC(kingdom: KingdomData): String {
        val unrestPenalty = when {
            kingdom.unrest >= 15 -> 5  // Rebellion
            kingdom.unrest >= 10 -> 2  // Turmoil
            kingdom.unrest >= 5 -> 1   // Discontent
            else -> 0                   // Stable
        }
        return if (unrestPenalty > 0) {
            "@self.level+$unrestPenalty"
        } else {
            "@self.level"
        }
    }
    
    /**
     * Create an inline check link with proper metadata
     */
    fun createInlineCheck(
        skill: String,
        rollType: CharacterRollType,
        rollId: String,
        kingdom: KingdomData,
        name: String
    ): String {
        val dc = calculateDC(kingdom)
        return "@Check[type:$skill|dc:$dc|traits:player-roll,roll-$rollType|" +
               "rollOptions:roll-id:$rollId,skill:$skill|name:$name]"
    }
    
    /**
     * Process a roll result from the PF2e system
     */
    suspend fun processRollResult(
        message: ChatMessage,
        rollType: CharacterRollType,
        rollId: String,
        skill: String
    ) = buildPromise {
        val kingdom = kingdomActor.getKingdom() ?: return@buildPromise
        
        // Extract degree of success from the message
        val degree = extractDegreeOfSuccess(message)
        
        // Route to appropriate processor
        when (rollType) {
            CharacterRollType.INCIDENT -> processIncidentResult(degree, rollId, skill, kingdom)
            CharacterRollType.ACTIVITY -> processActivityResult(degree, rollId, skill, kingdom)
            CharacterRollType.EVENT -> processEventResult(degree, rollId, skill, kingdom)
            CharacterRollType.SKILL -> processSkillResult(degree, skill, kingdom)
            else -> {
                // Future implementations
            }
        }
    }
    
    /**
     * Extract degree of success from a PF2e chat message
     */
    private fun extractDegreeOfSuccess(message: ChatMessage): DegreeOfSuccess {
        // Look for degree in message flags or content
        val messageData = message.asDynamic()
        val flags = messageData?.flags
        val pf2e = flags?.pf2e
        val context = pf2e?.context
        val outcome = context?.outcome
        val degree = outcome?.degree as? String
        
        return when (degree) {
            "criticalSuccess" -> DegreeOfSuccess.CRITICAL_SUCCESS
            "success" -> DegreeOfSuccess.SUCCESS
            "failure" -> DegreeOfSuccess.FAILURE
            "criticalFailure" -> DegreeOfSuccess.CRITICAL_FAILURE
            else -> DegreeOfSuccess.FAILURE
        }
    }
    
    /**
     * Process an incident roll result
     */
    private suspend fun processIncidentResult(
        degree: DegreeOfSuccess,
        incidentId: String,
        skill: String,
        kingdom: KingdomData
    ) {
        // For now, we'll need to get incidents from a manager or pass them in
        // TODO: Implement proper incident loading
        val testIncident = UnrestIncident(
            id = incidentId,
            name = "Test Incident",
            description = "Test",
            tier = "minor",
            skillOptions = listOf(
                IncidentSkillOption(
                    skill = skill,
                    dc = null,
                    successEffect = "No effect",
                    failureEffect = "+1 unrest",
                    criticalSuccessBonus = null,
                    criticalFailureExtra = "+2 unrest"
                )
            )
        )
        
        val incident = testIncident
        val skillOption = incident.skillOptions.find { it.skill == skill } ?: return
        
        // Parse the effect based on degree of success
        val effect = when (degree) {
            DegreeOfSuccess.CRITICAL_SUCCESS -> {
                parseIncidentEffect(
                    skillOption.criticalSuccessBonus ?: skillOption.successEffect,
                    true
                )
            }
            DegreeOfSuccess.SUCCESS -> {
                parseIncidentEffect(skillOption.successEffect, false)
            }
            DegreeOfSuccess.FAILURE -> {
                parseIncidentEffect(skillOption.failureEffect, false)
            }
            DegreeOfSuccess.CRITICAL_FAILURE -> {
                parseIncidentEffect(
                    skillOption.criticalFailureExtra ?: skillOption.failureEffect,
                    false
                )
            }
        }
        
        // Apply the effects
        applyIncidentEffects(effect, kingdom, incident, degree)
    }
    
    /**
     * Parse incident effect text into resolution result
     */
    private fun parseIncidentEffect(effect: String, isCriticalSuccess: Boolean): IncidentResolutionResult {
        val result = IncidentResolutionResult()
        val effectLower = effect.lowercase()
        
        // Parse unrest changes
        when {
            effectLower.contains("+2 unrest") -> return result.copy(unrestChange = 2)
            effectLower.contains("+1 unrest") -> return result.copy(unrestChange = 1)
            effectLower.contains("-1 unrest") && isCriticalSuccess -> return result.copy(unrestChange = -1)
        }
        
        // Parse gold loss
        when {
            effectLower.contains("lose 4d6 gold") -> return result.copy(goldLost = Random.nextInt(4, 25))
            effectLower.contains("lose 3d4 gold") -> return result.copy(goldLost = Random.nextInt(3, 13))
            effectLower.contains("lose 2d6 gold") -> return result.copy(goldLost = Random.nextInt(2, 13))
            effectLower.contains("lose 2d4 gold") -> return result.copy(goldLost = Random.nextInt(2, 9))
            effectLower.contains("lose 1d4 gold") -> return result.copy(goldLost = Random.nextInt(1, 5))
        }
        
        // Parse other effects as needed...
        
        return result
    }
    
    /**
     * Apply incident effects to the kingdom
     */
    private suspend fun applyIncidentEffects(
        effect: IncidentResolutionResult,
        kingdom: KingdomData,
        incident: UnrestIncident,
        degree: DegreeOfSuccess
    ) {
        // Apply unrest change
        if (effect.unrestChange != 0) {
            kingdom.unrest = (kingdom.unrest + effect.unrestChange).coerceIn(0, 20)
            val changeText = if (effect.unrestChange > 0) {
                t("kingdom.unrestIncreased", recordOf("amount" to effect.unrestChange))
            } else {
                t("kingdom.unrestDecreased", recordOf("amount" to -effect.unrestChange))
            }
            postChatMessage(changeText)
        }
        
        // Apply gold loss
        if (effect.goldLost > 0) {
            kingdom.resourcePoints.now = (kingdom.resourcePoints.now - effect.goldLost).coerceAtLeast(0)
            postChatMessage(
                t("kingdom.goldLost", recordOf("amount" to effect.goldLost))
            )
        }
        
        // Apply food loss
        if (effect.foodLost > 0) {
            kingdom.commodities.now.food = (kingdom.commodities.now.food - effect.foodLost).coerceAtLeast(0)
            postChatMessage(
                t("kingdom.foodLost", recordOf("amount" to effect.foodLost))
            )
        }
        
        // Apply fame loss
        if (effect.fameLost > 0) {
            if (effect.fameLost >= 999) {
                // Special case - zero fame
                kingdom.fame.now = 0
                postChatMessage(t("kingdom.incident.fameZeroed"))
            } else {
                kingdom.fame.now = (kingdom.fame.now - effect.fameLost).coerceAtLeast(0)
                postChatMessage(
                    t("kingdom.fameLost", recordOf("amount" to effect.fameLost))
                )
            }
        }
        
        // Post resolution message
        val degreeText = when (degree) {
            DegreeOfSuccess.CRITICAL_SUCCESS -> t("kingdom.criticalSuccess")
            DegreeOfSuccess.SUCCESS -> t("kingdom.success")
            DegreeOfSuccess.FAILURE -> t("kingdom.failure")
            DegreeOfSuccess.CRITICAL_FAILURE -> t("kingdom.criticalFailure")
        }
        
        postChatMessage(
            """
            <div class="incident-resolution">
                <h3>${t("kingdom.incidentResolved")}: ${incident.name}</h3>
                <p><strong>${t("kingdom.result")}:</strong> $degreeText</p>
                ${effect.customMessage?.let { "<p>$it</p>" } ?: ""}
            </div>
            """.trimIndent(),
            isHtml = true
        )
        
        // Save kingdom changes
        kingdomActor.setKingdom(kingdom)
    }
    
    /**
     * Process an activity roll result
     */
    private suspend fun processActivityResult(
        degree: DegreeOfSuccess,
        activityId: String,
        skill: String,
        kingdom: KingdomData
    ) {
        // TODO: Implement activity result processing
        postChatMessage(
            t("kingdom.activityResult", recordOf(
                "activity" to activityId,
                "degree" to t(degree.value)
            ))
        )
    }
    
    /**
     * Process an event roll result
     */
    private suspend fun processEventResult(
        degree: DegreeOfSuccess,
        eventId: String,
        skill: String,
        kingdom: KingdomData
    ) {
        // TODO: Implement event result processing
        postChatMessage(
            t("kingdom.eventResult", recordOf(
                "event" to eventId,
                "degree" to t(degree.value)
            ))
        )
    }
    
    /**
     * Process a direct skill check result
     */
    private suspend fun processSkillResult(
        degree: DegreeOfSuccess,
        skill: String,
        kingdom: KingdomData
    ) {
        // TODO: Implement direct skill check result processing
        postChatMessage(
            t("kingdom.skillCheckResult", recordOf(
                "skill" to skill,
                "degree" to t(degree.value)
            ))
        )
    }
}
