package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.actions.PCSkill
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.managers.UnrestIncidentManager
import at.posselt.pfrpg2e.kingdom.dialogs.showUnrestIncidentDialog
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for dealing with unrest in the kingdom.
 * Maps to "Deal with Unrest" action in Reignmaker-lite.
 * 
 * Uses Diplomacy, Intimidation, or Performance checks to quell unrest.
 * Critical failures cause +1 Unrest as per Reignmaker-lite rules.
 */
class CheckUnrestIncidentHandler(
    private val unrestIncidentManager: UnrestIncidentManager
) : BaseKingdomAction() {
    override val actionId = "check-unrest-incident"
    override val actionName = "Deal with Unrest"
    override val requiresGmApproval = false
    
    // Uphold Stability category
    override val category = KingdomActionCategory.UPHOLD_STABILITY
    
    // Can be resolved with Diplomacy, Intimidation, or Performance
    override val applicableSkills = listOf(
        PCSkill.DIPLOMACY,
        PCSkill.INTIMIDATION,
        PCSkill.PERFORMANCE
    )
    
    // Base DC for dealing with unrest (will be adjusted by party level)
    override val baseDC = 15
    
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
    
    override fun getPlayerSkillsDescription(): String? {
        return "Deal with Unrest: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to calm tensions and prevent unrest from escalating. " +
               "Critical failures increase Unrest by 1."
    }
}
