package kingdom.lite.actions.handlers

import kingdom.lite.actions.ActionDispatcher
import kingdom.lite.actions.ActionMessage
// Kingdom imports removed - fresh system in development
import kingdom.lite.utils.fromUuidTypeSafe
import kingdom.lite.utils.launch
import com.foundryvtt.core.Game
import kotlinx.js.JsPlainObject

@JsPlainObject
external interface OpenKingdomSheetAction {
    val actorUuid: String
}

class OpenKingdomSheetHandler(
    private val game: Game,
) : ActionHandler(
    action = "openKingdomSheet",
    mode = ExecutionMode.OTHERS,
) {
    override suspend fun execute(action: ActionMessage, dispatcher: ActionDispatcher) {
        // Kingdom sheet disabled - fresh system in development
        console.log("Kingdom sheet disabled - fresh system in development")
        console.log("Use testFreshKingdomSystem() in console to test the new system")
    }
}
