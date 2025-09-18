package kingdom.lite.migrations.migrations

import kingdom.lite.kingdom.KingdomData
import kingdom.lite.kingdom.structures.StructureActor
import kingdom.lite.kingdom.structures.isStructure
import kingdom.lite.kingdom.structures.parseStructure
import kingdom.lite.utils.typeSafeUpdate
import com.foundryvtt.core.Game

class Migration18 : Migration(18, showUpgradingNotices = true) {
    override suspend fun migrateKingdom(game: Game, kingdom: KingdomData) {
        kingdom.settings.settlementsGenerateRd = false
        kingdom.settings.partialStructureConstruction = false
    }

    override suspend fun migrateOther(game: Game) {
        game.actors.contents
            .asSequence()
            .filterIsInstance<StructureActor>()
            .filter { it.isStructure() }
            .forEach {
                val structure = it.parseStructure()
                val rpCost = structure?.construction?.rp ?: 0
                if (rpCost > 0) {
                    it.typeSafeUpdate {
                        system.attributes.hp.max = rpCost
                    }
                    it.typeSafeUpdate {
                        system.attributes.hp.value = rpCost
                    }
                }
            }
    }
}