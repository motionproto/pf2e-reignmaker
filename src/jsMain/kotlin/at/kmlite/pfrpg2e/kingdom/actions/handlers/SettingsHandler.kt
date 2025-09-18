package at.kmlite.pfrpg2e.kingdom.actions.handlers

import at.kmlite.pfrpg2e.kingdom.actions.PlayerSkillActionHandler
import at.kmlite.pfrpg2e.kingdom.sheet.KingdomSheet
import at.kmlite.pfrpg2e.kingdom.sheet.beforeKingdomUpdate
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.getKingdom
import at.kmlite.pfrpg2e.kingdom.setKingdom
import at.kmlite.pfrpg2e.kingdom.dialogs.KingdomSettingsApplication
import at.kmlite.pfrpg2e.kingdom.armies.updateArmyConsumption
import at.kmlite.pfrpg2e.utils.launch
import com.foundryvtt.core.Game
import com.foundryvtt.core.utils.deepClone
import org.w3c.dom.HTMLElement
import org.w3c.dom.pointerevents.PointerEvent

/**
 * Handler for kingdom settings configuration.
 * Opens the settings dialog.
 */
class SettingsHandler : PlayerSkillActionHandler {
    override val actionId = "settings"
    override val actionName = "Kingdom Settings"
    override val requiresGmApproval = false
    
    override suspend fun handle(
        event: PointerEvent,
        target: HTMLElement,
        sheet: KingdomSheet,
        game: Game,
        actor: KingdomActor
    ) {
        val kingdom = actor.getKingdom() ?: return
        
        KingdomSettingsApplication(
            game = game,
            onSave = { newSettings ->
                val previous = deepClone(kingdom)
                kingdom.settings = newSettings
                kingdom.fame.now = kingdom.fame.now.coerceIn(0, kingdom.settings.maximumFamePoints)
                beforeKingdomUpdate(previous, kingdom)
                actor.setKingdom(kingdom)
                
                val armyFolderIdChanged = 
                    previous.settings.recruitableArmiesFolderId != kingdom.settings.recruitableArmiesFolderId
                if (kingdom.settings.autoCalculateArmyConsumption && 
                    (!previous.settings.autoCalculateArmyConsumption || armyFolderIdChanged)) {
                    updateArmyConsumption(game)
                }
            },
            kingdomSettings = kingdom.settings
        ).launch()
    }
}
