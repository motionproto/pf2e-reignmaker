package at.posselt.pfrpg2e.kingdom.actions.handlers

import at.posselt.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.posselt.pfrpg2e.kingdom.sheet.KingdomSheet
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.getKingdom
import at.posselt.pfrpg2e.kingdom.getActivity
import at.posselt.pfrpg2e.kingdom.getExplodedFeatures
import at.posselt.pfrpg2e.kingdom.data.getChosenFeatures
import at.posselt.pfrpg2e.kingdom.data.getChosenFeats
import at.posselt.pfrpg2e.kingdom.data.getChosenGovernment
import at.posselt.pfrpg2e.kingdom.parseSkillRanks
import at.posselt.pfrpg2e.kingdom.getRealmData
import at.posselt.pfrpg2e.kingdom.getOngoingEvents
import at.posselt.pfrpg2e.kingdom.getActiveLeader
import at.posselt.pfrpg2e.kingdom.structures.getImportedStructures
import at.posselt.pfrpg2e.kingdom.dialogs.StructureBrowser
import at.posselt.pfrpg2e.kingdom.dialogs.armyBrowser
import at.posselt.pfrpg2e.kingdom.dialogs.armyTacticsBrowser
import at.posselt.pfrpg2e.kingdom.dialogs.kingdomCheckDialog
import at.posselt.pfrpg2e.kingdom.dialogs.CheckType
import at.posselt.pfrpg2e.data.kingdom.Relations
import at.posselt.pfrpg2e.utils.launch
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import org.w3c.dom.get
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for performing kingdom activities.
 * TODO: Implement full activity handling logic
 */
class PerformActivityHandler : PlayerSkillActionHandler {
    override val actionId = "perform-activity"
    override val actionName = "Perform Activity"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val activityIdStr = target.dataset["activity"]
        if (activityIdStr != null) {
            val kingdom = actor.getKingdom() ?: return
            val activity = kingdom.getActivity(activityIdStr) ?: return
            
            val allFeatures = kingdom.getExplodedFeatures()
            val chosenFeatures = kingdom.getChosenFeatures(allFeatures)
            val chosenFeats = kingdom.getChosenFeats(chosenFeatures)
            val government = kingdom.getChosenGovernment()
            val kingdomRanks = kingdom.parseSkillRanks(
                chosenFeatures = chosenFeatures,
                chosenFeats = chosenFeats,
                government = government,
            )
            
            when (activityIdStr) {
                "build-structure" -> {
                    StructureBrowser(
                        actor = actor,
                        kingdom = kingdom,
                        worldStructures = game.getImportedStructures(),
                        game = game,
                        kingdomRanks = kingdomRanks,
                        chosenFeats = chosenFeats,
                        realmData = game.getRealmData(actor, kingdom),
                    ).launch()
                }
                
                "recruit-army" -> armyBrowser(
                    game = game,
                    kingdomActor = actor,
                    kingdom = kingdom
                )
                
                "train-army" -> armyTacticsBrowser(
                    game = game,
                    kingdomActor = actor,
                    kingdom = kingdom
                )
                
                else -> {
                    val groups = when (activity.id) {
                        "request-foreign-aid",
                        "request-foreign-aid-vk" ->
                            kingdom.groups.filter { 
                                it.relations != Relations.NONE.value 
                            }.toTypedArray()
                        
                        "send-diplomatic-envoy" ->
                            kingdom.groups.filter { 
                                it.relations == Relations.NONE.value 
                            }.toTypedArray()
                        
                        "establish-trade-agreement" ->
                            kingdom.groups.filter { 
                                it.relations == Relations.DIPLOMATIC_RELATIONS.value 
                            }.toTypedArray()
                        
                        "pledge-of-fealty" ->
                            kingdom.groups.filterNot { 
                                it.preventPledgeOfFealty 
                            }.toTypedArray()
                        
                        else -> kingdom.groups
                    }
                    
                    val events = kingdom.getOngoingEvents()
                    
                    kingdomCheckDialog(
                        game = game,
                        kingdom = kingdom,
                        kingdomActor = actor,
                        check = CheckType.PerformActivity(activity),
                        selectedLeader = game.getActiveLeader(),
                        groups = groups,
                        events = events,
                    )
                }
            }
        }
    }
}
