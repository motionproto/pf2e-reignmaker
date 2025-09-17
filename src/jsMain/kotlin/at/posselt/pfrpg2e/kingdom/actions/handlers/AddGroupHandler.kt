package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.setKingdom
import at.posselt.pfrpg2e.kingdom.getRealmData
import at.posselt.pfrpg2e.kingdom.data.RawGroup
import at.posselt.pfrpg2e.data.kingdom.findKingdomSize
import at.posselt.pfrpg2e.utils.t
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for adding a new diplomatic group.
 */
class AddGroupHandler : PlayerSkillActionHandler {
    override val actionId = "add-group"
    override val actionName = "Add Diplomatic Group"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        val realm = game.getRealmData(actor, kingdom)
        
        kingdom.groups = kingdom.groups + RawGroup(
            name = t("kingdom.groupName"),
            negotiationDC = 10 + findKingdomSize(realm.size).controlDCModifier,
            atWar = false,
            relations = "none",
            preventPledgeOfFealty = false,
        )
        
        actor.setKingdom(kingdom)
    }
}
