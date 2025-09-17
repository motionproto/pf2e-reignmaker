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
 * Handler for changing an event's stage.
 */
class ChangeEventStageHandler : PlayerSkillActionHandler {
    override val actionId = "change-event-stage"
    override val actionName = "Change Event Stage"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val stageStr = target.dataset["stage"]
        val eventIndexStr = target.dataset["eventIndex"]
        
        if (stageStr != null && eventIndexStr != null) {
            val stage = stageStr.toIntOrNull() ?: return
            val eventIndex = eventIndexStr.toIntOrNull() ?: return
            
            actor.getKingdom()?.let { kingdom ->
                kingdom.ongoingEvents = kingdom.ongoingEvents
                    .mapIndexed { index, event ->
                        if (index == eventIndex) {
                            RawOngoingKingdomEvent.copy(event, stage = stage)
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
