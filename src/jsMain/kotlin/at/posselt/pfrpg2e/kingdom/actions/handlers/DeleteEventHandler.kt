package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.get
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for deleting an ongoing event.
 */
class DeleteEventHandler : PlayerSkillActionHandler {
    override val actionId = "delete-event"
    override val actionName = "Delete Event"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        actor.getKingdom()?.let { kingdom ->
            val indexStr = target.dataset["index"]
            if (indexStr != null) {
                val eventIndex = indexStr.toIntOrNull() ?: return
                kingdom.ongoingEvents = kingdom.ongoingEvents
                    .filterIndexed { index, _ -> index != eventIndex }
                    .toTypedArray()
                actor.setKingdom(kingdom)
            }
        }
    }
}
