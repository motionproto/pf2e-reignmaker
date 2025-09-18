package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.kmlite.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.kmlite.pfrpg2e.kingdom.actions.PCSkill
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.getKingdom
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for recruiting new army units.
 * Maps to "Recruit Unit" action in Reignmaker-lite.
 * 
 * Uses Intimidation, Society, or Athletics checks to recruit troops.
 * Critical failures on military operations cause +1 Unrest.
 */
class RecruitArmyHandler : BaseKingdomAction() {
    override val actionId = "recruit-army"
    override val actionName = "Recruit Unit"
    override val requiresGmApproval = false
    
    // Military Operations category
    override val category = KingdomActionCategory.MILITARY_OPERATIONS
    
    // Can be resolved with Intimidation, Society, or Athletics
    override val applicableSkills = listOf(
        PCSkill.INTIMIDATION,
        PCSkill.SOCIETY,
        PCSkill.ATHLETICS
    )
    
    // Base DC for recruiting units
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement army recruitment logic
        ui.notifications.info("Recruit Unit action triggered - implementation pending")
        
        // This would typically:
        // 1. Show skill check dialog with Intimidation/Society/Athletics options
        // 2. Roll the check with capital bonus if applicable
        // 3. Apply results:
        //    - Critical Success: Recruit unit with bonus morale or reduced cost
        //    - Success: Recruit unit normally
        //    - Failure: No unit recruited
        //    - Critical Failure: No unit recruited and +1 Unrest (military failure)
        // 4. Deduct resources/gold for unit cost
        // 5. Add unit to kingdom's military roster
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Recruit Unit: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to raise military units. Intimidation represents forced conscription, " +
               "Society represents organized recruitment, and Athletics represents training warriors. " +
               "Critical failures increase Unrest by 1 due to military mishaps."
    }
}
