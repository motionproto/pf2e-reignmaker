package kingdom.lite.migrations.migrations

import kingdom.lite.kingdom.KingdomData
import kingdom.lite.kingdom.RawModifier
import kingdom.lite.kingdom.data.RawGroup
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
