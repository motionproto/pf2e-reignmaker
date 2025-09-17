package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent
import kotlinx.browser.window

/**
 * Handler for displaying consumption breakdown information.
 */
class ConsumptionBreakdownHandler : PlayerSkillActionHandler {
    override val actionId = "consumption-breakdown"
    override val actionName = "Consumption Breakdown"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        // This action is handled in the KingdomSheet's legacy switch statement
        // since it requires complex data calculation from the sheet context
        // TODO: Refactor when consumption calculation is extracted
    }
}
