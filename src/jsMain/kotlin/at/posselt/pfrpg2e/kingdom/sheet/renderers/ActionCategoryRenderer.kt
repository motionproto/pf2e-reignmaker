package at.posselt.pfrpg2e.kingdom.sheet.renderers

import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.actions.PCSkill
import at.posselt.pfrpg2e.kingdom.actions.CategorizedKingdomAction
import at.posselt.pfrpg2e.utils.t
import kotlinx.js.JsPlainObject

/**
 * Context for displaying kingdom actions organized by category
 */
@JsPlainObject
external interface ActionCategoriesContext {
    val categories: Array<ActionCategoryContext>
    val hasActions: Boolean
}

@JsPlainObject
external interface ActionCategoryContext {
    val categoryId: String
    val categoryName: String
    val categoryDescription: String
    val actions: Array<KingdomActionContext>
    val isExpanded: Boolean
}

@JsPlainObject
external interface KingdomActionContext {
    val actionId: String
    val actionName: String
    val description: String
    val applicableSkills: Array<PCSkillContext>
    val oncePerTurn: Boolean
    val capitalBonus: Boolean
    val baseDC: Int?
}

@JsPlainObject
external interface PCSkillContext {
    val skillId: String
    val skillName: String
    val attribute: String
}

/**
 * Renderer for kingdom actions organized by category.
 * Displays PC skill-based actions in Reignmaker-lite system.
 */
class ActionCategoryRenderer {
    
    /**
     * Creates context for action categories display
     */
    fun createCategoriesContext(
        actions: List<CategorizedKingdomAction>,
        expandedCategories: Set<String> = emptySet()
    ): ActionCategoriesContext {
        // Group actions by category
        val actionsByCategory = actions.groupBy { it.category }
        
        val categoryContexts = KingdomActionCategory.values().map { category ->
            val categoryActions = actionsByCategory[category] ?: emptyList()
            
            ActionCategoryContext(
                categoryId = category.value,
                categoryName = category.displayName,
                categoryDescription = category.description,
                actions = categoryActions.map { action ->
                    KingdomActionContext(
                        actionId = action.id,
                        actionName = action.displayName,
                        description = action.description ?: "",
                        applicableSkills = action.applicableSkills.map { skill ->
                            PCSkillContext(
                                skillId = skill.value,
                                skillName = skill.displayName,
                                attribute = skill.attribute
                            )
                        }.toTypedArray(),
                        oncePerTurn = action.oncePerTurn,
                        capitalBonus = action.capitalBonus,
                        baseDC = action.baseDC
                    )
                }.toTypedArray(),
                isExpanded = category.value in expandedCategories
            )
        }.filter { it.actions.isNotEmpty() }.toTypedArray()
        
        return ActionCategoriesContext(
            categories = categoryContexts,
            hasActions = categoryContexts.isNotEmpty()
        )
    }
    
    /**
     * Generates HTML for the action categories display
     */
    fun generateCategoriesHtml(context: ActionCategoriesContext): String {
        if (!context.hasActions) {
            return """
                <div class="km-action-categories">
                    <h3 class="km-section-header">${t("kingdom.kingdomActions")}</h3>
                    <div class="km-actions-empty">
                        ${t("kingdom.noActionsAvailable")}
                    </div>
                </div>
            """.trimIndent()
        }
        
        val categoriesHtml = context.categories.joinToString("\n") { category ->
            generateCategoryHtml(category)
        }
        
        return """
            <div class="km-action-categories">
                <h3 class="km-section-header">${t("kingdom.kingdomActions")}</h3>
                <div class="km-categories-list">
                    $categoriesHtml
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates HTML for an individual action category
     */
    private fun generateCategoryHtml(category: ActionCategoryContext): String {
        val expandedClass = if (category.isExpanded) "km-category-expanded" else "km-category-collapsed"
        
        return """
            <div class="km-action-category $expandedClass" data-category="${category.categoryId}">
                <div class="km-category-header" data-action="toggle-category" data-category="${category.categoryId}">
                    <span class="km-category-toggle">
                        ${if (category.isExpanded) "▼" else "▶"}
                    </span>
                    <span class="km-category-name">${category.categoryName}</span>
                    <span class="km-category-count">(${category.actions.size})</span>
                </div>
                <div class="km-category-description">${category.categoryDescription}</div>
                ${if (category.isExpanded) {
                    """<div class="km-category-actions">
                        ${category.actions.joinToString("\n") { generateActionHtml(it) }}
                    </div>"""
                } else ""}
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates HTML for an individual kingdom action
     */
    private fun generateActionHtml(action: KingdomActionContext): String {
        val skillsHtml = if (action.applicableSkills.isNotEmpty()) {
            val skills = action.applicableSkills.joinToString(", ") { skill ->
                """<span class="km-skill-tag km-skill-${skill.attribute}">${skill.skillName}</span>"""
            }
            """<div class="km-action-skills">
                <span class="km-skills-label">${t("kingdom.skills")}:</span> $skills
            </div>"""
        } else {
            """<div class="km-action-no-check">${t("kingdom.noCheckRequired")}</div>"""
        }
        
        val modifiersHtml = buildList {
            if (action.oncePerTurn) {
                add("""<span class="km-modifier km-once-per-turn">#</span>""")
            }
            if (action.capitalBonus) {
                add("""<span class="km-modifier km-capital-bonus" title="${t("kingdom.capitalBonus")}">🏛️+1</span>""")
            }
            if (action.baseDC != null) {
                add("""<span class="km-modifier km-dc">DC ${action.baseDC}</span>""")
            }
        }.joinToString(" ")
        
        return """
            <div class="km-kingdom-action" data-action-id="${action.actionId}">
                <div class="km-action-header">
                    <span class="km-action-name">${action.actionName}</span>
                    ${if (modifiersHtml.isNotBlank()) {
                        """<span class="km-action-modifiers">$modifiersHtml</span>"""
                    } else ""}
                </div>
                <div class="km-action-description">${action.description}</div>
                $skillsHtml
                <div class="km-action-buttons">
                    <button class="km-button km-button-primary" data-action="perform-action" data-action-id="${action.actionId}">
                        ${t("kingdom.performAction")}
                    </button>
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates a compact action menu for quick access
     */
    fun generateQuickActionsMenu(context: ActionCategoriesContext): String {
        val menuItems = context.categories.flatMap { category ->
            category.actions.map { action ->
                """
                <div class="km-quick-action" 
                     data-action="perform-action" 
                     data-action-id="${action.actionId}"
                     data-category="${category.categoryId}">
                    <span class="km-quick-action-category">${category.categoryName}</span>
                    <span class="km-quick-action-name">${action.actionName}</span>
                    ${if (action.oncePerTurn) {
                        """<span class="km-quick-action-once">#</span>"""
                    } else ""}
                </div>
                """
            }
        }
        
        return """
            <div class="km-quick-actions-menu">
                <h4 class="km-quick-actions-header">${t("kingdom.quickActions")}</h4>
                <div class="km-quick-actions-list">
                    ${menuItems.joinToString("\n")}
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Generates skill check interface for an action
     */
    fun generateSkillCheckInterface(action: KingdomActionContext, partyLevel: Int): String {
        if (action.applicableSkills.isEmpty()) {
            return """
                <div class="km-skill-check-interface">
                    <p>${t("kingdom.actionNoCheckRequired", mapOf("action" to action.actionName))}</p>
                    <button class="km-button km-button-primary" data-action="execute-action" data-action-id="${action.actionId}">
                        ${t("kingdom.execute")}
                    </button>
                </div>
            """.trimIndent()
        }
        
        val actualDC = action.baseDC?.let { calculateLevelDC(it, partyLevel) }
        
        val skillButtons = action.applicableSkills.joinToString("\n") { skill ->
            """
            <button class="km-skill-button km-skill-${skill.attribute}" 
                    data-action="roll-skill" 
                    data-action-id="${action.actionId}"
                    data-skill="${skill.skillId}">
                <span class="km-skill-icon">${getSkillIcon(skill.attribute)}</span>
                <span class="km-skill-name">${skill.skillName}</span>
                ${if (actualDC != null) {
                    """<span class="km-skill-dc">DC $actualDC</span>"""
                } else ""}
            </button>
            """
        }
        
        return """
            <div class="km-skill-check-interface">
                <h4>${t("kingdom.chooseSkill", mapOf("action" to action.actionName))}</h4>
                ${if (action.capitalBonus) {
                    """<p class="km-capital-bonus-note">
                        ${t("kingdom.capitalBonusAvailable")}
                    </p>"""
                } else ""}
                <div class="km-skill-buttons">
                    $skillButtons
                </div>
            </div>
        """.trimIndent()
    }
    
    /**
     * Calculate level-adjusted DC
     */
    private fun calculateLevelDC(baseDC: Int, partyLevel: Int): Int {
        // Simplified DC progression - should use actual PF2e table
        return baseDC + when (partyLevel) {
            1 -> 0
            2 -> 1
            3 -> 2
            4 -> 3
            5 -> 4
            6 -> 5
            7 -> 6
            8 -> 7
            9 -> 8
            10 -> 9
            else -> 9 + ((partyLevel - 10) / 2)
        }
    }
    
    /**
     * Get icon for skill attribute
     */
    private fun getSkillIcon(attribute: String): String {
        return when (attribute) {
            "strength" -> "💪"
            "dexterity" -> "🤸"
            "constitution" -> "❤️"
            "intelligence" -> "🧠"
            "wisdom" -> "👁️"
            "charisma" -> "✨"
            else -> "🎯"
        }
    }
}
