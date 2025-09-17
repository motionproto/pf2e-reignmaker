package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for changing section navigation within the kingdom sheet.
 */
class ChangeKingdomSectionNavHandler : PlayerSkillActionHandler {
    override val actionId = "change-kingdom-section-nav"
    override val actionName = "Change Kingdom Section Navigation"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        event.preventDefault()
        
        // This action is handled in the KingdomSheet's legacy switch statement
        // since it modifies internal sheet state
        // TODO: Refactor when sheet navigation is extracted
    }
}
