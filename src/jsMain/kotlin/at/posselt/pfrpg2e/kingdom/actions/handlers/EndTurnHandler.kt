package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.kingdom.managers.FameManager
import at.posselt.pfrpg2e.kingdom.resources.calculateStorage
import at.posselt.pfrpg2e.kingdom.getAllSettlements
import at.posselt.pfrpg2e.kingdom.getRealmData
import at.posselt.pfrpg2e.kingdom.RawModifier
import at.posselt.pfrpg2e.kingdom.data.endTurn
import at.posselt.pfrpg2e.utils.postChatTemplate
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for ending a kingdom turn.
 * This action is now resolved through player actions rather than kingdom mechanics.
 */
class EndTurnHandler(
    private val fameManager: FameManager
) : PlayerSkillActionHandler {
    
    override val actionId: String = "end-turn"
    override val actionName: String = "End Kingdom Turn"
    override val requiresGmApproval: Boolean = true
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        // Calculate storage for commodity management
        val realm = game.getRealmData(actor, kingdom)
        val settlements = kingdom.getAllSettlements(game)
        val storage = calculateStorage(realm = realm, settlements = settlements.allSettlements)
        
        // Reset per-turn resources
        kingdom.supernaturalSolutions = 0
        kingdom.creativeSolutions = 0
        
        // Fame doesn't carry over between turns
        fameManager.endTurn(actor)
        
        // Update resource tracking for end of turn
        kingdom.resourcePoints = kingdom.resourcePoints.endTurn()
        kingdom.resourceDice = kingdom.resourceDice.endTurn()
        kingdom.consumption = kingdom.consumption.endTurn()
        kingdom.commodities = kingdom.commodities.endTurn(storage)
        
        // Tick down temporary modifiers
        kingdom.modifiers = kingdom.modifiers.mapNotNull { modifier ->
            val turns = modifier.turns
            when {
                turns == null || turns == 0 -> modifier // Permanent modifier
                turns == 1 -> null // Expires this turn
                else -> RawModifier.copy(modifier, turns = turns - 1)
            }
        }.toTypedArray()
        
        // Save the updated kingdom state
        actor.setKingdom(kingdom)
        
        // Post a chat message about the turn ending
        postChatTemplate(templatePath = "chatmessages/end-turn.hbs")
    }
    
    override fun validate(actor: KingdomActor): Boolean {
        // Can only end turn if a kingdom exists
        return actor.getKingdom() != null
    }
    
    override fun getPlayerSkillsDescription(): String {
        return "End Turn uses the collective efforts of all player characters to manage the kingdom's transition to a new period."
    }
}
