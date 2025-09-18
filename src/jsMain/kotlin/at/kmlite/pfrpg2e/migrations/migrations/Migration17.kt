package at.kmlite.pfrpg2e.migrations.migrations

import at.kmlite.pfrpg2e.kingdom.KingdomData
import at.kmlite.pfrpg2e.kingdom.RawModifier
import at.kmlite.pfrpg2e.kingdom.data.RawGroup
import com.foundryvtt.core.Game


class Migration17 : Migration(17) {
    override suspend fun migrateKingdom(game: Game, kingdom: KingdomData) {
        kingdom.modifiers = kingdom.modifiers
            .map { RawModifier.copy(it, requiresTranslation = false) }
            .toTypedArray()
        kingdom.groups = kingdom.groups.map {
            RawGroup.copy(it, preventPledgeOfFealty = false)
        }.toTypedArray()
    }

}
