package at.posselt.pfrpg2e

import at.posselt.pfrpg2e.actions.ActionDispatcher
import at.posselt.pfrpg2e.actions.handlers.OpenKingdomSheetHandler
import at.posselt.pfrpg2e.actor.partyMembers
import at.posselt.pfrpg2e.combat.registerCombatTrackHooks
import at.posselt.pfrpg2e.combat.registerCombatXpHooks
import at.posselt.pfrpg2e.firstrun.showFirstRunMessage
import at.posselt.pfrpg2e.kingdom.KingdomActor
import at.posselt.pfrpg2e.kingdom.armies.registerArmyConsumptionHooks
import at.posselt.pfrpg2e.kingdom.bindChatButtons
import at.posselt.pfrpg2e.kingdom.registerContextMenus
import at.posselt.pfrpg2e.kingdom.sheet.openOrCreateKingdomSheet
import at.posselt.pfrpg2e.kingdom.structures.validateStructures
import at.posselt.pfrpg2e.macros.awardHeroPointsMacro
import at.posselt.pfrpg2e.macros.awardXPMacro
import at.posselt.pfrpg2e.macros.chooseParty
import at.posselt.pfrpg2e.macros.combatTrackMacro
import at.posselt.pfrpg2e.macros.createTeleporterPair
import at.posselt.pfrpg2e.macros.editRealmTileMacro
import at.posselt.pfrpg2e.macros.editStructureMacro
import at.posselt.pfrpg2e.macros.resetHeroPointsMacro
import at.posselt.pfrpg2e.macros.rollExplorationSkillCheckMacro
import at.posselt.pfrpg2e.macros.rollPartyCheckMacro
import at.posselt.pfrpg2e.macros.setTimeOfDayMacro
import at.posselt.pfrpg2e.macros.showAllNpcHpBars
import at.posselt.pfrpg2e.macros.toggleCombatTracksMacro
import at.posselt.pfrpg2e.migrations.migratePfrpg2eKingdomCampingWeather
import at.posselt.pfrpg2e.settings.pfrpg2eKingdomCampingWeather
import at.posselt.pfrpg2e.utils.Pfrpg2eKingdomCampingWeather
import at.posselt.pfrpg2e.utils.ToolsMacros
import at.posselt.pfrpg2e.utils.buildPromise
import at.posselt.pfrpg2e.utils.fixVisibility
import at.posselt.pfrpg2e.utils.initLocalization
import at.posselt.pfrpg2e.utils.loadTemplatePartials
import at.posselt.pfrpg2e.utils.pf2eKingmakerTools
import at.posselt.pfrpg2e.utils.registerIcons
import at.posselt.pfrpg2e.utils.registerMacroDropHooks
import at.posselt.pfrpg2e.utils.registerTokenMappings
import com.foundryvtt.core.game
import com.foundryvtt.core.helpers.TypedHooks
import com.foundryvtt.core.helpers.onI18NInit
import com.foundryvtt.core.helpers.onInit
import com.foundryvtt.core.helpers.onReady
import com.foundryvtt.core.helpers.onRenderChatLog
import com.foundryvtt.core.helpers.onRenderChatMessage

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
        }

        TypedHooks.onRenderChatLog { _, _, _ ->
            // Removed camping chat event listeners
        }
    }
}
