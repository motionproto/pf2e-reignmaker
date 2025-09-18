package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.actions.PCSkill
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.dialogs.newSettlementChoices
import at.posselt.pfrpg2e.data.kingdom.settlements.SettlementType
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for establishing a new settlement.
 * Maps to "Establish a Settlement" action in Reignmaker-lite.
 * 
 * Uses Crafting, Society, or Survival checks to establish a new settlement.
 * This is part of expanding the kingdom's infrastructure.
 */
class CreateSettlementHandler : BaseKingdomAction() {
    override val actionId = "create-settlement"
    override val actionName = "Establish a Settlement"
    override val requiresGmApproval = false
    
    // Urban Planning category
    override val category = KingdomActionCategory.URBAN_PLANNING
    
    // Can be resolved with Crafting, Society, or Survival
    override val applicableSkills = listOf(
        PCSkill.CRAFTING,
        PCSkill.SOCIETY,
        PCSkill.SURVIVAL
    )
    
    // Base DC for establishing a settlement
    override val baseDC = 15
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val result = newSettlementChoices()
        sheet.importSettlement(
            sceneName = result.name,
            terrain = result.terrain,
            waterBorders = result.waterBorders,
            type = SettlementType.SETTLEMENT
        )
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Establish a Settlement: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to found a new settlement. Crafting represents planning and construction, " +
               "Society represents organizing the populace, and Survival represents choosing an ideal location."
    }
}
