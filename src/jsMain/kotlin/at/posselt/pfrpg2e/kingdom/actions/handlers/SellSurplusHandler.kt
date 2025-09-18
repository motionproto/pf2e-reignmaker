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
 * Handler for selling surplus resources for gold.
 * Maps to "Sell Surplus" action in Reignmaker-lite.
 * 
 * Uses Diplomacy, Deception, or Society checks to sell resources.
 * Converts resources to gold at market rates.
 */
class SellSurplusHandler(
    private val resourceManager: ResourceManager
) : BaseKingdomAction() {
    override val actionId = "sell-surplus"
    override val actionName = "Sell Surplus"
    override val requiresGmApproval = false
    
    // Economic Actions category
    override val category = KingdomActionCategory.ECONOMIC_ACTIONS
    
    // Can be resolved with Diplomacy, Deception, or Society
    override val applicableSkills = listOf(
        PCSkill.DIPLOMACY,
        PCSkill.DECEPTION,
        PCSkill.SOCIETY
    )
    
    // Base DC for selling surplus
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement surplus selling logic
        ui.notifications.info("Sell Surplus action triggered - implementation pending")
        
        // This would typically:
        // 1. Show resource selection dialog
        // 2. Show skill check dialog with Diplomacy/Deception/Society options
        // 3. Roll the check with capital bonus if applicable
        // 4. Apply results:
        //    - Critical Success: Better exchange rate
        //    - Success: Normal exchange rate
        //    - Failure: Poor exchange rate
        //    - Critical Failure: No sale or loss
        // 5. Convert resources to gold
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Sell Surplus: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to convert resources to gold. Diplomacy represents fair trade, " +
               "Deception represents sharp dealing, and Society represents market knowledge."
    }
}
