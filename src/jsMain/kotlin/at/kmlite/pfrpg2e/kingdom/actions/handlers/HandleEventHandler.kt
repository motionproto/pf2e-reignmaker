package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.actions.BaseKingdomAction
import at.kmlite.pfrpg2e.kingdom.actions.KingdomActionCategory
import at.kmlite.pfrpg2e.kingdom.actions.PCSkill
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.getKingdom
import at.kmlite.pfrpg2e.kingdom.getOngoingEvents
import at.kmlite.pfrpg2e.kingdom.getActiveLeader
import at.kmlite.pfrpg2e.kingdom.dialogs.CheckType
import at.kmlite.pfrpg2e.kingdom.dialogs.kingdomCheckDialog
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.get
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for resolving kingdom events.
 * Maps to "Resolve a Kingdom Event" action in Reignmaker-lite.
 * 
 * Skills vary by event type - events now use PC skills like Diplomacy, 
 * Intimidation, Crafting, etc. based on the event's nature.
 * Critical failures on crisis events cause +1 Unrest.
 */
class HandleEventHandler : BaseKingdomAction() {
    override val actionId = "handle-event"
    override val actionName = "Resolve a Kingdom Event"
    override val requiresGmApproval = false
    
    // Uphold Stability category
    override val category = KingdomActionCategory.UPHOLD_STABILITY
    
    // Skills vary by event - we list common ones here
    // Actual skills will be determined by the specific event
    override val applicableSkills = listOf(
        PCSkill.DIPLOMACY,
        PCSkill.INTIMIDATION,
        PCSkill.CRAFTING,
        PCSkill.SOCIETY,
        PCSkill.NATURE,
        PCSkill.ARCANA,
        PCSkill.RELIGION,
        PCSkill.PERFORMANCE,
        PCSkill.MEDICINE,
        PCSkill.SURVIVAL,
        PCSkill.DECEPTION,
        PCSkill.ATHLETICS
    )
    
    // DC varies by event, so we don't set a base DC
    override val baseDC: Int? = null
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val indexStr = target.dataset["index"]
        if (indexStr != null) {
            val index = indexStr.toIntOrNull() ?: return
            val kingdom = actor.getKingdom() ?: return
            val kingdomEvent = kingdom.getOngoingEvents().getOrNull(index) ?: return
            
            kingdomCheckDialog(
                game = game,
                kingdom = kingdom,
                kingdomActor = actor,
                check = CheckType.HandleEvent(kingdomEvent),
                selectedLeader = game.getActiveLeader(),
                groups = emptyArray(),
                events = emptyList()
            )
        }
    }
    
    override fun getPlayerSkillsDescription(): String? {
        return "Resolve a Kingdom Event: The skills available depend on the specific event. " +
               "Common skills include Diplomacy, Intimidation, Crafting, Society, and others. " +
               "Critical failures on crisis events increase Unrest by 1."
    }
}
