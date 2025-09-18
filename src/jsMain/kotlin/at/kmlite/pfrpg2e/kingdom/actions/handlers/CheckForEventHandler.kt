package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.getKingdom
import at.kmlite.pfrpg2e.kingdom.managers.KingdomEventsManager
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for checking if a kingdom event occurs.
 * This is Phase 3 in the Reignmaker-lite turn sequence.
 * 
 * Rolls a flat check against the current event DC.
 * If an event occurs, it will be resolved using PC skills 
 * like Diplomacy, Stealth, Nature, etc. rather than kingdom skills.
 */
class CheckForEventHandler(
    private val eventsManager: KingdomEventsManager? = null
) : PlayerSkillActionHandler {
    
    override val actionId: String = "check-for-event"
    override val actionName: String = "Check for Kingdom Event"
    override val requiresGmApproval: Boolean = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // Check if events are enabled
        if (kingdom.settings.enableKingdomEvents != true) {
            ui.notifications.info("Kingdom events are disabled")
            return
        }
        
        // Get or create events manager
        val manager = eventsManager ?: KingdomEventsManager(game)
        
        // Get current DC
        val currentDC = kingdom.settings.eventDc
        
        // Check for event (suspend function)
        val eventOccurs = manager.checkForEvent(currentDC)
        
        // Update DC based on result (suspend function)
        manager.updateEventDC(actor, eventOccurs)
        
        if (eventOccurs) {
            // Select and display an event (suspend function)
            val selectedEvent = manager.selectRandomEvent(kingdom)
            if (selectedEvent != null) {
                ui.notifications.info("Kingdom event triggered: ${selectedEvent.name}")
                console.log("Event selected: ${selectedEvent.id}")
                // The event resolution will be handled by HandleEventHandler
                // which uses PC skills based on the event type
            } else {
                ui.notifications.warn("An event was triggered but no suitable events were found")
            }
        } else {
            ui.notifications.info("No kingdom event occurs this turn (DC: $currentDC)")
        }
        
        sheet.render()
    }
    
    override fun validate(actor: KingdomActor): Boolean {
        val kingdom = actor.getKingdom()
        return kingdom != null && kingdom.settings.enableKingdomEvents == true
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Check for Event: This is Phase 3 of the turn sequence. " +
               "It rolls a flat check to determine if a kingdom event occurs. " +
               "Events are then resolved using PC skills (Diplomacy, Intimidation, Crafting, etc.) " +
               "rather than kingdom skills."
    }
}
