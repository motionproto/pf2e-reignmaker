package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.actions.PCSkill
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.managers.ResourceManager
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for purchasing resources with gold.
 * Maps to "Purchase Resources" action in Reignmaker-lite.
 * 
 * Uses Diplomacy, Deception, or Society checks to buy resources.
 * Converts gold to resources at market rates.
 */
class PurchaseResourcesHandler(
    private val resourceManager: ResourceManager
) : BaseKingdomAction() {
    override val actionId = "purchase-resources"
    override val actionName = "Purchase Resources"
    override val requiresGmApproval = false
    
    // Economic Actions category
    override val category = KingdomActionCategory.ECONOMIC_ACTIONS
    
    // Can be resolved with Diplomacy, Deception, or Society
    override val applicableSkills = listOf(
        PCSkill.DIPLOMACY,
        PCSkill.DECEPTION,
        PCSkill.SOCIETY
    )
    
    // Base DC for purchasing resources
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement resource purchasing logic
        ui.notifications.info("Purchase Resources action triggered - implementation pending")
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Purchase Resources: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to buy resources with gold. Diplomacy represents fair negotiation, " +
               "Deception represents haggling, and Society represents market connections."
    }
}
