package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.data.getChosenHeartland
import at.posselt.pfrpg2e.kingdom.dialogs.newSettlementChoices
import at.posselt.pfrpg2e.kingdom.SettlementTerrain
import at.posselt.pfrpg2e.data.kingdom.settlements.SettlementType
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for creating a capital settlement.
 */
class CreateCapitalHandler : PlayerSkillActionHandler {
    override val actionId = "create-capital"
    override val actionName = "Create Capital"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        val heartland = kingdom.getChosenHeartland()
        val terrain = when (heartland?.id) {
            "forest-or-swamp" -> SettlementTerrain.FOREST
            "hill-or-plain" -> SettlementTerrain.PLAINS
            "lake-or-river" -> SettlementTerrain.SWAMP
            "mountain-or-ruins" -> SettlementTerrain.MOUNTAINS
            else -> null
        }
        
        val result = newSettlementChoices(terrain)
        sheet.importSettlement(
            sceneName = result.name,
            terrain = result.terrain,
            waterBorders = result.waterBorders,
            type = SettlementType.CAPITAL
        )
    }
}
