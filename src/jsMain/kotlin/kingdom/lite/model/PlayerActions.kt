package kingdom.lite.model

import kotlin.js.Json

/**
 * Data model for Player Actions loaded from JSON files
 */

data class SkillOption(
    val skill: String,
    val description: String
)

data class ActionEffect(
    val description: String,
    val modifiers: Map<String, Any> = emptyMap()
)

data class PlayerAction(
    val id: String,
    val name: String,
    val category: String,
    val description: String,
    val skills: List<SkillOption> = emptyList(),
    val criticalSuccess: ActionEffect,
    val success: ActionEffect,
    val failure: ActionEffect,
    val criticalFailure: ActionEffect,
    val proficiencyScaling: Map<String, Int>? = null,
    val special: String? = null,
    val cost: Map<String, Int>? = null  // For actions that have resource costs
)

object PlayerActionsData {
    // Category display names
    val categoryNames = mapOf(
        "uphold-stability" to "Uphold Stability",
        "military-operations" to "Military Operations", 
        "expand-borders" to "Expand the Borders",
        "urban-planning" to "Urban Planning",
        "foreign-affairs" to "Foreign Affairs",
        "economic-actions" to "Economic Actions"
    )
    
    val categoryDescriptions = mapOf(
        "uphold-stability" to "Maintain the kingdom's cohesion by resolving crises and quelling unrest.",
        "military-operations" to "War must be waged with steel and strategy.",
        "expand-borders" to "Seize new territory to grow your influence and resources.",
        "urban-planning" to "Your people need places to live, work, trade, and worship.",
        "foreign-affairs" to "No kingdom stands alone.",
        "economic-actions" to "Manage trade and personal wealth."
    )
    
    // Mock data for now - in production this would load from JSON files
    fun getAllActions(): List<PlayerAction> {
        // This will be replaced with actual JSON loading
        return listOf(
            // Expand Borders actions
            PlayerAction(
                id = "claim-hexes",
                name = "Claim Hexes",
                category = "expand-borders",
                description = "Assert sovereignty over new territories, expanding your kingdom's borders into unclaimed lands",
                skills = listOf(
                    SkillOption("nature", "harmonize with the land"),
                    SkillOption("survival", "establish frontier camps"),
                    SkillOption("intimidation", "force submission"),
                    SkillOption("occultism", "mystical claiming rituals"),
                    SkillOption("religion", "divine mandate")
                ),
                criticalSuccess = ActionEffect("Claim all targeted hexes +1 extra hex", mapOf("hexesClaimed" to "proficiency+1")),
                success = ActionEffect("Claim targeted hexes (based on proficiency)", mapOf("hexesClaimed" to "proficiency")),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect"),
                proficiencyScaling = mapOf("trained" to 1, "expert" to 1, "master" to 2, "legendary" to 3),
                special = "+2 circumstance bonus when claiming hexes adjacent to 3+ controlled hexes"
            ),
            PlayerAction(
                id = "build-roads",
                name = "Build Roads",
                category = "expand-borders",
                description = "Construct pathways between settlements to improve trade, travel, and military movement",
                skills = listOf(
                    SkillOption("crafting", "engineering expertise"),
                    SkillOption("survival", "pathfinding routes"),
                    SkillOption("athletics", "manual labor"),
                    SkillOption("nature", "work with terrain")
                ),
                criticalSuccess = ActionEffect("Build roads +1 hex", mapOf("roadsBuilt" to 2)),
                success = ActionEffect("Build roads", mapOf("roadsBuilt" to 1)),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect")
            ),
            PlayerAction(
                id = "send-scouts",
                name = "Send Scouts",
                category = "expand-borders",
                description = "Learn about unexplored hexes",
                skills = listOf(
                    SkillOption("survival", "wilderness navigation"),
                    SkillOption("nature", "track and explore")
                ),
                criticalSuccess = ActionEffect("Scout 2 hexes"),
                success = ActionEffect("Scout 1 hex"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect")
            ),
            PlayerAction(
                id = "fortify-hex",
                name = "Fortify Hex",
                category = "expand-borders",
                description = "Strengthen defensive positions",
                skills = listOf(
                    SkillOption("crafting", "build fortifications"),
                    SkillOption("warfare", "strategic placement")
                ),
                criticalSuccess = ActionEffect("Fortify hex with bonus"),
                success = ActionEffect("Fortify hex"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect")
            ),
            PlayerAction(
                id = "create-worksite",
                name = "Create Worksite",
                category = "expand-borders",
                description = "Establish farms, mines, quarries, or lumber camps",
                skills = listOf(
                    SkillOption("crafting", "build infrastructure"),
                    SkillOption("survival", "identify resources")
                ),
                criticalSuccess = ActionEffect("Create worksite with bonus"),
                success = ActionEffect("Create worksite"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect")
            ),
            
            // Uphold Stability actions
            PlayerAction(
                id = "coordinated-effort",
                name = "Coordinated Effort",
                category = "uphold-stability",
                description = "Two PCs work together on a single action with a bonus",
                skills = listOf(
                    SkillOption("diplomacy", "coordinate efforts"),
                    SkillOption("society", "organize teamwork")
                ),
                criticalSuccess = ActionEffect("Action succeeds with major bonus"),
                success = ActionEffect("Action succeeds with bonus"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect")
            ),
            PlayerAction(
                id = "arrest-dissidents",
                name = "Arrest Dissidents",
                category = "uphold-stability",
                description = "Convert unrest into imprisoned unrest",
                skills = listOf(
                    SkillOption("intimidation", "suppress dissent"),
                    SkillOption("society", "identify troublemakers")
                ),
                criticalSuccess = ActionEffect("Convert 2 unrest to imprisoned"),
                success = ActionEffect("Convert 1 unrest to imprisoned"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("Gain 1 unrest")
            ),
            PlayerAction(
                id = "deal-with-unrest",
                name = "Deal with Unrest",
                category = "uphold-stability",
                description = "Directly reduce unrest by 1-3 based on success",
                skills = listOf(
                    SkillOption("diplomacy", "calm the populace"),
                    SkillOption("performance", "inspire the people"),
                    SkillOption("intimidation", "quell dissent")
                ),
                criticalSuccess = ActionEffect("Reduce unrest by 3"),
                success = ActionEffect("Reduce unrest by 1"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("Gain 1 unrest")
            ),
            
            // Military Operations
            PlayerAction(
                id = "recruit-unit",
                name = "Recruit a Unit",
                category = "military-operations",
                description = "Raise new troops for your armies",
                skills = listOf(
                    SkillOption("warfare", "military recruitment"),
                    SkillOption("intimidation", "conscription")
                ),
                criticalSuccess = ActionEffect("Recruit unit with bonus"),
                success = ActionEffect("Recruit unit"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect")
            ),
            PlayerAction(
                id = "deploy-army",
                name = "Deploy Army",
                category = "military-operations",
                description = "Move troops to strategic positions",
                skills = listOf(
                    SkillOption("warfare", "tactical deployment"),
                    SkillOption("survival", "logistics")
                ),
                criticalSuccess = ActionEffect("Deploy with extra movement"),
                success = ActionEffect("Deploy army"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect")
            ),
            
            // Urban Planning
            PlayerAction(
                id = "establish-settlement",
                name = "Establish a Settlement",
                category = "urban-planning",
                description = "Found a new village",
                skills = listOf(
                    SkillOption("society", "urban planning"),
                    SkillOption("crafting", "construction")
                ),
                criticalSuccess = ActionEffect("Found village with bonus structure"),
                success = ActionEffect("Found village"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect")
            ),
            PlayerAction(
                id = "build-structure",
                name = "Build Structure",
                category = "urban-planning",
                description = "Add markets, temples, barracks, and other structures",
                skills = listOf(
                    SkillOption("crafting", "construction"),
                    SkillOption("society", "urban development")
                ),
                criticalSuccess = ActionEffect("Build with reduced cost"),
                success = ActionEffect("Build structure"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("Waste resources")
            ),
            
            // Foreign Affairs
            PlayerAction(
                id = "establish-diplomatic-relations",
                name = "Establish Diplomatic Relations",
                category = "foreign-affairs",
                description = "Form alliances with other nations",
                skills = listOf(
                    SkillOption("diplomacy", "negotiation"),
                    SkillOption("society", "cultural exchange")
                ),
                criticalSuccess = ActionEffect("Strong alliance formed"),
                success = ActionEffect("Alliance formed"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("Diplomatic incident")
            ),
            PlayerAction(
                id = "hire-adventurers",
                name = "Hire Adventurers",
                category = "foreign-affairs",
                description = "Pay gold to resolve events (2 Gold cost)",
                skills = listOf(
                    SkillOption("diplomacy", "negotiate terms"),
                    SkillOption("society", "find adventurers")
                ),
                criticalSuccess = ActionEffect("Resolve event for 1 Gold"),
                success = ActionEffect("Resolve event for 2 Gold"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("Lose 2 Gold, no effect"),
                cost = mapOf("gold" to 2)
            ),
            
            // Economic Actions
            PlayerAction(
                id = "sell-surplus",
                name = "Sell Surplus",
                category = "economic-actions",
                description = "Trade resources for gold",
                skills = listOf(
                    SkillOption("diplomacy", "trade negotiations"),
                    SkillOption("society", "market knowledge")
                ),
                criticalSuccess = ActionEffect("Sell at premium prices"),
                success = ActionEffect("Sell at market prices"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("Bad deal, lose resources")
            ),
            PlayerAction(
                id = "collect-resources",
                name = "Collect Resources",
                category = "economic-actions",
                description = "Gather from hexes with or without worksites",
                skills = listOf(
                    SkillOption("survival", "resource gathering"),
                    SkillOption("nature", "identify resources")
                ),
                criticalSuccess = ActionEffect("Collect double resources"),
                success = ActionEffect("Collect resources"),
                failure = ActionEffect("No effect"),
                criticalFailure = ActionEffect("No effect")
            )
        )
    }
    
    fun getActionsByCategory(category: String): List<PlayerAction> {
        return getAllActions().filter { it.category == category }
    }
}
