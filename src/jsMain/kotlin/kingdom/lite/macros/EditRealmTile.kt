package kingdom.lite.macros

import kingdom.lite.app.forms.Select
import kingdom.lite.app.forms.SelectOption
import kingdom.lite.app.forms.formContext
import kingdom.lite.app.prompt
import kingdom.lite.data.ValueEnum
import kingdom.lite.fromCamelCase
import kingdom.lite.kingdom.getKingdomActors
import kingdom.lite.localization.Translatable
import kingdom.lite.toCamelCase
import kingdom.lite.utils.RealmTileData
import kingdom.lite.utils.getRealmTileData
import kingdom.lite.utils.setRealmTileData
import kingdom.lite.utils.t
import kingdom.lite.utils.unsetRealmTileData
import com.foundryvtt.core.Game
import com.foundryvtt.core.ui
import js.objects.recordOf
import kotlinx.js.JsPlainObject

@JsPlainObject
external interface EditRealmTileData {
    val type: String?
    val kingdomActorUuid: String
}

enum class RealmTileCategory {
    CLAIMED,
    COMMODITY,
    WORKSITE;

    companion object {
        fun fromString(value: String) = fromCamelCase<RealmTileCategory>(value)
    }

    val value: String
        get() = toCamelCase()
}

enum class RealmTileType(val category: RealmTileCategory): ValueEnum, Translatable {
    MINE(RealmTileCategory.WORKSITE),
    ORE(RealmTileCategory.COMMODITY),
    LUMBER(RealmTileCategory.COMMODITY),
    LUMBER_CAMP(RealmTileCategory.WORKSITE),
    QUARRY(RealmTileCategory.WORKSITE),
    STONE(RealmTileCategory.COMMODITY),
    LUXURY(RealmTileCategory.COMMODITY),
    LUXURY_WORKSITE(RealmTileCategory.WORKSITE),
    FARMLAND(RealmTileCategory.WORKSITE),
    FOOD(RealmTileCategory.COMMODITY),
    CLAIMED(RealmTileCategory.CLAIMED);

    companion object {
        fun fromString(value: String) = fromCamelCase<RealmTileType>(value)
    }

    override val value: String
        get() = toCamelCase()

    override val i18nKey: String
        get() = "realmTileType.$value"
}

suspend fun editRealmTileMacro(game: Game) {
    val drawings = game.canvas.drawings.controlled.map { it.document }
    val tiles = game.canvas.tiles.controlled.map { it.document }
    if (drawings.isEmpty() && tiles.isEmpty()) {
        ui.notifications.error(t("macros.editRealmTile.selectDrawingOrTile"))
        return
    }
    val data = drawings.firstOrNull()?.getRealmTileData()
        ?: tiles.firstOrNull()?.getRealmTileData()
    val kingdoms = game.getKingdomActors()
        .map { SelectOption(label = it.name, value = it.uuid) }
    prompt<EditRealmTileData, Unit>(
        title = t("macros.editRealmTile.title"),
        templatePath = "components/forms/form.hbs",
        templateContext = recordOf(
            "formRows" to formContext(
                Select.fromEnum<RealmTileType>(
                    name = "type",
                    label = t("macros.editRealmTile.type"),
                    value = data?.type?.let { RealmTileType.fromString(it) },
                    required = false,
                ),
                Select(
                    name = "kingdomActorUuid",
                    label = t("applications.kingdom"),
                    value = data?.kingdomActorUuid,
                    options = kingdoms,
                    required = false,
                ),
            )
        )
    ) {
        val type = it.type
        if (type == null) {
            drawings.forEach { drawing -> drawing.unsetRealmTileData() }
            tiles.forEach { drawing -> drawing.unsetRealmTileData() }
        } else {
            drawings.forEach { drawing ->
                drawing.setRealmTileData(
                    RealmTileData(
                        type = type,
                        kingdomActorUuid = it.kingdomActorUuid,
                    )
                )
            }
            tiles.forEach { tile ->
                tile.setRealmTileData(
                    RealmTileData(
                        type = type,
                        kingdomActorUuid = it.kingdomActorUuid,
                    )
                )
            }
        }
    }
}