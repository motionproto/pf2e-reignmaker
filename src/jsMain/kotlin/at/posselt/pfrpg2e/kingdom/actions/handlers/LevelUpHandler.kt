package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for leveling up the kingdom.
 */
class LevelUpHandler : BaseActionHandler() {
    override val actionId = "level-up"
    override val description = "Handles kingdom level up"
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet
    ) {
        logAction("Leveling up kingdom")
        // Note: In a full implementation, we'd need a way to access the actor
        // For now, this demonstrates the pattern
        console.log("Would level up kingdom")
    }
    
    override fun canHandle(sheet: KingdomSheet): Boolean {
        // Note: In a full implementation, check if kingdom can level up
        return true
    }
}
