package at.posselt.pfrpg2e.kingdom.actions

import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent
import kotlin.js.Promise

/**
 * Base interface for kingdom actions that are resolved by player skill checks
 * rather than kingdom skills. This represents the new paradigm where actions
 * are performed by characters, not the kingdom itself.
 */
interface PlayerSkillActionHandler {
    /**
     * Unique identifier for this action
     */
    val actionId: String
    
    /**
     * Display name for this action (for debugging/logging)
     */
    val actionName: String
    
    /**
     * Whether this action requires GM approval
     */
    val requiresGmApproval: Boolean
        get() = false
    
    /**
     * Check if this handler can process the given action
     */
    fun canHandle(actionId: String): Boolean = this.actionId == actionId
    
    /**
     * Handle the action when triggered by a player
     * 
     * @param event The pointer event that triggered the action
     * @param target The HTML element that was clicked
     * @param sheet The kingdom sheet instance
     * @param game The game instance
     * @param actor The kingdom actor
     * @return A promise that resolves when the action is complete
     */
    suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    )
    
    /**
     * Validate that the action can be performed in the current state
     * 
     * @param actor The kingdom actor
     * @return true if the action can be performed, false otherwise
     */
    fun validate(actor: KingdomActor): Boolean = true
    
    /**
     * Get a description of what player skills are used for this action
     * 
     * @return A description of the player skills involved
     */
    fun getPlayerSkillsDescription(): String? = null
}
