package at.posselt.pfrpg2e.kingdom.actions

import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Registry for managing and dispatching action handlers.
 * This class maintains a collection of action handlers and routes
 * actions to the appropriate handler based on the action ID.
 */
class ActionRegistry {
    private val handlers = mutableMapOf<String, ActionHandler>()
    private var debugMode = false
    
    /**
     * Registers a single action handler.
     * If a handler with the same ID already exists, it will be replaced.
     * 
     * @param handler The action handler to register
     */
    fun register(handler: ActionHandler) {
        if (debugMode) {
            console.log("Registering action handler: ${handler.actionId}")
        }
        handlers[handler.actionId] = handler
    }
    
    /**
     * Registers multiple action handlers at once.
     * 
     * @param handlers The action handlers to register
     */
    fun registerAll(vararg handlers: ActionHandler) {
        handlers.forEach { register(it) }
    }
    
    /**
     * Registers multiple action handlers from a list.
     * 
     * @param handlerList The list of action handlers to register
     */
    fun registerAll(handlerList: List<ActionHandler>) {
        handlerList.forEach { register(it) }
    }
    
    /**
     * Handles an action by delegating to the appropriate handler.
     * 
     * @param actionId The ID of the action to handle
     * @param event The pointer event that triggered the action
     * @param target The HTML element that was clicked
     * @param sheet The KingdomSheet instance
     * @return true if the action was handled, false if no handler was found
     */
    suspend fun handle(
        actionId: String,
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet
    ): Boolean {
        val handler = handlers[actionId]
        
        if (handler == null) {
            if (debugMode) {
                console.warn("No handler found for action: $actionId")
            }
            return false
        }
        
        if (!handler.canHandle(sheet)) {
            if (debugMode) {
                console.log("Handler for action $actionId cannot handle current state")
            }
            return false
        }
        
        if (debugMode) {
            console.log("Executing handler for action: $actionId")
        }
        
        try {
            handler.handle(event, target, sheet)
            return true
        } catch (e: Throwable) {
            console.error("Error executing handler for action $actionId:", e)
            throw e
        }
    }
    
    /**
     * Checks if a handler exists for the given action ID.
     * 
     * @param actionId The action ID to check
     * @return true if a handler exists, false otherwise
     */
    fun hasHandler(actionId: String): Boolean {
        return actionId in handlers
    }
    
    /**
     * Gets a handler by its action ID.
     * 
     * @param actionId The action ID
     * @return The handler if found, null otherwise
     */
    fun getHandler(actionId: String): ActionHandler? {
        return handlers[actionId]
    }
    
    /**
     * Removes a handler from the registry.
     * 
     * @param actionId The action ID of the handler to remove
     * @return The removed handler if found, null otherwise
     */
    fun unregister(actionId: String): ActionHandler? {
        return handlers.remove(actionId)
    }
    
    /**
     * Clears all registered handlers.
     */
    fun clear() {
        handlers.clear()
    }
    
    /**
     * Gets the number of registered handlers.
     */
    fun size(): Int {
        return handlers.size
    }
    
    /**
     * Gets a list of all registered action IDs.
     */
    fun getRegisteredActionIds(): List<String> {
        return handlers.keys.toList()
    }
    
    /**
     * Enables or disables debug mode.
     * When enabled, the registry will log additional information about handler registration and execution.
     * 
     * @param enabled true to enable debug mode, false to disable
     */
    fun setDebugMode(enabled: Boolean) {
        debugMode = enabled
        if (enabled) {
            console.log("ActionRegistry debug mode enabled. Registered actions: ${getRegisteredActionIds().joinToString(", ")}")
        }
    }
    
    /**
     * Creates a summary of all registered handlers.
     * Useful for debugging and documentation.
     */
    fun generateSummary(): String {
        return buildString {
            appendLine("=== Action Registry Summary ===")
            appendLine("Total handlers: ${handlers.size}")
            appendLine("\nRegistered Actions:")
            handlers.values.forEach { handler ->
                appendLine("  - ${handler.actionId}: ${handler.description}")
            }
        }
    }
}

/**
 * Builder class for creating and configuring an ActionRegistry.
 */
class ActionRegistryBuilder {
    private val handlers = mutableListOf<ActionHandler>()
    private var debugMode = false
    
    /**
     * Adds a handler to the builder.
     */
    fun addHandler(handler: ActionHandler): ActionRegistryBuilder {
        handlers.add(handler)
        return this
    }
    
    /**
     * Adds multiple handlers to the builder.
     */
    fun addHandlers(vararg handlers: ActionHandler): ActionRegistryBuilder {
        this.handlers.addAll(handlers)
        return this
    }
    
    /**
     * Enables debug mode for the registry.
     */
    fun withDebugMode(enabled: Boolean = true): ActionRegistryBuilder {
        debugMode = enabled
        return this
    }
    
    /**
     * Builds the ActionRegistry with all configured handlers.
     */
    fun build(): ActionRegistry {
        return ActionRegistry().apply {
            registerAll(handlers)
            setDebugMode(debugMode)
        }
    }
}
