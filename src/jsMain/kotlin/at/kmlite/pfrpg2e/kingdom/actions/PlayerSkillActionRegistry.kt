package at.kmlite.pfrpg2e.kingdom.actions

import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Registry for managing player skill action handlers.
 * This centralizes action handling and makes it easy to add new actions.
 */
class PlayerSkillActionRegistry {
    private val handlers = mutableMapOf<String, PlayerSkillActionHandler>()
    
    /**
     * Register a new action handler
     */
    fun register(handler: PlayerSkillActionHandler) {
        handlers[handler.actionId] = handler
        console.log("Registered player skill action: ${handler.actionName} (${handler.actionId})")
    }
    
    /**
     * Register multiple handlers at once
     */
    fun registerAll(vararg handlersToRegister: PlayerSkillActionHandler) {
        handlersToRegister.forEach { register(it) }
    }
    
    /**
     * Check if a handler exists for the given action ID
     */
    fun hasHandler(actionId: String): Boolean {
        return handlers.containsKey(actionId)
    }
    
    /**
     * Get a handler by action ID
     */
    fun getHandler(actionId: String): PlayerSkillActionHandler? {
        return handlers[actionId]
    }
    
    /**
     * Handle an action if a handler exists for it
     * 
     * @return true if the action was handled, false otherwise
     */
    suspend fun handle(
        actionId: String,
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ): Boolean {
        val handler = handlers[actionId]
        if (handler != null) {
            if (!handler.validate(actor)) {
                console.warn("Action validation failed for: $actionId")
                return false
            }
            
            try {
                handler.handle(event, target, sheet, game, actor)
                return true
            } catch (e: Exception) {
                console.error("Error handling action $actionId: ${e.message}")
                throw e
            }
        }
        return false
    }
    
    /**
     * Get all registered action IDs
     */
    fun getRegisteredActionIds(): Set<String> {
        return handlers.keys.toSet()
    }
    
    /**
     * Get all handlers that require GM approval
     */
    fun getGmApprovalRequiredHandlers(): List<PlayerSkillActionHandler> {
        return handlers.values.filter { it.requiresGmApproval }
    }
    
    /**
     * Clear all registered handlers
     */
    fun clear() {
        handlers.clear()
    }
    
    /**
     * Get a summary of all registered actions for debugging
     */
    fun getSummary(): String {
        return handlers.values.joinToString("\n") { handler ->
            "${handler.actionId}: ${handler.actionName} (GM Approval: ${handler.requiresGmApproval})"
        }
    }
}
