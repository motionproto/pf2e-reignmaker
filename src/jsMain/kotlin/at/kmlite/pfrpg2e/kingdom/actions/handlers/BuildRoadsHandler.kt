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
 * Handler for building roads in hexes.
 * Maps to "Build Roads" action in Reignmaker-lite.
 * 
 * Uses Athletics, Crafting, or Survival checks to construct roads.
 * Roads reduce travel time and improve commerce.
 */
class BuildRoadsHandler : BaseKingdomAction() {
    override val actionId = "build-roads"
    override val actionName = "Build Roads"
    override val requiresGmApproval = false
    
    // Expand Borders category
    override val category = KingdomActionCategory.EXPAND_BORDERS
    
    // Can be resolved with Athletics, Crafting, or Survival
    override val applicableSkills = listOf(
        PCSkill.ATHLETICS,
        PCSkill.CRAFTING,
        PCSkill.SURVIVAL
    )
    
    // Base DC for building roads
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // TODO: Implement road building logic
        ui.notifications.info("Build Roads action triggered - implementation pending")
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Build Roads: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to construct roads through hexes. Athletics represents physical labor, " +
               "Crafting represents engineering, and Survival represents pathfinding."
    }
}
