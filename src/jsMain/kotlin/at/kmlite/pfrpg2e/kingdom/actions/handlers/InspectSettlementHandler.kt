package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for inspecting settlement details.
 */
class InspectSettlementHandler : PlayerSkillActionHandler {
    override val actionId = "inspect-settlement"
    override val actionName = "Inspect Settlement"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        // This action is handled in the KingdomSheet's legacy switch statement
        // since it requires complex settlement inspection dialog
        // TODO: Refactor when settlement inspection is extracted
    }
}
