package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.kmlite.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.kmlite.pfrpg2e.kingdom.actions.PCSkill
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.getKingdom
import at.kmlite.pfrpg2e.kingdom.setKingdom
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for arresting dissidents to reduce unrest.
 * Maps to "Arrest Dissidents" action in Reignmaker-lite.
 * 
 * Uses Intimidation or Society checks to arrest troublemakers.
 * Success reduces Unrest by 1, critical success by 2.
 * Critical failures increase Unrest by 1.
 */
class ArrestDissidentsHandler : BaseKingdomAction() {
    override val actionId = "arrest-dissidents"
    override val actionName = "Arrest Dissidents"
    override val requiresGmApproval = false
    
    // Uphold Stability category
    override val category = KingdomActionCategory.UPHOLD_STABILITY
    
    // Can be resolved with Intimidation or Society
    override val applicableSkills = listOf(
        PCSkill.INTIMIDATION,
        PCSkill.SOCIETY
    )
    
    // Base DC for arresting dissidents
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement skill check dialog and resolution
        // For now, just show a notification
        ui.notifications.info("Arrest Dissidents action triggered - implementation pending")
        
        // This would typically:
        // 1. Show skill check dialog with Intimidation/Society options
        // 2. Roll the check with capital bonus if applicable
        // 3. Apply results:
        //    - Critical Success: -2 Unrest
        //    - Success: -1 Unrest
        //    - Failure: No effect
        //    - Critical Failure: +1 Unrest
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Arrest Dissidents: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to arrest troublemakers and reduce unrest. Intimidation represents using fear, " +
               "while Society represents legal proceedings. " +
               "Critical failures increase Unrest by 1."
    }
}
