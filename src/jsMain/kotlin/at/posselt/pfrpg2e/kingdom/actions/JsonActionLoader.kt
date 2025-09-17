package at.posselt.pfrpg2e.kingdom.actions

import at.posselt.pfrpg2e.kingdom.data.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.decodeFromString
import kotlin.js.JsModule
import kotlin.js.JsNonModule

/**
 * External declaration for importing the JSON data
 */
@JsModule("./player-actions.json")
@JsNonModule
external val playerActionsJson: Array<dynamic>

/**
 * Loader for player action data from JSON files.
 * Handles deserialization and provides access to all player actions.
 */
object JsonActionLoader {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }
    
    private var actions: List<PlayerAction>? = null
    private var actionsByCategory: Map<PlayerActionCategory, List<PlayerAction>>? = null
    private var actionsById: Map<String, PlayerAction>? = null
    
    /**
     * Initialize the action data by loading from JSON
     */
    fun initialize() {
        if (actions == null) {
            loadActions()
        }
    }
    
    /**
     * Load and parse all player actions from JSON
     */
    private fun loadActions() {
        val loadedActions = mutableListOf<PlayerAction>()
        
        // Convert dynamic array to JSON strings and parse
        for (i in 0 until playerActionsJson.asDynamic().length as Int) {
            try {
                val actionJson = JSON.stringify(playerActionsJson[i])
                val action = json.decodeFromString<PlayerAction>(actionJson)
                loadedActions.add(action)
            } catch (e: Exception) {
                console.error("Failed to parse player action at index $i", e)
            }
        }
        
        actions = loadedActions
        
        // Build category map
        actionsByCategory = loadedActions
            .groupBy { it.getCategory() ?: PlayerActionCategory.STABILITY }
            
        // Build ID map
        actionsById = loadedActions.associateBy { it.id }
        
        console.log("Loaded ${loadedActions.size} player actions")
    }
    
    /**
     * Get all loaded player actions
     */
    fun getAllActions(): List<PlayerAction> {
        initialize()
        return actions ?: emptyList()
    }
    
    /**
     * Get a specific action by ID
     */
    fun getActionById(id: String): PlayerAction? {
        initialize()
        return actionsById?.get(id)
    }
    
    /**
     * Get all actions in a specific category
     */
    fun getActionsByCategory(category: PlayerActionCategory): List<PlayerAction> {
        initialize()
        return actionsByCategory?.get(category) ?: emptyList()
    }
    
    /**
     * Get all actions that can be performed with a specific skill
     */
    fun getActionsBySkill(skill: PlayerSkill): List<PlayerAction> {
        initialize()
        return actions?.filter { action ->
            action.skills.any { it.getSkill() == skill }
        } ?: emptyList()
    }
    
    /**
     * Get all actions that can be coordinated
     */
    fun getCoordinatableActions(): List<PlayerAction> {
        initialize()
        return actions?.filter { it.canBeCoordinated() } ?: emptyList()
    }
    
    /**
     * Get all actions that require end of turn
     */
    fun getEndOfTurnActions(): List<PlayerAction> {
        initialize()
        return actions?.filter { it.requiresEndOfTurn() } ?: emptyList()
    }
    
    /**
     * Get all actions that are once per turn
     */
    fun getOncePerTurnActions(): List<PlayerAction> {
        initialize()
        return actions?.filter { it.isOncePerTurn() } ?: emptyList()
    }
    
    /**
     * Get all actions that cause unrest on critical failure
     */
    fun getUnrestCausingActions(): List<PlayerAction> {
        initialize()
        return actions?.filter { it.failureCausesUnrest } ?: emptyList()
    }
    
    /**
     * Search actions by name or description
     */
    fun searchActions(query: String): List<PlayerAction> {
        initialize()
        val lowerQuery = query.lowercase()
        return actions?.filter { action ->
            action.name.lowercase().contains(lowerQuery) ||
            action.description.lowercase().contains(lowerQuery)
        } ?: emptyList()
    }
    
    /**
     * Get summary statistics about loaded actions
     */
    fun getStatistics(): ActionStatistics {
        initialize()
        val allActions = actions ?: emptyList()
        
        return ActionStatistics(
            totalActions = allActions.size,
            actionsByCategory = actionsByCategory?.mapValues { it.value.size } ?: emptyMap(),
            coordinatableActions = getCoordinatableActions().size,
            endOfTurnActions = getEndOfTurnActions().size,
            oncePerTurnActions = getOncePerTurnActions().size,
            unrestCausingActions = getUnrestCausingActions().size,
            skillUsageCount = PlayerSkill.values().associateWith { skill ->
                getActionsBySkill(skill).size
            }
        )
    }
}

/**
 * Statistics about the loaded player actions
 */
data class ActionStatistics(
    val totalActions: Int,
    val actionsByCategory: Map<PlayerActionCategory, Int>,
    val coordinatableActions: Int,
    val endOfTurnActions: Int,
    val oncePerTurnActions: Int,
    val unrestCausingActions: Int,
    val skillUsageCount: Map<PlayerSkill, Int>
)
