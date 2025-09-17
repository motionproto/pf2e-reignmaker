package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
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
 */
class AddSettlementHandler : PlayerSkillActionHandler {
    override val actionId = "add-settlement"
    override val actionName = "Add Settlement"
    override val requiresGmApproval = false
    
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
}
