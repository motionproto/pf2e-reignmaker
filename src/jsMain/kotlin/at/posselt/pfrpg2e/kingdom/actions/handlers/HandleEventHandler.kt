package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.getOngoingEvents
import at.posselt.pfrpg2e.kingdom.getActiveLeader
import at.posselt.pfrpg2e.kingdom.dialogs.CheckType
import at.posselt.pfrpg2e.kingdom.dialogs.kingdomCheckDialog
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.get
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for handling a kingdom event.
 * This opens a check dialog for event resolution.
 */
class HandleEventHandler : PlayerSkillActionHandler {
    override val actionId = "handle-event"
    override val actionName = "Handle Kingdom Event"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val indexStr = target.dataset["index"]
        if (indexStr != null) {
            val index = indexStr.toIntOrNull() ?: return
            val kingdom = actor.getKingdom() ?: return
            val kingdomEvent = kingdom.getOngoingEvents().getOrNull(index) ?: return
            
            kingdomCheckDialog(
                game = game,
                kingdom = kingdom,
                kingdomActor = actor,
                check = CheckType.HandleEvent(kingdomEvent),
                selectedLeader = game.getActiveLeader(),
                groups = emptyArray(),
                events = emptyList()
            )
        }
    }
}
