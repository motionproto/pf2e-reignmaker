package at.kmlite.pfrpg2e.macros

import at.kmlite.pfrpg2e.settings.pfrpg2eKingdomCampingWeather
import com.foundryvtt.core.Game

suspend fun toggleCombatTracksMacro(game: Game) {
    val settings = game.settings.pfrpg2eKingdomCampingWeather
    settings.setEnableCombatTracks(!settings.getEnableCombatTracks())
}