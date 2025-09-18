package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.data.checks.RollMode
import at.posselt.pfrpg2e.utils.d20Check
import at.posselt.pfrpg2e.utils.postChatMessage
import at.posselt.pfrpg2e.utils.t
import com.foundryvtt.core.Game
import js.objects.recordOf
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for manually checking if a kingdom event occurs.
 * This is a utility handler separate from the turn sequence.
 * 
 * In Reignmaker-lite, this handler is used for manual event checks
 * outside of the normal turn sequence.
 */
class CheckEventHandler : PlayerSkillActionHandler {
    override val actionId = "check-event"
    override val actionName = "Check Event (Manual)"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        actor.getKingdom()?.let { kingdom ->
            val dc = sheet.getEventDC(kingdom)
            val rollMode = RollMode.fromString(kingdom.settings.kingdomEventRollMode)
            val succeeded = d20Check(
                dc = dc,
                flavor = t("kingdom.checkingForKingdomEvent", recordOf("dc" to dc)),
                rollMode = rollMode
            ).degreeOfSuccess.succeeded()
            
            if (succeeded) {
                kingdom.turnsWithoutEvent = 0
                postChatMessage(t("kingdom.kingdomEventOccurs"), rollMode = rollMode)
            } else {
                kingdom.turnsWithoutEvent += 1
            }
            
            actor.setKingdom(kingdom)
        }
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Check Event (Manual): This is a utility action for manually checking if an event occurs. " +
               "Events that trigger are then resolved using PC skills based on the event type."
    }
}
