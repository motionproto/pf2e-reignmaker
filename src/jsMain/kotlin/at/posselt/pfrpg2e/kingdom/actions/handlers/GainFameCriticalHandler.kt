package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.managers.FameManager
import at.posselt.pfrpg2e.utils.postChatMessage
import at.posselt.pfrpg2e.utils.t
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for gaining bonus fame from critical success.
 */
class GainFameCriticalHandler(
    private val fameManager: FameManager
) : PlayerSkillActionHandler {
    override val actionId = "gain-fame-critical"
    override val actionName = "Gain Fame from Critical"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        fameManager.gainFromCritical(actor)
        postChatMessage(t("kingdom.gainedFameFromCritical"))
        sheet.render()
    }
}
