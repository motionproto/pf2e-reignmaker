package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for displaying kingdom size information.
 */
class KingdomSizeInfoHandler : PlayerSkillActionHandler {
    override val actionId = "kingdom-size-info"
    override val actionName = "Kingdom Size Info"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        // This action is handled in the KingdomSheet's legacy switch statement
        // since it requires the kingdomSizeHelp dialog function
        // TODO: Import dialog utilities or refactor to use proper service
    }
}
