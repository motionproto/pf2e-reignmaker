package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.data.checks.RollMode
import at.posselt.pfrpg2e.utils.rollWithCompendiumFallback
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for rolling a kingdom event.
 */
class RollEventHandler : PlayerSkillActionHandler {
    override val actionId = "roll-event"
    override val actionName = "Roll Event"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        val uuid = kingdom.settings.kingdomEventsTable
        val rollMode = kingdom.settings.kingdomEventRollMode
            .let { RollMode.fromString(it) } ?: RollMode.GMROLL
            
        val result = game.rollWithCompendiumFallback(
            rollMode = rollMode,
            uuid = uuid,
            compendiumUuid = "Compendium.pf2e-kingdom-lite.kingdom-lite-rolltables.RollTable.ZXk2yVZH7JMswXbD"
        )
        
        sheet.postAddToOngoingEvents(result, rollMode, kingdom)
    }
}
