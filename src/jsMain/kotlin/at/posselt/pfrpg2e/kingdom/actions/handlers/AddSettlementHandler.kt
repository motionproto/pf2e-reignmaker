package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.posselt.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.posselt.pfrpg2e.kingdom.actions.PCSkill
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.kingdom.structures.RawSettlement
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for adding current scene as a settlement.
 * Alternative version of "Establish a Settlement" that uses the current scene.
 * 
 * Uses Crafting, Society, or Survival checks to establish a settlement.
 * This is a utility variant that's useful for existing maps.
 */
class AddSettlementHandler : BaseKingdomAction() {
    override val actionId = "add-settlement"
    override val actionName = "Add Settlement (Current Scene)"
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
        game.scenes.current?.id?.let { id ->
            val kingdom = actor.getKingdom() ?: return
            kingdom.settlements = kingdom.settlements + RawSettlement(
                sceneId = id,
                lots = 1,
                level = 1,
                type = "settlement",
                secondaryTerritory = false,
                manualSettlementLevel = false,
                waterBorders = 0
            )
            actor.setKingdom(kingdom)
        }
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Add Settlement: Use ${applicableSkills.joinToString(", ") { it.displayName }} " +
               "to establish a settlement at the current scene. This is a convenience action " +
               "for adding existing map scenes as settlements."
    }
}
