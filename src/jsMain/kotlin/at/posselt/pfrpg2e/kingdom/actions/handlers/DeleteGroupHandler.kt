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
 * Handler for deleting a diplomatic group.
 */
class DeleteGroupHandler : PlayerSkillActionHandler {
    override val actionId = "delete-group"
    override val actionName = "Delete Diplomatic Group"
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
            val index = indexStr.toIntOrNull() ?: 0
            val kingdom = actor.getKingdom() ?: return
            
            kingdom.groups = kingdom.groups.filterIndexed { idx, _ -> idx != index }.toTypedArray()
            actor.setKingdom(kingdom)
        }
    }
}
