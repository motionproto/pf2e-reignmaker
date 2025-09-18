package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.actions.ActionDispatcher
import at.kmlite.pfrpg2e.actions.ActionMessage
import at.kmlite.pfrpg2e.actions.handlers.OpenKingdomSheetAction
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for showing the kingdom sheet to other players.
 */
class ShowPlayersHandler(
    private val dispatcher: ActionDispatcher
) : PlayerSkillActionHandler {
    override val actionId = "show-players"
    override val actionName = "Show to Players"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val action = ActionMessage(
            action = "openKingdomSheet",
            data = OpenKingdomSheetAction(actorUuid = actor.uuid)
        )
        dispatcher.dispatch(action)
    }
}
