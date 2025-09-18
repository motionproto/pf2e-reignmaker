package at.kmlite.pfrpg2e.kingdom

import com.foundryvtt.core.Game

/**
 * Legacy chat button integrations were tied to the old RP/Ruin system.
 * The Reignmaker-lite refactor removes those hooks, so binding is a no-op for now.
 */
fun bindChatButtons(@Suppress("UNUSED_PARAMETER") game: Game) {
    // Intentionally left blank – chat buttons will return in a future Reignmaker-lite UI pass.
}
