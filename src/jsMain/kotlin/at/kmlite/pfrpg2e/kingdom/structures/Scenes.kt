package at.kmlite.pfrpg2e.kingdom.structures

import at.kmlite.pfrpg2e.Config
import at.kmlite.pfrpg2e.actor.isKingmakerInstalled
import at.kmlite.pfrpg2e.data.kingdom.settlements.Settlement
import at.kmlite.pfrpg2e.data.kingdom.settlements.SettlementType
import at.kmlite.pfrpg2e.data.kingdom.structures.Structure
import at.kmlite.pfrpg2e.kingdom.SettlementTerrain
import at.kmlite.pfrpg2e.kingdom.modifiers.evaluation.SettlementData
import at.kmlite.pfrpg2e.kingdom.modifiers.evaluation.evaluateSettlement
import at.kmlite.pfrpg2e.kingdom.scenes.toRectangle
import at.kmlite.pfrpg2e.utils.getAppFlag
import at.kmlite.pfrpg2e.utils.typeSafeUpdate
import com.foundryvtt.core.Game
import com.foundryvtt.core.documents.Scene
import com.foundryvtt.core.documents.TileDocument
import com.foundryvtt.core.documents.TokenDocument
import com.foundryvtt.core.utils.deepClone
import com.foundryvtt.core.utils.mergeObject
import js.objects.recordOf
import js.reflect.Reflect
import kotlinx.coroutines.await
import kotlin.math.max
import kotlin.math.min

private fun Scene.structureTokens(): List<TokenDocument> =
    tokens.contents
        .asSequence()
        .filter {
            val actor = it.actor
            actor is StructureActor && actor.isStructure() && !it.hidden
        }
        .toList()

private fun Scene.getStructures(): List<Structure> =
    tokens.contents
        .asSequence()
        .mapNotNull { it.actor }
        .filterIsInstance<StructureActor>()
        .mapNotNull { it.parseStructure() }
        .toList()

private val TileDocument.isBlock: Boolean
    get() = getAppFlag<TileDocument, Any?>("settlementBlockDrawing") != null

private fun Scene.getBlockTiles() =
    tiles.contents
        .asSequence()
        .filter { it.isBlock && !it.hidden }

private fun Scene.calculateOccupiedBlocks(): Int {
    val sceneGridSize = grid.size.toDouble()
    val structures = structureTokens()
        .filterNot {
            val actor = it.actor
            actor is StructureActor && actor.isSlowed()
        }
        .map { it.toRectangle(sceneGridSize, sceneGridSize) }
    val blocks = getBlockTiles().map { it.toRectangle().applyTolerance(50.0) }
    return blocks
        .filter { block -> structures.any { it in block } }
        .count()
}

fun Scene.parseSettlement(
    rawSettlement: RawSettlement,
    autoCalculateSettlementLevel: Boolean,
    allStructuresStack: Boolean,
    allowCapitalInvestmentInCapitalWithoutBank: Boolean,
): Settlement {
    val occupiedBlocks = if (autoCalculateSettlementLevel && rawSettlement.manualSettlementLevel != true) max(
        0,
        calculateOccupiedBlocks()
    ) else rawSettlement.lots
    val settlementLevel = if (autoCalculateSettlementLevel && rawSettlement.manualSettlementLevel != true) min(
        20,
        occupiedBlocks
    ) else rawSettlement.level
    return evaluateSettlement(
        data = SettlementData(
            id = rawSettlement.sceneId,
            name = name,
            occupiedBlocks = occupiedBlocks,
            level = settlementLevel,
            type = SettlementType.fromString(rawSettlement.type)
                ?: SettlementType.SETTLEMENT,
            isSecondaryTerritory = rawSettlement.secondaryTerritory,
            waterBorders = rawSettlement.waterBorders,
        ),
        structures = getStructures(),
        allStructuresStack = allStructuresStack,
        allowCapitalInvestmentInCapitalWithoutBank = allowCapitalInvestmentInCapitalWithoutBank,
    )
}

suspend fun Game.importSettlementScene(
    uuid: String,
    sceneName: String,
    terrain: SettlementTerrain,
    waterBorders: Int,
): Scene? {
    val data = packs.get("${Config.moduleId}.kingdom-lite-settlements")
        ?.getDocuments()
        ?.await()
        ?.asSequence()
        ?.filterIsInstance<Scene>()
        ?.find { it.uuid == uuid }
        ?.let {
            val obj = deepClone(it.toObject())
            Reflect.deleteProperty(obj, "_id")
            val update = recordOf(
                "name" to sceneName,
                "permission" to 0,
                "navigation" to true,
                "ownership" to recordOf("default" to 2),
            )
            if (isKingmakerInstalled) {
                update["background"] = recordOf(
                    "src" to "modules/pf2e-kingmaker/assets/maps-settlements/maps/${terrain.value}-${waterBorders}a.webp",
                )
            } else {
                update["background"] = recordOf(
                    "src" to "modules/pf2e-kingdom-lite/img/settlements/backgrounds/${terrain.value}-${waterBorders}.webp",
                )
            }
            mergeObject(obj, update)
        }
    return data?.let {
        val scene = Scene.create(data).await()
        val thumbnail = scene.createThumbnail().await()
        scene.typeSafeUpdate { thumb = thumbnail.thumb }
        scene
    }
}
