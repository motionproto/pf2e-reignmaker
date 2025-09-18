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
 * Handler for establishing diplomatic relations.
 * Maps to "Establish Diplomatic Relations" action in Reignmaker-lite.
 * 
 * Uses Diplomacy, Deception, or Society checks to establish relations.
 * Once per turn action that forms alliances or treaties.
 */
class EstablishDiplomaticRelationsHandler : BaseKingdomAction() {
    override val actionId = "establish-diplomatic-relations"
    override val actionName = "Establish Diplomatic Relations"
    override val requiresGmApproval = false
    
    // Foreign Affairs category
    override val category = KingdomActionCategory.FOREIGN_AFFAIRS
    
    // Can be resolved with Diplomacy, Deception, or Society
    override val applicableSkills = listOf(
        PCSkill.DIPLOMACY,
        PCSkill.DECEPTION,
        PCSkill.SOCIETY
    )
    
    // Base DC for establishing relations
    override val baseDC = 15
    
    // This action can only be taken once per turn
    override val oncePerTurn = true
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement diplomatic relations logic
        ui.notifications.info("Establish Diplomatic Relations action triggered - implementation pending")
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Establish Diplomatic Relations: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to form alliances and treaties. Diplomacy represents honest negotiation, " +
               "Deception represents manipulation, and Society represents protocol knowledge. " +
               "This action can only be taken once per turn."
    }
}
