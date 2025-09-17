package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.kingdom.getAllSettlements
import at.posselt.pfrpg2e.kingdom.dialogs.AddEvent
import at.posselt.pfrpg2e.utils.launch
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for adding a new kingdom event.
 * This opens a dialog for event configuration.
 */
class AddEventHandler : PlayerSkillActionHandler {
    override val actionId = "add-event"
    override val actionName = "Add Kingdom Event"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        val settlements = kingdom.getAllSettlements(game)
        
        AddEvent(
            game = game,
            kingdomActor = actor,
            kingdom = kingdom,
            settlements = settlements.allSettlements,
            onSave = { newEvent ->
                val k = actor.getKingdom() ?: return@AddEvent
                k.ongoingEvents = k.ongoingEvents + newEvent
                actor.setKingdom(k)
            }
        ).launch()
    }
}
