package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.managers.FameManager
import at.posselt.pfrpg2e.utils.postChatMessage
import at.posselt.pfrpg2e.utils.t
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.get
import org.w3c.dom.pointerevents.PointerEvent
import js.objects.recordOf

/**
 * Handler for using fame points for rerolls.
 */
class UseFameRerollHandler(
    private val fameManager: FameManager
) : PlayerSkillActionHandler {
    override val actionId = "use-fame-reroll"
    override val actionName = "Use Fame for Reroll"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val checkId = target.dataset["checkId"]
        if (checkId != null) {
            if (fameManager.useForReroll(actor, checkId)) {
                postChatMessage(t("kingdom.usedFameForReroll", recordOf("check" to checkId)))
            } else {
                ui.notifications.warn(t("kingdom.cannotUseFameForReroll"))
            }
            
            sheet.render()
        }
    }
}
