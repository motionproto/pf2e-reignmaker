package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.getActiveLeader
import at.posselt.pfrpg2e.kingdom.dialogs.CheckType
import at.posselt.pfrpg2e.kingdom.dialogs.kingdomCheckDialog
import at.posselt.pfrpg2e.data.kingdom.KingdomSkill
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.get
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for rolling kingdom skill checks.
 */
class RollSkillCheckHandler : PlayerSkillActionHandler {
    override val actionId = "roll-skill-check"
    override val actionName = "Roll Skill Check"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val skillStr = target.dataset["skill"]
        if (skillStr != null) {
            val skill = KingdomSkill.fromString(skillStr) ?: return
            val kingdom = actor.getKingdom() ?: return
            
            kingdomCheckDialog(
                game = game,
                kingdom = kingdom,
                kingdomActor = actor,
                check = CheckType.RollSkill(skill),
                selectedLeader = game.getActiveLeader(),
                groups = emptyArray(),
                events = emptyList()
            )
        }
    }
}
