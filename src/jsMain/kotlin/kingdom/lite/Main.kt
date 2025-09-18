package kingdom.lite

import kingdom.lite.actions.ActionDispatcher
import kingdom.lite.actions.handlers.OpenKingdomSheetHandler
import kingdom.lite.actor.partyMembers
import kingdom.lite.combat.registerCombatTrackHooks
import kingdom.lite.combat.registerCombatXpHooks
import kingdom.lite.firstrun.showFirstRunMessage
// Kingdom imports removed - using fresh system
import kingdom.lite.macros.awardHeroPointsMacro
import kingdom.lite.macros.awardXPMacro
import kingdom.lite.macros.chooseParty
import kingdom.lite.macros.combatTrackMacro
import kingdom.lite.macros.createTeleporterPair
import kingdom.lite.macros.editRealmTileMacro
import kingdom.lite.macros.editStructureMacro
import kingdom.lite.macros.resetHeroPointsMacro
import kingdom.lite.macros.rollExplorationSkillCheckMacro
import kingdom.lite.macros.rollPartyCheckMacro
import kingdom.lite.macros.setTimeOfDayMacro
import kingdom.lite.macros.showAllNpcHpBars
import kingdom.lite.macros.toggleCombatTracksMacro
import kingdom.lite.migrations.migratePfrpg2eKingdomCampingWeather
import kingdom.lite.settings.pfrpg2eKingdomCampingWeather
import kingdom.lite.utils.Pfrpg2eKingdomCampingWeather
import kingdom.lite.utils.ToolsMacros
import kingdom.lite.utils.buildPromise
import kingdom.lite.utils.fixVisibility
import kingdom.lite.utils.initLocalization
import kingdom.lite.utils.loadTemplatePartials
import kingdom.lite.utils.pf2eKingmakerTools
import kingdom.lite.utils.registerIcons
import kingdom.lite.utils.registerMacroDropHooks
import kingdom.lite.utils.registerTokenMappings
import com.foundryvtt.core.game
import com.foundryvtt.core.helpers.TypedHooks
import com.foundryvtt.core.helpers.onI18NInit
import com.foundryvtt.core.helpers.onInit
import com.foundryvtt.core.helpers.onReady
import com.foundryvtt.core.helpers.onRenderChatLog
import com.foundryvtt.core.helpers.onRenderChatMessage
// Kingdom roll imports removed - using fresh system
import com.foundryvtt.core.documents.ChatMessage
import com.foundryvtt.core.Game
import org.w3c.dom.HTMLElement
import kingdom.lite.utils.fromUuidTypeSafe

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
                // registerContextMenus() -- removed with kingdom system
                registerTokenMappings(game)
                registerCombatTrackHooks(game)
                // registerArmyConsumptionHooks(game) -- removed with kingdom system
                registerIcons(actionDispatcher)
                registerCombatXpHooks(game)
            }
        }

        // bindChatButtons(game) -- removed with kingdom system
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
                        // Kingdom sheet opening disabled - fresh system in development
                        console.log("Kingdom sheet disabled - fresh system in development")
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
                // validateStructures(game) -- removed with kingdom system
            }
        }

        TypedHooks.onRenderChatMessage { message, html, _ ->
            fixVisibility(game, html, message)
            
            // Player character roll processing removed - fresh kingdom system in development
        }

        TypedHooks.onRenderChatLog { _, _, _ ->
            // Removed camping chat event listeners
        }
    }
}

// Player character roll processing removed - fresh kingdom system in development
