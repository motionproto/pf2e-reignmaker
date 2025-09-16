package at.posselt.pfrpg2e.kingdom.actions

import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Interface for handling actions in the Kingdom Sheet.
 * Each action handler is responsible for a specific action that can be triggered
 * from the UI, encapsulating the logic for that action.
 */
interface ActionHandler {
    /**
     * The unique identifier for this action.
     * This should match the data-action attribute in the HTML.
     */
    val actionId: String
    
    /**
     * Handles the action when triggered.
     * 
     * @param event The pointer event that triggered the action
     * @param target The HTML element that was clicked
     * @param sheet The KingdomSheet instance
     */
    suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet
    )
    
    /**
     * Optional validation to check if the action can be performed.
     * Default implementation always returns true.
     * 
     * @param sheet The KingdomSheet instance
     * @return true if the action can be performed, false otherwise
     */
    fun canHandle(sheet: KingdomSheet): Boolean = true
    
    /**
     * Optional description of what this action does.
     * Useful for documentation and debugging.
     */
    val description: String
        get() = "Handler for action: $actionId"
}

/**
 * Base abstract class for action handlers that provides common functionality.
 */
abstract class BaseActionHandler : ActionHandler {
    /**
     * Helper method to safely get data attributes from the target element.
     */
    protected fun getDataAttribute(target: HTMLElement, key: String): String? {
        return js("target.dataset[key]") as? String
    }
    
    /**
     * Helper method to safely get an integer data attribute.
     */
    protected fun getDataInt(target: HTMLElement, key: String): Int? {
        return getDataAttribute(target, key)?.toIntOrNull()
    }
    
    /**
     * Helper method to safely get a boolean data attribute.
     */
    protected fun getDataBoolean(target: HTMLElement, key: String): Boolean {
        return getDataAttribute(target, key)?.toBoolean() ?: false
    }
    
    /**
     * Helper method to log action execution for debugging.
     */
    protected fun logAction(message: String) {
        console.log("[$actionId] $message")
    }
}
