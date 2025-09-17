package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.dialogs.KingdomEventManagement
import at.posselt.pfrpg2e.utils.launch
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for configuring kingdom events.
 * Opens the event management dialog.
 */
class ConfigureEventsHandler : PlayerSkillActionHandler {
    override val actionId = "configure-events"
    override val actionName = "Configure Events"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        KingdomEventManagement(kingdomActor = actor).launch()
    }
}
