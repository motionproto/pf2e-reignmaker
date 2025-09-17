package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for collecting resources during the income phase.
 * TODO: Implement actual resource collection logic
 */
class CollectResourcesHandler : PlayerSkillActionHandler {
    override val actionId = "collect-resources"
    override val actionName = "Collect Resources"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        // TODO: Implement actual resource collection
        ui.notifications.info("Resource collection handler - implementation pending")
        sheet.render()
    }
}
