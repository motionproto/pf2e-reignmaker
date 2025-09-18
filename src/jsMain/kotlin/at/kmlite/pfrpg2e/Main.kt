package at.kmlite.pfrpg2e

import at.kmlite.pfrpg2e.actions.ActionDispatcher
import at.kmlite.pfrpg2e.actions.handlers.OpenKingdomSheetHandler
import at.kmlite.pfrpg2e.actor.partyMembers
import at.kmlite.pfrpg2e.combat.registerCombatTrackHooks
import at.kmlite.pfrpg2e.combat.registerCombatXpHooks
import at.kmlite.pfrpg2e.firstrun.showFirstRunMessage
import at.kmlite.pfrpg2e.kingdom.KingdomActor
import at.kmlite.pfrpg2e.kingdom.armies.registerArmyConsumptionHooks
import at.kmlite.pfrpg2e.kingdom.bindChatButtons
import at.kmlite.pfrpg2e.kingdom.registerContextMenus
import at.kmlite.pfrpg2e.kingdom.sheet.openOrCreateKingdomSheet
import at.kmlite.pfrpg2e.kingdom.structures.validateStructures
import at.kmlite.pfrpg2e.macros.awardHeroPointsMacro
import at.kmlite.pfrpg2e.macros.awardXPMacro
import at.kmlite.pfrpg2e.macros.chooseParty
import at.kmlite.pfrpg2e.macros.combatTrackMacro
import at.kmlite.pfrpg2e.macros.createTeleporterPair
import at.kmlite.pfrpg2e.macros.editRealmTileMacro
import at.kmlite.pfrpg2e.macros.editStructureMacro
import at.kmlite.pfrpg2e.macros.resetHeroPointsMacro
import at.kmlite.pfrpg2e.macros.rollExplorationSkillCheckMacro
import at.kmlite.pfrpg2e.macros.rollPartyCheckMacro
import at.kmlite.pfrpg2e.macros.setTimeOfDayMacro
import at.kmlite.pfrpg2e.macros.showAllNpcHpBars
import at.kmlite.pfrpg2e.macros.toggleCombatTracksMacro
import at.kmlite.pfrpg2e.migrations.migratePfrpg2eKingdomCampingWeather
import at.kmlite.pfrpg2e.settings.pfrpg2eKingdomCampingWeather
import at.kmlite.pfrpg2e.utils.Pfrpg2eKingdomCampingWeather
import at.kmlite.pfrpg2e.utils.ToolsMacros
import at.kmlite.pfrpg2e.utils.buildPromise
import at.kmlite.pfrpg2e.utils.fixVisibility
import at.kmlite.pfrpg2e.utils.initLocalization
import at.kmlite.pfrpg2e.utils.loadTemplatePartials
import at.kmlite.pfrpg2e.utils.pf2eKingmakerTools
import at.kmlite.pfrpg2e.utils.registerIcons
import at.kmlite.pfrpg2e.utils.registerMacroDropHooks
import at.kmlite.pfrpg2e.utils.registerTokenMappings
import com.foundryvtt.core.game
import com.foundryvtt.core.helpers.TypedHooks
import com.foundryvtt.core.helpers.onI18NInit
import com.foundryvtt.core.helpers.onInit
import com.foundryvtt.core.helpers.onReady
import com.foundryvtt.core.helpers.onRenderChatLog
import com.foundryvtt.core.helpers.onRenderChatMessage
import at.kmlite.pfrpg2e.kingdom.rolls.PlayerCharacterRoll
import at.kmlite.pfrpg2e.kingdom.rolls.CharacterRollType
import com.foundryvtt.core.documents.ChatMessage
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import at.kmlite.pfrpg2e.utils.fromUuidTypeSafe

fun main() {
    TypedHooks.onInit {
        val actionDispatcher = ActionDispatcher(
            game = game,
            handlers = listOf(
                OpenKingdomSheetHandler(game = game),
            )
        ).apply {
            listen()
        }

        TypedHooks.onI18NInit {
            buildPromise {
                initLocalization()
                game.settings.pfrpg2eKingdomCampingWeather.register()
                registerContextMenus()
                registerTokenMappings(game)
                registerCombatTrackHooks(game)
                registerArmyConsumptionHooks(game)
                registerIcons(actionDispatcher)
                registerCombatXpHooks(game)
            }
        }

        bindChatButtons(game)
        registerMacroDropHooks(game)

        buildPromise {
            // register partials
            loadTemplatePartials(
                arrayOf(
                    "kingdom-activities" to "applications/kingdom/activities.hbs",
                    "kingdom-events" to "applications/kingdom/events.hbs",
                    "kingdom-trade-agreements" to "applications/kingdom/sections/trade-agreements/page.hbs",
                    "kingdom-settlements" to "applications/kingdom/sections/settlements/page.hbs",
                    "kingdom-turn" to "applications/kingdom/sections/turn/page.hbs",
                    "kingdom-modifiers" to "applications/kingdom/sections/modifiers/page.hbs",
                    "kingdom-notes" to "applications/kingdom/sections/notes/page.hbs",
                    "kingdom-character-sheet" to "applications/kingdom/sections/character-sheet/page.hbs",
                    "kingdom-character-sheet-creation" to "applications/kingdom/sections/character-sheet/creation.hbs",
                    "kingdom-character-sheet-bonus" to "applications/kingdom/sections/character-sheet/bonus.hbs",
                    "kingdom-character-sheet-levels" to "applications/kingdom/sections/character-sheet/levels.hbs",
                    "formElement" to "components/forms/form-element.hbs",
                    "tabs" to "components/tabs/tabs.hbs",
                    "skillPickerInput" to "components/skill-picker/skill-picker-input.hbs",
                    "activityEffectsInput" to "components/activity-effects/activity-effects-input.hbs",
                )
            )
        }

        game.pf2eKingmakerTools = Pfrpg2eKingdomCampingWeather(
            macros = ToolsMacros(
                toggleWeatherMacro = { /* removed */ },
                toggleShelteredMacro = { /* removed */ },
                setCurrentWeatherMacro = { /* removed */ },
                sceneWeatherSettingsMacro = { /* removed */ },
                openSheet = { type, id ->
                    buildPromise {
                        when (type) {
                            "kingdom" -> {
                                game.actors.get(id)
                                    ?.takeIfInstance<KingdomActor>()
                                    ?.let { actor -> openOrCreateKingdomSheet(game, actionDispatcher, actor) }
                            }
                        }
                    }
                },
                rollKingmakerWeatherMacro = { /* removed */ },
                awardXpMacro = { buildPromise { awardXPMacro(game) } },
                resetHeroPointsMacro = {
                    buildPromise {
                        val players = chooseParty(game).partyMembers()
                        resetHeroPointsMacro(players)
                    }
                },
                awardHeroPointsMacro = {
                    buildPromise {
                        val players = chooseParty(game).partyMembers()
                        awardHeroPointsMacro(players)
                    }
                },
                rollExplorationSkillCheck = { skill, effect ->
                    buildPromise {
                        rollExplorationSkillCheckMacro(
                            game,
                            attributeName = skill,
                            explorationEffectName = effect,
                        )
                    }
                },
                rollSkillDialog = {
                    buildPromise {
                        rollPartyCheckMacro(chooseParty(game).partyMembers())
                    }
                },
                setSceneCombatPlaylistDialogMacro = { actor -> buildPromise { combatTrackMacro(game, actor) } },
                toTimeOfDayMacro = { buildPromise { setTimeOfDayMacro(game) } },
                toggleCombatTracksMacro = { buildPromise { toggleCombatTracksMacro(game) } },
                realmTileDialogMacro = { buildPromise { editRealmTileMacro(game) } },
                editStructureMacro = { actor -> buildPromise { editStructureMacro(actor) } },
                subsistMacro = { /* removed */ },
                createFoodMacro = { /* removed */ },
                showAllNpcHpBarsMacro = { buildPromise { game.showAllNpcHpBars() }},
                createTeleporterPairMacro = { buildPromise { game.createTeleporterPair() }},
            ),
        )

        TypedHooks.onReady {
            buildPromise {
                game.migratePfrpg2eKingdomCampingWeather()
                showFirstRunMessage(game)
                validateStructures(game)
            }
        }

        TypedHooks.onRenderChatMessage { message, html, _ ->
            fixVisibility(game, html, message)
            
            // Check if this is a player character roll for kingdom management
            buildPromise {
                processPlayerCharacterRoll(game, message, html)
            }
        }

        TypedHooks.onRenderChatLog { _, _, _ ->
            // Removed camping chat event listeners
        }
    }
}

/**
 * Process player character rolls for kingdom management
 */
suspend fun processPlayerCharacterRoll(
    game: Game,
    message: ChatMessage,
    html: HTMLElement
) {
    // Check if this message contains a player roll
    val messageContent = message.content
    val messageFlags = message.asDynamic()?.flags
    val pf2e = messageFlags?.pf2e
    
    // Check if this is a PF2e roll
    if (pf2e == null) return
    
    // Check for player-roll trait in the roll options
    val context = pf2e.context
    val rollOptions = context?.options as? Array<String> ?: return
    
    // Look for our custom metadata
    val hasPlayerRoll = rollOptions.any { it.startsWith("player-roll") }
    if (!hasPlayerRoll) return
    
    // Extract roll type
    var rollType: CharacterRollType? = null
    var rollId: String? = null
    var skill: String? = null
    
    rollOptions.forEach { option ->
        when {
            option.startsWith("roll-incident") -> rollType = CharacterRollType.INCIDENT
            option.startsWith("roll-activity") -> rollType = CharacterRollType.ACTIVITY
            option.startsWith("roll-event") -> rollType = CharacterRollType.EVENT
            option.startsWith("roll-skill") -> rollType = CharacterRollType.SKILL
            option.startsWith("roll-id:") -> rollId = option.substringAfter("roll-id:")
            option.startsWith("skill:") -> skill = option.substringAfter("skill:")
        }
    }
    
    // If we have all required data, process the roll
    if (rollType != null && rollId != null && skill != null) {
        // Try to find the kingdom actor
        val kingdomActor = game.actors.contents.find { actor ->
            actor.type == "kingdom" 
        }?.takeIfInstance<KingdomActor>() ?: return
        
        // Process the roll result
        val playerRoll = PlayerCharacterRoll(game, kingdomActor)
        playerRoll.processRollResult(message, rollType!!, rollId!!, skill!!)
    }
}
