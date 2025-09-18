package kingdom.lite.actions.handlers

import kingdom.lite.actions.ActionMessage
import kingdom.lite.actions.ActionDispatcher

enum class ExecutionMode {
    ALL,
    GM_ONLY,
    OTHERS,
}

abstract class ActionHandler(
    private val action: String,
    val mode: ExecutionMode = ExecutionMode.GM_ONLY,
) {
    fun canExecute(action: ActionMessage): Boolean = action.action == this.action
    abstract suspend fun execute(action: ActionMessage, dispatcher: ActionDispatcher)
}