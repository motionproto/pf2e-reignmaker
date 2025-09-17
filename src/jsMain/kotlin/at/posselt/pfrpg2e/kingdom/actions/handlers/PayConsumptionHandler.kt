package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for paying consumption during upkeep phase.
 * TODO: Implement actual consumption payment logic
 */
class PayConsumptionHandler : PlayerSkillActionHandler {
    override val actionId = "pay-consumption"
    override val actionName = "Pay Consumption"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        // TODO: Implement actual consumption payment
        ui.notifications.info("Consumption payment handler - implementation pending")
        sheet.render()
    }
}
