package at.kmlite.pfrpg2e.kingdom.data

import at.kmlite.pfrpg2e.data.kingdom.KingdomSkill
import kotlinx.serialization.Serializable
import kotlinx.serialization.Contextual

/**
 * Represents the different tiers of unrest in a kingdom.
 * Each tier has a range of unrest values, applies penalties to kingdom checks,
 * and determines which incident table to roll on.
 */
enum class UnrestTier(
    val range: IntRange,
    val penalty: Int,
    val description: String
) {
    STABLE(0..2, 0, "The kingdom is stable"),
    MINOR(3..5, -1, "Minor discontent spreads"),
    MODERATE(6..8, -2, "Significant turmoil affects the kingdom"),
    MAJOR(9..Int.MAX_VALUE, -3, "Open rebellion threatens the realm");

    companion object {
        /**
         * Determines the unrest tier based on the current unrest value.
         */
        fun fromUnrest(unrest: Int): UnrestTier {
            return values().find { unrest in it.range } ?: STABLE
        }
    }
}

/**
 * Represents a single unrest incident that can occur in the kingdom.
 * Incidents are immediate crises that must be resolved with skill checks.
 */
@Serializable
data class UnrestIncident(
    val id: String,
    val name: String,
    val tier: String, // UnrestTier name
    val description: String,
    val skillOptions: List<IncidentSkillOption>,
    @Contextual val percentileRange: IntRange? = null // For table lookup
)

/**
 * Represents a skill check option for resolving an incident.
 * Each option provides a different approach with varying consequences.
 */
@Serializable
data class IncidentSkillOption(
    val skill: String, // KingdomSkill value
    val dc: Int? = null, // null means use level-based DC
    val successEffect: String,
    val failureEffect: String,
    val criticalSuccessBonus: String? = null,
    val criticalFailureExtra: String? = null
)

/**
 * Tracks the sources of passive unrest that accumulate each turn.
 * These are automatic unrest increases from kingdom conditions.
 */
@Serializable
data class PassiveUnrestSources(
    val fromWar: Int = 0,
    val fromTerritory: Int = 0, 
    val fromMetropolises: Int = 0,
    val total: Int = 0
) {
    companion object {
        /**
         * Calculates passive unrest from various kingdom conditions.
         */
        fun calculate(
            atWar: Boolean,
            hexCount: Int,
            metropolisCount: Int
        ): PassiveUnrestSources {
            val fromWar = if (atWar) 1 else 0
            
            // Territory-based unrest (per 8 hexes)
            val fromTerritory = when {
                hexCount >= 32 -> 4
                hexCount >= 24 -> 3
                hexCount >= 16 -> 2
                hexCount >= 8 -> 1
                else -> 0
            }
            
            // Each metropolis adds 1 unrest
            val fromMetropolises = metropolisCount
            
            return PassiveUnrestSources(
                fromWar = fromWar,
                fromTerritory = fromTerritory,
                fromMetropolises = fromMetropolises,
                total = fromWar + fromTerritory + fromMetropolises
            )
        }
    }
}

/**
 * Represents the result of resolving an unrest incident.
 * Tracks the effects that need to be applied to the kingdom.
 */
@Serializable
data class IncidentResolutionResult(
    val unrestChange: Int = 0,
    val goldLost: Int = 0,
    val resourcesLost: Map<String, Int> = emptyMap(), // resource type -> amount
    val foodLost: Int = 0,
    val fameLost: Int = 0,
    val structuresDamaged: List<String> = emptyList(),
    val structuresDestroyed: List<String> = emptyList(),
    val worksitesLost: Int = 0,
    val hexesLost: Int = 0,
    val settlementLevelLost: String? = null, // settlement ID that loses a level
    val diplomaticChanges: Map<String, Int> = emptyMap(), // faction -> attitude change
    val armyMoraleChecks: Int = 0,
    val prisonBreak: Boolean = false,
    val customMessage: String? = null
)

/**
 * Tracks the current state of unrest incidents in the kingdom.
 * Used during turn processing to manage incident checks.
 */
@Serializable
data class UnrestIncidentState(
    val currentTier: String = UnrestTier.STABLE.name,
    val lastIncidentId: String? = null,
    val incidentHistory: List<String> = emptyList(), // Track recent incidents
    val pendingResolution: UnrestIncident? = null // If an incident is awaiting resolution
)

/**
 * Extension functions for working with incident data
 */
fun IncidentSkillOption.getSkill(): KingdomSkill? = 
    KingdomSkill.fromString(skill)

fun UnrestIncident.getTier(): UnrestTier? = 
    UnrestTier.valueOf(tier)

fun UnrestIncident.getSkillOptions(): List<Pair<KingdomSkill, IncidentSkillOption>> =
    skillOptions.mapNotNull { option ->
        option.getSkill()?.let { skill -> skill to option }
    }
