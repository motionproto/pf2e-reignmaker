package at.posselt.pfrpg2e.kingdom.data

import kotlinx.js.JsPlainObject

/**
 * Represents a single worksite on a kingdom hex for resource production.
 * Each hex can support one worksite based on its terrain type.
 */
@JsPlainObject
external interface RawWorksite {
    var hexId: String       // Reference to the hex on the map
    var terrain: String     // plains, forest, hills, mountains, swamp, desert
    var type: String        // farmstead, logging-camp, quarry, mine, hunting-camp, etc.
    var specialTrait: String? // fertile, rich-vein, etc. (optional bonus)
}

/**
 * Resource yield from a worksite per turn.
 */
@JsPlainObject
external interface RawResourceYield {
    var food: Int
    var lumber: Int
    var stone: Int
    var ore: Int
}

/**
 * Collection of all worksites in the kingdom.
 */
@JsPlainObject
external interface RawWorksites {
    var sites: Array<RawWorksite>
}

/**
 * Terrain types for worksites.
 */
enum class TerrainType(val value: String) {
    PLAINS("plains"),
    FOREST("forest"),
    HILLS("hills"),
    MOUNTAINS("mountains"),
    SWAMP("swamp"),
    DESERT("desert");
    
    companion object {
        fun fromString(value: String): TerrainType? = 
            values().find { it.value == value }
    }
}

/**
 * Worksite types based on terrain.
 */
enum class WorksiteType(
    val value: String,
    val validTerrain: Set<TerrainType>,
    val baseYield: RawResourceYield
) {
    FARMSTEAD(
        "farmstead", 
        setOf(TerrainType.PLAINS, TerrainType.HILLS),
        RawResourceYield(food = 2, lumber = 0, stone = 0, ore = 0)
    ),
    LOGGING_CAMP(
        "logging-camp",
        setOf(TerrainType.FOREST),
        RawResourceYield(food = 0, lumber = 2, stone = 0, ore = 0)
    ),
    QUARRY(
        "quarry",
        setOf(TerrainType.HILLS, TerrainType.MOUNTAINS),
        RawResourceYield(food = 0, lumber = 0, stone = 1, ore = 0)
    ),
    MINE(
        "mine",
        setOf(TerrainType.MOUNTAINS),
        RawResourceYield(food = 0, lumber = 0, stone = 0, ore = 1)
    ),
    HUNTING_CAMP(
        "hunting-camp",
        setOf(TerrainType.SWAMP),
        RawResourceYield(food = 1, lumber = 0, stone = 0, ore = 0)
    ),
    BOG_MINE(
        "bog-mine",
        setOf(TerrainType.SWAMP),
        RawResourceYield(food = 0, lumber = 0, stone = 0, ore = 1)
    ),
    OASIS_FARM(
        "oasis-farm",
        setOf(TerrainType.DESERT),
        RawResourceYield(food = 1, lumber = 0, stone = 0, ore = 0)
    );
    
    companion object {
        fun fromString(value: String): WorksiteType? = 
            values().find { it.value == value }
    }
}

/**
 * Calculate the yield from a worksite including special traits.
 */
fun RawWorksite.calculateYield(): RawResourceYield {
    val worksiteType = WorksiteType.fromString(type) 
        ?: return RawResourceYield(0, 0, 0, 0)
    
    val baseYield = worksiteType.baseYield
    
    // Apply special trait bonuses
    return when (specialTrait) {
        "fertile" -> RawResourceYield(
            food = baseYield.food + 1,
            lumber = baseYield.lumber,
            stone = baseYield.stone,
            ore = baseYield.ore
        )
        "rich-vein" -> RawResourceYield(
            food = baseYield.food,
            lumber = baseYield.lumber,
            stone = baseYield.stone,
            ore = baseYield.ore + 1
        )
        "abundant" -> RawResourceYield(
            food = baseYield.food,
            lumber = baseYield.lumber + 1,
            stone = baseYield.stone + 1,
            ore = baseYield.ore
        )
        else -> baseYield
    }
}

/**
 * Calculate total production from all worksites.
 */
fun RawWorksites.calculateTotalProduction(): RawResourceYield {
    var totalFood = 0
    var totalLumber = 0
    var totalStone = 0
    var totalOre = 0
    
    sites.forEach { site ->
        val yield = site.calculateYield()
        totalFood += yield.food
        totalLumber += yield.lumber
        totalStone += yield.stone
        totalOre += yield.ore
    }
    
    return RawResourceYield(
        food = totalFood,
        lumber = totalLumber,
        stone = totalStone,
        ore = totalOre
    )
}
