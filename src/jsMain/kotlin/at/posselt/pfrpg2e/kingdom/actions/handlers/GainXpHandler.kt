package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for gaining XP from various sources.
 */
class GainXpHandler : BaseActionHandler() {
    override val actionId = "gain-xp"
    override val description = "Handles gaining XP from button clicks"
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet
    ) {
        val xpAmount = getDataInt(target, "xp")
        if (xpAmount != null) {
            logAction("Gaining $xpAmount XP")
            // Note: In a full implementation, we'd need a way to access the actor
            // For now, this demonstrates the pattern
            console.log("Would gain $xpAmount XP")
        } else {
            console.warn("No XP amount specified in data-xp attribute")
        }
    }
}
