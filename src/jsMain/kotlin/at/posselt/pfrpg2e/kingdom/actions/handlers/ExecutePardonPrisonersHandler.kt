package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.actions.PCSkill
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for executing or pardoning prisoners.
 * Maps to "Execute/Pardon Prisoners" action in Reignmaker-lite.
 * 
 * Uses Intimidation or Society checks to manage prisoners.
 * Critical failures cause +1 Unrest.
 */
class ExecutePardonPrisonersHandler : BaseKingdomAction() {
    override val actionId = "execute-pardon-prisoners"
    override val actionName = "Execute or Pardon Prisoners"
    override val requiresGmApproval = false
    
    // Uphold Stability category
    override val category = KingdomActionCategory.UPHOLD_STABILITY
    
    // Can be resolved with Intimidation or Society
    override val applicableSkills = listOf(
        PCSkill.INTIMIDATION,
        PCSkill.SOCIETY
    )
    
    // Base DC for managing prisoners
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement prisoner management logic
        ui.notifications.info("Execute/Pardon Prisoners action triggered - implementation pending")
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Execute/Pardon Prisoners: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to manage prisoners. Intimidation represents harsh justice, " +
               "Society represents legal proceedings. " +
               "Critical failures increase Unrest by 1."
    }
}
