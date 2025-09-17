package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.managers.UnrestIncidentManager
import at.posselt.pfrpg2e.kingdom.dialogs.showUnrestIncidentDialog
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for checking for unrest incidents.
 */
class CheckUnrestIncidentHandler(
    private val unrestIncidentManager: UnrestIncidentManager
) : PlayerSkillActionHandler {
    override val actionId = "check-unrest-incident"
    override val actionName = "Check Unrest Incident"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // Calculate and apply passive unrest
        val passiveUnrest = unrestIncidentManager.calculatePassiveUnrest(kingdom)
        unrestIncidentManager.applyPassiveUnrest(actor, passiveUnrest)
        
        // Check for incidents
        val incident = unrestIncidentManager.checkForIncident(actor, kingdom.unrest)
        if (incident != null) {
            showUnrestIncidentDialog(
                game = game,
                kingdomActor = actor,
                incident = incident,
                manager = unrestIncidentManager,
                onComplete = { sheet.render() }
            )
        }
    }
}
