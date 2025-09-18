package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.actions.PCSkill
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for claiming new hexes for the kingdom.
 * Maps to "Claim Hexes" action in Reignmaker-lite.
 * 
 * Uses Athletics, Society, or Survival checks to claim territory.
 * Success claims 1 hex, critical success claims 2.
 * Resource cost varies by terrain type.
 */
class ClaimHexesHandler : BaseKingdomAction() {
    override val actionId = "claim-hexes"
    override val actionName = "Claim Hexes"
    override val requiresGmApproval = false
    
    // Expand Borders category
    override val category = KingdomActionCategory.EXPAND_BORDERS
    
    // Can be resolved with Athletics, Society, or Survival
    override val applicableSkills = listOf(
        PCSkill.ATHLETICS,
        PCSkill.SOCIETY, 
        PCSkill.SURVIVAL
    )
    
    // Base DC for claiming hexes
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
        
        // TODO: Implement hex claiming logic
        // For now, just show a notification
        ui.notifications.info("Claim Hexes action triggered - implementation pending")
        
        // This would typically:
        // 1. Show skill check dialog with Athletics/Society/Survival options
        // 2. Roll the check with capital bonus if applicable
        // 3. Apply results:
        //    - Critical Success: Claim 2 hexes
        //    - Success: Claim 1 hex
        //    - Failure: No hexes claimed
        //    - Critical Failure: No hexes claimed, possible negative effect
        // 4. Deduct resources based on terrain type
        
        sheet.render()
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Claim Hexes: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to expand your kingdom's borders. Athletics represents physical exploration, " +
               "Society represents diplomatic annexation, and Survival represents pathfinding. " +
               "This action can only be taken once per turn."
    }
}
