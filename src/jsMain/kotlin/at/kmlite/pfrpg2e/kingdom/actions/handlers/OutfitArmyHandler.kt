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
 * Handler for outfitting army units with equipment.
 * Maps to "Outfit Army" action in Reignmaker-lite.
 * 
 * Uses Crafting, Society, or Athletics checks to equip troops.
 * Critical failures on military operations cause +1 Unrest.
 */
class OutfitArmyHandler : BaseKingdomAction() {
    override val actionId = "outfit-army"
    override val actionName = "Outfit Army"
    override val requiresGmApproval = false
    
    // Military Operations category
    override val category = KingdomActionCategory.MILITARY_OPERATIONS
    
    // Can be resolved with Crafting, Society, or Athletics
    override val applicableSkills = listOf(
        PCSkill.CRAFTING,
        PCSkill.SOCIETY,
        PCSkill.ATHLETICS
    )
    
    // Base DC for outfitting army
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement army outfitting logic
        ui.notifications.info("Outfit Army action triggered - implementation pending")
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Outfit Army: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to equip military units. Crafting represents making equipment, " +
               "Society represents procurement, Athletics represents training with gear. " +
               "Critical failures increase Unrest by 1."
    }
}
