package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.managers.TurnManager
import at.posselt.pfrpg2e.utils.postChatTemplate
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for ending a kingdom turn.
 * This is Phase 6 in the Reignmaker-lite turn sequence.
 * 
 * This action completes the turn and resets various temporary effects.
 * The TurnManager handles the actual turn orchestration.
 */
class EndTurnHandler(
    private val turnManager: TurnManager
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
        
        try {
            // Execute Phase 6: End of Turn
            turnManager.executeEndOfTurn(actor, kingdom)
            
            // Post a chat message about the turn ending
            postChatTemplate(templatePath = "chatmessages/end-turn.hbs")
            
            ui.notifications.info("Kingdom turn ended successfully")
        } catch (e: Throwable) {
            console.error("Failed to end turn", e)
            ui.notifications.error("Failed to end turn: ${e.message}")
        }
        
        sheet.render()
    }
    
    override fun validate(actor: KingdomActor): Boolean {
        // Can only end turn if a kingdom exists
        return actor.getKingdom() != null
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "End Turn: This is the final phase of the kingdom turn. " +
               "It doesn't require a skill check but handles cleanup and preparation for the next turn. " +
               "Temporary effects expire, resources are stored, and the kingdom prepares for the next period."
    }
}
