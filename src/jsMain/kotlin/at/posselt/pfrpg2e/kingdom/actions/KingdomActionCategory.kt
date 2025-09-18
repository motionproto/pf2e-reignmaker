package at.posselt.pfrpg2e.kingdom.actions

/**
 * Categories for kingdom actions in Reignmaker-lite.
 * Each PC can take one action per turn from any category.
 */
enum class KingdomActionCategory(
    val value: String,
    val displayName: String,
    val description: String
) {
    UPHOLD_STABILITY(
        "uphold-stability",
        "Uphold Stability",
        "Maintain the kingdom's cohesion by resolving crises and quelling unrest"
    ),
    MILITARY_OPERATIONS(
        "military-operations",
        "Military Operations",
        "War must be waged with steel and strategy"
    ),
    EXPAND_BORDERS(
        "expand-borders",
        "Expand the Borders",
        "Seize new territory to grow your influence and resources"
    ),
    URBAN_PLANNING(
        "urban-planning",
        "Urban Planning",
        "Your people need places to live, work, trade, and worship"
    ),
    FOREIGN_AFFAIRS(
        "foreign-affairs",
        "Foreign Affairs",
        "No kingdom stands alone"
    ),
    ECONOMIC_ACTIONS(
        "economic-actions",
        "Economic Actions",
        "Manage trade and personal wealth"
    );
    
    companion object {
        fun fromString(value: String): KingdomActionCategory? =
            values().find { it.value == value }
    }
}

/**
 * Extended interface for categorized kingdom actions.
 * Builds on PlayerSkillActionHandler with category support.
 */
interface CategorizedKingdomAction : PlayerSkillActionHandler {
    /**
     * The category this action belongs to.
     */
    val category: KingdomActionCategory
    
    /**
     * Whether this action can only be taken once per turn.
     * Marked with # in the rules.
     */
    val oncePerTurn: Boolean
        get() = false
    
    /**
     * Whether this action gets +1 circumstance bonus when taken from the capital.
     */
    val capitalBonus: Boolean
        get() = true
    
    /**
     * The PC skills that can be used for this action.
     * Empty list means no skill check required.
     */
    val applicableSkills: List<PCSkill>
        get() = emptyList()
    
    /**
     * Base DC for the action (before level adjustment).
     * Null means no check required or variable DC.
     */
    val baseDC: Int?
        get() = null
}

/**
 * PC skills that can be used for kingdom actions.
 * Replaces kingdom skills in the new system.
 */
enum class PCSkill(
    val value: String,
    val displayName: String,
    val attribute: String
) {
    // Core Skills
    ACROBATICS("acrobatics", "Acrobatics", "dexterity"),
    ARCANA("arcana", "Arcana", "intelligence"),
    ATHLETICS("athletics", "Athletics", "strength"),
    CRAFTING("crafting", "Crafting", "intelligence"),
    DECEPTION("deception", "Deception", "charisma"),
    DIPLOMACY("diplomacy", "Diplomacy", "charisma"),
    INTIMIDATION("intimidation", "Intimidation", "charisma"),
    MEDICINE("medicine", "Medicine", "wisdom"),
    NATURE("nature", "Nature", "wisdom"),
    OCCULTISM("occultism", "Occultism", "intelligence"),
    PERFORMANCE("performance", "Performance", "charisma"),
    RELIGION("religion", "Religion", "wisdom"),
    SOCIETY("society", "Society", "intelligence"),
    STEALTH("stealth", "Stealth", "dexterity"),
    SURVIVAL("survival", "Survival", "wisdom"),
    THIEVERY("thievery", "Thievery", "dexterity"),
    
    // Special
    PERCEPTION("perception", "Perception", "wisdom"),
    LORE("lore", "Lore", "intelligence");
    
    companion object {
        fun fromString(value: String): PCSkill? =
            values().find { it.value == value }
    }
}

/**
 * Result of a kingdom action check.
 */
data class KingdomActionResult(
    val success: Boolean,
    val degreeOfSuccess: DegreeOfSuccess,
    val roll: Int,
    val dc: Int,
    val skill: PCSkill,
    val capitalBonus: Boolean = false,
    val message: String? = null
)

/**
 * Degree of success for kingdom action checks.
 */
enum class DegreeOfSuccess {
    CRITICAL_SUCCESS,
    SUCCESS,
    FAILURE,
    CRITICAL_FAILURE;
    
    companion object {
        fun fromRollAndDC(roll: Int, dc: Int): DegreeOfSuccess {
            return when {
                roll >= dc + 10 -> CRITICAL_SUCCESS
                roll >= dc -> SUCCESS
                roll <= dc - 10 -> CRITICAL_FAILURE
                else -> FAILURE
            }
        }
    }
}

/**
 * Base class for kingdom actions with common functionality.
 */
abstract class BaseKingdomAction : CategorizedKingdomAction {
    /**
     * Calculate the actual DC based on party level.
     */
    protected fun calculateDC(partyLevel: Int, baseDC: Int? = this.baseDC): Int? {
        if (baseDC == null) return null
        
        // Level-based DC progression
        // This is a simplified version - should use actual PF2e DC table
        return when (partyLevel) {
            1 -> baseDC
            2 -> baseDC + 1
            3 -> baseDC + 2
            4 -> baseDC + 3
            5 -> baseDC + 4
            6 -> baseDC + 5
            7 -> baseDC + 6
            8 -> baseDC + 7
            9 -> baseDC + 8
            10 -> baseDC + 9
            else -> baseDC + 9 + ((partyLevel - 10) / 2)
        }
    }
    
    /**
     * Get a description of the player skills for this action.
     */
    override fun getPlayerSkillsDescription(): String? {
        if (applicableSkills.isEmpty()) {
            return "This action does not require a skill check."
        }
        
        val skillNames = applicableSkills.joinToString(", ") { it.displayName }
        return "This action can be resolved using: $skillNames"
    }
}
