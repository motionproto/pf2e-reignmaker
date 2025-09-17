package at.posselt.pfrpg2e.kingdom.data

import kotlinx.serialization.Serializable

/**
 * Categories of kingdom actions that players can perform
 */
enum class PlayerActionCategory(val displayName: String) {
    STABILITY("Uphold Stability"),
    MILITARY("Military Operations"),
    BORDERS("Expand the Borders"),
    URBAN("Urban Planning"),
    FOREIGN("Foreign Affairs"),
    ECONOMIC("Economic & Resource Actions");
    
    companion object {
        fun fromString(value: String): PlayerActionCategory? {
            return values().find { it.name.equals(value, ignoreCase = true) }
        }
    }
}

/**
 * Standard PF2e skills that can be used for kingdom actions
 */
enum class PlayerSkill(val displayName: String) {
    ACROBATICS("Acrobatics"),
    ARCANA("Arcana"),
    ATHLETICS("Athletics"),
    CRAFTING("Crafting"),
    DECEPTION("Deception"),
    DIPLOMACY("Diplomacy"),
    INTIMIDATION("Intimidation"),
    MEDICINE("Medicine"),
    NATURE("Nature"),
    OCCULTISM("Occultism"),
    PERFORMANCE("Performance"),
    RELIGION("Religion"),
    SOCIETY("Society"),
    STEALTH("Stealth"),
    SURVIVAL("Survival"),
    THIEVERY("Thievery"),
    WARFARE_LORE("Warfare Lore"),
    MERCANTILE_LORE("Mercantile Lore");
    
    companion object {
        fun fromString(value: String): PlayerSkill? {
            // Handle both hyphenated and underscored versions
            val normalized = value.replace("-", "_").uppercase()
            return values().find { it.name == normalized }
        }
    }
}

/**
 * Represents a player skill option for performing an action
 */
@Serializable
data class PlayerSkillOption(
    val skill: String, // PlayerSkill name
    val description: String, // How this skill applies to the action
    val circumstanceBonus: Int? = null // Optional bonus when using this skill
)

/**
 * Resources involved in kingdom actions
 */
@Serializable
data class ResourceCost(
    val gold: Int? = null,
    val lumber: Int? = null,
    val stone: Int? = null,
    val ore: Int? = null,
    val food: Int? = null,
    val luxuries: Int? = null
)

/**
 * Requirements for performing an action
 */
@Serializable
data class ActionRequirement(
    val type: String, // "structure", "settlement", "hex", "ally", "troop", "worksite"
    val details: String // Specific requirement details
)

/**
 * Limitations on how often or when an action can be performed
 */
@Serializable
data class ActionLimitations(
    val oncePerTurn: Boolean = false,
    val maxParticipants: Int? = null,
    val endOfTurnOnly: Boolean = false
)

/**
 * Rules for Coordinated Effort
 */
@Serializable
data class CoordinatedEffort(
    val available: Boolean = false,
    val bonus: Int = 1
)

/**
 * How proficiency affects the action's outcomes
 */
@Serializable
data class ProficiencyScaling(
    val trained: String? = null,
    val expert: String? = null,
    val master: String? = null,
    val legendary: String? = null
)

/**
 * Effects of a specific outcome degree
 */
@Serializable
data class ActionEffect(
    val description: String,
    val unrest: Int? = null,
    val resources: ResourceCost? = null,
    val special: String? = null
)

/**
 * All possible outcomes of an action
 */
@Serializable
data class ActionEffects(
    val criticalSuccess: ActionEffect,
    val success: ActionEffect,
    val failure: ActionEffect,
    val criticalFailure: ActionEffect
)

/**
 * Represents a complete player action that can be performed in the kingdom
 */
@Serializable
data class PlayerAction(
    val id: String,
    val name: String,
    val category: String, // PlayerActionCategory name
    val description: String,
    val availability: String? = null,
    val skills: List<PlayerSkillOption>,
    val failureCausesUnrest: Boolean = false,
    val cost: ResourceCost? = null,
    val requirements: List<ActionRequirement>? = null,
    val limitations: ActionLimitations? = null,
    val coordinatedEffort: CoordinatedEffort? = null,
    val proficiencyScaling: ProficiencyScaling? = null,
    val effects: ActionEffects
)

/**
 * Extension functions for working with action data
 */
fun PlayerSkillOption.getSkill(): PlayerSkill? = 
    PlayerSkill.fromString(skill)

fun PlayerAction.getCategory(): PlayerActionCategory? = 
    PlayerActionCategory.fromString(category)

fun PlayerAction.getAvailableSkills(): List<Pair<PlayerSkill, PlayerSkillOption>> =
    skills.mapNotNull { option ->
        option.getSkill()?.let { skill -> skill to option }
    }

fun PlayerAction.canBeCoordinated(): Boolean =
    coordinatedEffort?.available == true

fun PlayerAction.getCoordinationBonus(): Int =
    coordinatedEffort?.bonus ?: 0

fun PlayerAction.requiresEndOfTurn(): Boolean =
    limitations?.endOfTurnOnly == true

fun PlayerAction.isOncePerTurn(): Boolean =
    limitations?.oncePerTurn == true

fun PlayerAction.getMaxParticipants(): Int =
    limitations?.maxParticipants ?: Int.MAX_VALUE

/**
 * Calculates the effective DC based on proficiency level
 * This can be used to adjust DCs based on player proficiency
 */
fun PlayerAction.getEffectForProficiency(
    proficiency: String
): String? {
    return when(proficiency.lowercase()) {
        "trained" -> proficiencyScaling?.trained
        "expert" -> proficiencyScaling?.expert
        "master" -> proficiencyScaling?.master
        "legendary" -> proficiencyScaling?.legendary
        else -> null
    }
}
