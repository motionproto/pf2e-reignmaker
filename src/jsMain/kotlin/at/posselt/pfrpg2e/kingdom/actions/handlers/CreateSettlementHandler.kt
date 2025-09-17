package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.dialogs.newSettlementChoices
import at.posselt.pfrpg2e.data.kingdom.settlements.SettlementType
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for creating a new settlement.
 */
class CreateSettlementHandler : PlayerSkillActionHandler {
    override val actionId = "create-settlement"
    override val actionName = "Create Settlement"
    override val requiresGmApproval = false
    
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
}
