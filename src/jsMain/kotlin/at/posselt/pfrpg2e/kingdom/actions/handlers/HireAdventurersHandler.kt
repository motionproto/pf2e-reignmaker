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
 * Handler for hiring adventurers to handle kingdom problems.
 * Maps to "Hire Adventurers" action in Reignmaker-lite.
 * 
 * Uses Diplomacy, Performance, or Society checks to recruit help.
 * Can resolve various kingdom issues through mercenary assistance.
 */
class HireAdventurersHandler : BaseKingdomAction() {
    override val actionId = "hire-adventurers"
    override val actionName = "Hire Adventurers"
    override val requiresGmApproval = false
    
    // Foreign Affairs category
    override val category = KingdomActionCategory.FOREIGN_AFFAIRS
    
    // Can be resolved with Diplomacy, Performance, or Society
    override val applicableSkills = listOf(
        PCSkill.DIPLOMACY,
        PCSkill.PERFORMANCE,
        PCSkill.SOCIETY
    )
    
    // Base DC for hiring adventurers
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement adventurer hiring logic
        ui.notifications.info("Hire Adventurers action triggered - implementation pending")
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Hire Adventurers: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to recruit adventuring parties. Diplomacy represents negotiation, " +
               "Performance represents making your cause appealing, and Society represents connections."
    }
}
