package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import com.foundryvtt.core.Game
import kotlinx.coroutines.await
import org.w3c.dom.HTMLElement
import org.w3c.dom.get
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for activating a settlement scene.
 */
class ActivateSettlementHandler : PlayerSkillActionHandler {
    override val actionId = "activate-settlement"
    override val actionName = "Activate Settlement"
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
            val scene = game.scenes.get(id)
            scene?.activate()?.await()
        }
    }
}
