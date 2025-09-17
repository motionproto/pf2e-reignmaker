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
 * Handler for deleting a settlement.
 */
class DeleteSettlementHandler : PlayerSkillActionHandler {
    override val actionId = "delete-settlement"
    override val actionName = "Delete Settlement"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val id = target.dataset["id"]
        if (id != null) {
            val kingdom = actor.getKingdom() ?: return
            kingdom.ongoingEvents = kingdom.ongoingEvents.filter { it.settlementSceneId != id }.toTypedArray()
            kingdom.settlements = kingdom.settlements.filter { it.sceneId != id }.toTypedArray()
            actor.setKingdom(kingdom)
        }
    }
}
