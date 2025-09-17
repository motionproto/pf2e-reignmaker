package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.kingdom.RawOngoingKingdomEvent
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.get
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for toggling an event's continuous status.
 */
class ToggleContinuousHandler : PlayerSkillActionHandler {
    override val actionId = "toggle-continuous"
    override val actionName = "Toggle Continuous Event"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val eventIndexStr = target.dataset["eventIndex"]
        if (eventIndexStr != null) {
            val eventIndex = eventIndexStr.toIntOrNull() ?: return
            
            actor.getKingdom()?.let { kingdom ->
                kingdom.ongoingEvents = kingdom.ongoingEvents
                    .mapIndexed { index, event ->
                        if (index == eventIndex) {
                            val isContinuous = event.becameContinuous == true
                            RawOngoingKingdomEvent.copy(event, becameContinuous = !isContinuous)
                        } else {
                            event
                        }
                    }
                    .toTypedArray()
                actor.setKingdom(kingdom)
            }
        }
    }
}
